import type { Task } from './storage'

interface Props {
  task: Task
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  isOverdue?: boolean
}

export default function TaskListItem({ task, onSelect, onToggle, isOverdue = false }: Props) {
  // Гарантируем, что completed всегда boolean
  const isCompleted = task.completed || false

  return (
    <div className={`task-list-item ${isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="task-title-clickable" onClick={() => onSelect(task.id)}>
        <input
          type="checkbox"
          className="task-checkbox"
          checked={isCompleted}
          onChange={() => onToggle(task.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="task-title-text">{task.title || 'Без названия'}</span>
      </div>
    </div>
  )
}
