import { useState } from 'react'
import type { Task } from './storage'
import TaskListItem from './TaskListItem'
import { getToday, getCurrentWeek, getCurrentMonth, getCurrentYear } from './dateUtils'

type HorizonType = 'today' | 'week' | 'month' | 'year' | 'none'

interface Props {
  tasks: Task[]
  activeHorizon: HorizonType
  onHorizonChange: (horizon: HorizonType) => void
  onTaskSelect: (id: string) => void
  onToggleTask: (id: string) => void
  onAddTask: (horizon: HorizonType, title: string, openModal: boolean) => void
}

const horizons: { id: HorizonType; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
  { id: 'none', label: 'Без срока' },
]

export default function HorizonRows({ 
  tasks, 
  activeHorizon, 
  onHorizonChange, 
  onTaskSelect, 
  onToggleTask,
  onAddTask 
}: Props) {
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const getAllMatchingTasks = (items: Task[], horizon: HorizonType): Task[] => {
    let result: Task[] = []
    for (const item of items) {
      let matches = false
      
      if (horizon === 'today') {
        matches = item.dueDate?.type === 'day' && item.dueDate.value === getToday()
      } else if (horizon === 'week') {
        matches = item.dueDate?.type === 'week' && item.dueDate.value === getCurrentWeek()
      } else if (horizon === 'month') {
        matches = item.dueDate?.type === 'month' && item.dueDate.value === getCurrentMonth()
      } else if (horizon === 'year') {
        matches = item.dueDate?.type === 'year' && item.dueDate.value === getCurrentYear()
      } else if (horizon === 'none') {
        matches = !item.dueDate
      }

      if (matches) {
        result.push({ ...item, children: [] })
      }

      if (item.children && item.children.length > 0) {
        result = result.concat(getAllMatchingTasks(item.children, horizon))
      }
    }
    return result
  }

  const getAllOverdueTasks = (items: Task[]): Task[] => {
    let result: Task[] = []
    const today = getToday()
    const currentWeek = getCurrentWeek()
    const currentMonth = getCurrentMonth()
    const currentYear = getCurrentYear()

    for (const item of items) {
      if (item.dueDate) {
        let isOverdue = false
        if (item.dueDate.type === 'day' && item.dueDate.value < today) isOverdue = true
        else if (item.dueDate.type === 'week' && item.dueDate.value < currentWeek) isOverdue = true
        else if (item.dueDate.type === 'month' && item.dueDate.value < currentMonth) isOverdue = true
        else if (item.dueDate.type === 'year' && item.dueDate.value < currentYear) isOverdue = true

        if (isOverdue) {
          result.push({ ...item, children: [] })
        }
      }

      if (item.children && item.children.length > 0) {
        result = result.concat(getAllOverdueTasks(item.children))
      }
    }
    return result
  }

  const handleNewTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim() !== '') {
      e.preventDefault()
      const shouldOpenModal = e.metaKey || e.ctrlKey
      
      onAddTask(activeHorizon, newTaskTitle.trim(), shouldOpenModal)
      setNewTaskTitle('')
    }
  }

  return (
    <div className="horizon-rows">
      {horizons.map(horizon => {
        const isActive = horizon.id === activeHorizon
        const currentHorizonTasks = getAllMatchingTasks(tasks, horizon.id)
        const currentOverdue = horizon.id === 'today' ? getAllOverdueTasks(tasks) : []

        return (
          <div key={horizon.id} className={`horizon-row ${isActive ? 'active' : ''}`}>
            <div 
              className="row-header"
              onClick={() => !isActive && onHorizonChange(horizon.id)}
            >
              <span className="row-title">{horizon.label}</span>
              <span className="row-count">{currentHorizonTasks.length + currentOverdue.length}</span>
            </div>
            
            {isActive && (
              <div className="row-content">
                {currentOverdue.length > 0 && (
                  <>
                    {currentOverdue.map(task => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        onSelect={onTaskSelect}
                        onToggle={onToggleTask}
                        isOverdue={true}
                      />
                    ))}
                    <div className="overdue-divider"></div>
                  </>
                )}
                
                {currentHorizonTasks.length === 0 && currentOverdue.length === 0 ? (
                  <div className="empty-row">Нет задач</div>
                ) : (
                  currentHorizonTasks.map(task => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onSelect={onTaskSelect}
                      onToggle={onToggleTask}
                    />
                  ))
                )}

                <div className="new-task-input-wrapper">
                  <input
                    type="text"
                    className="row-new-task-input"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleNewTaskKeyDown}
                    placeholder="Enter: создать, Cmd+Enter: создать и открыть..."
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
