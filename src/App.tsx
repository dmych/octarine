import { useState, useEffect } from 'react'
import { taskRepository } from './core/taskRepository'
import type { Task } from './storage'
import TaskDetail from './TaskDetail'
import HorizonColumns from './HorizonColumns'
import './App.css'
import { useOrientation } from './useOrientation'
import HorizonRows from './HorizonRows'

type HorizonType = 'today' | 'week' | 'month' | 'year' | 'none'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [activeHorizon, setActiveHorizon] = useState<HorizonType>('today')
  const [isInitialized, setIsInitialized] = useState(false)

  // Инициализация репозитория при старте
  useEffect(() => {
    const init = async () => {
      try {
        await taskRepository.init()
        
        // Подписка на изменения задач
        const unsubscribe = taskRepository.subscribe((newTasks) => {
          setTasks(newTasks)
        })
        
        setIsInitialized(true)
        
        return unsubscribe
      } catch (error) {
        console.error('[App] Initialization error:', error)
        // Fallback к localStorage если репозиторий не инициализировался
        setTasks(loadTasks())
        setIsInitialized(true)
      }
    }
    
    init()
  }, [])

  // Сохранение задач при изменении
  useEffect(() => {
    if (tasks.length > 0 && isInitialized) {
      // В новой модели данные сохраняются автоматически через taskRepository
      // Этот эффект нужен только для обратной совместимости
    }
  }, [tasks, isInitialized])

  // --- Функции обновления и создания ---
  const updateTask = (id: string, updates: Partial<Task>) => {
    const updateRecursive = (items: Task[]): Task[] => {
      return items.map(t => {
        if (t.id === id) return { ...t, ...updates }
        if (t.children && t.children.length > 0) {
          return { ...t, children: updateRecursive(t.children) }
        }
        return t
      })
    }
    setTasks(updateRecursive(tasks))
    
    // Сохраняем изменения в файл
    const task = findTask(tasks, id)
    if (task) {
      const updatedTask = { ...task, ...updates }
      taskRepository.saveTask(updatedTask)
    }
  }

  const toggleTask = (id: string) => {
    const task = findTask(tasks, id)
    if (!task) return
    
    const newCompleted = !task.completed
    
    // Рекурсивно собираем все ID задачи и её потомков
    const collectIds = (item: Task): string[] => {
      let ids = [item.id]
      if (item.children && item.children.length > 0) {
        item.children.forEach(child => {
          ids = ids.concat(collectIds(child))
        })
      }
      return ids
    }
    
    const allIds = collectIds(task)
    
    // Рекурсивное обновление с правильной обработкой children
    const updateRecursive = (items: Task[]): Task[] => {
      return items.map(t => {
        const isInList = allIds.includes(t.id)
        
        // Всегда рекурсивно обрабатываем children
        const newChildren = t.children && t.children.length > 0 
          ? updateRecursive(t.children) 
          : t.children
        
        if (isInList) {
          return { ...t, completed: newCompleted, children: newChildren }
        }
        
        if (newChildren) {
          return { ...t, children: newChildren }
        }
        
        return t
      })
    }
    
    setTasks(updateRecursive(tasks))
    
    // Сохраняем все измененные задачи
    allIds.forEach(taskId => {
      const t = findTask(tasks, taskId)
      if (t) {
        taskRepository.saveTask({ ...t, completed: newCompleted })
      }
    })
  }

  const addTask = (horizon: HorizonType, title: string, openModal: boolean) => {
    let dueDate = null
    
    if (horizon === 'today') {
      const today = new Date().toISOString().split('T')[0]
      dueDate = { type: 'day' as const, value: today }
    } else if (horizon === 'week') {
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      dueDate = { type: 'week' as const, value: `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}` }
    } else if (horizon === 'month') {
      const now = new Date()
      dueDate = { type: 'month' as const, value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
    } else if (horizon === 'year') {
      dueDate = { type: 'year' as const, value: new Date().getFullYear().toString() }
    }
    
    // Генерируем UUID для новой задачи
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: '<p></p>',
      dueDate,
      completed: false,
      children: [],
    }
    
    setTasks([...tasks, newTask])
    
    // Сохраняем задачу в файл
    taskRepository.saveTask(newTask)
    
    // Открываем модальное окно только если явно передан флаг
    if (openModal) {
      setSelectedTaskId(newTask.id)
    }
  }

  const deleteTask = (id: string) => {
    const taskToDelete = findTask(tasks, id)
    const hasChildren = taskToDelete && taskToDelete.children && taskToDelete.children.length > 0

    if (hasChildren) {
      const confirmed = window.confirm(
        `У этой задачи есть подзадачи. Удалить задачу "${taskToDelete?.title}" и все её подзадачи?`
      )
      if (!confirmed) return
    }

    const deleteRecursive = (items: Task[]): Task[] => {
      return items.filter(t => {
        if (t.id === id) return false
        if (t.children && t.children.length > 0) {
          t.children = deleteRecursive(t.children)
        }
        return true
      })
    }

    setTasks(deleteRecursive(tasks))
    
    // Удаляем файл задачи
    taskRepository.deleteTask(id)
    
    if (selectedTaskId === id) setSelectedTaskId(null)
  }

  // --- Навигация и поиск ---
  const findTask = (items: Task[], id: string): Task | undefined => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children && item.children.length > 0) {
        const found = findTask(item.children, id)
        if (found) return found
      }
    }
    return undefined
  }

  const findTaskPath = (items: Task[], id: string, path: Task[] = []): Task[] | null => {
    for (const item of items) {
      const currentPath = [...path, item]
      if (item.id === id) return currentPath
      if (item.children && item.children.length > 0) {
        const found = findTaskPath(item.children, id, currentPath)
        if (found) return found
      }
    }
    return null
  }

  const selectedTask = selectedTaskId ? findTask(tasks, selectedTaskId) : null
  const selectedTaskPath = selectedTaskId ? findTaskPath(tasks, selectedTaskId) : null

  const isLandscape = useOrientation()

  // Показываем пустой экран до инициализации
  if (!isInitialized) {
    return <div className="app">Loading...</div>
  }

  return (
    <div className="app">
      {isLandscape ? (
        <HorizonColumns
          tasks={tasks}
          activeHorizon={activeHorizon}
          onHorizonChange={setActiveHorizon}
          onTaskSelect={setSelectedTaskId}
          onToggleTask={toggleTask}
          onAddTask={addTask}
        />
      ) : (
        <HorizonRows
          tasks={tasks}
          activeHorizon={activeHorizon}
          onHorizonChange={setActiveHorizon}
          onTaskSelect={setSelectedTaskId}
          onToggleTask={toggleTask}
          onAddTask={addTask}
        />
      )}

      {selectedTask && selectedTaskPath && (
        <TaskDetail
          task={selectedTask}
          path={selectedTaskPath}
          onUpdate={updateTask}
          onSelectSubtask={setSelectedTaskId}
          onDelete={deleteTask}
          onToggleTask={toggleTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}

export default App
