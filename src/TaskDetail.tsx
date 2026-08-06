import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'
import type { Task, DueDate } from './storage'
import { formatDueDate } from './dateUtils'
import DueDatePicker from './DueDatePicker'
import { taskRepository } from './core/taskRepository'

interface Props {
  task: Task
  path: Task[]
  onUpdate: (id: string, updates: Partial<Task>) => void
  onSelectSubtask: (id: string) => void
  onDelete: (id: string) => void
  onToggleTask: (id: string) => void
  onClose: () => void
}

export default function TaskDetail({
  task, path, onUpdate, onSelectSubtask, onDelete, onToggleTask, onClose
}: Props) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const isCompleted = task.completed || false

  const editor = useEditor({
    extensions: [StarterKit],
    content: task.description || '',
    onUpdate: ({ editor }) => onUpdate(task.id, { description: editor.getHTML() }),
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== task.description) {
      editor.commands.setContent(task.description  || '')
    }
  }, [task.description, editor])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!editor) return null

  const updateTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(task.id, { title: e.target.value })
  }

    const handleAddSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim() !== '') {
      e.preventDefault()
      e.stopPropagation()

      // Проверяем, нажат ли Cmd (macOS) или Ctrl (Windows/Linux)
      const shouldOpenModal = e.metaKey || e.ctrlKey

      const newSubtask: Task = {
        id: crypto.randomUUID(),
        title: newSubtaskTitle.trim(),
        description: '',
        dueDate: null,
        completed: false,
        children: [],
      }

      onUpdate(task.id, { children: [...(task.children || []), newSubtask] })
      setNewSubtaskTitle('')

      // Сохраняем подзадачу в файл сразу после создания
      taskRepository.saveTask(newSubtask)

      // Если нажат Cmd+Enter — открываем модальное окно с новой подзадачей
      if (shouldOpenModal) {
        onSelectSubtask(newSubtask.id)
      }
    }
  }

  const breadcrumbs = path.slice(0, -1)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {breadcrumbs.length > 0 && (
          <div className="breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.id} className="breadcrumb-item">
                <span className="breadcrumb-link" onClick={() => onSelectSubtask(crumb.id)}>
                  {crumb.title || 'Без названия'}
                </span>
                {index < breadcrumbs.length - 1 && <span className="breadcrumb-separator"> / </span>}
              </span>
            ))}
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">{task.title || 'Без названия'}</span>
          </div>
        )}

        {/* Заголовок с чекбоксом */}
        <div className="detail-header-row">
          <input
            type="checkbox"
            className="detail-checkbox"
            checked={isCompleted}
            onChange={() => onToggleTask(task.id)}
          />
          <input
            type="text" className="detail-title" value={task.title}
            onChange={updateTitle} placeholder="Заголовок задачи"
          />
        </div>

        <div className="detail-horizon clickable" onClick={() => setShowDatePicker(true)}>
          Срок: <strong>{formatDueDate(task.dueDate)}</strong>
          <span className="edit-icon">✎</span>
        </div>

        {showDatePicker && (
          <DueDatePicker
            currentDueDate={task.dueDate}
            onSelect={(newDate: DueDate | null) => {
              onUpdate(task.id, { dueDate: newDate })
              setShowDatePicker(false)
            }}
            onClose={() => setShowDatePicker(false)}
          />
        )}

        <div className="detail-description">
          <EditorContent editor={editor} />
        </div>

        {(task.children || []).length > 0 && (
          <div className="detail-subtasks">
            <h4>Подзадачи:</h4>
            <ul>
              {(task.children || []).map(child => (
                <li key={child.id} className={`subtask-item ${child.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    className="subtask-checkbox"
                    checked={child.completed || false}
                    onChange={() => onToggleTask(child.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="subtask-title" onClick={() => onSelectSubtask(child.id)}>
                    {child.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="add-subtask-container">
          <input
            type="text" className="add-subtask-input" value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleAddSubtaskKeyDown}
            placeholder="Нажмите Enter, чтобы добавить подзадачу..."
          />
        </div>

        <div className="task-actions">
          <button className="delete-button" onClick={() => onDelete(task.id)}>Удалить задачу</button>
        </div>
      </div>
    </div>
  )
}
