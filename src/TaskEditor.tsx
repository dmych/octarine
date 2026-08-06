import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'
import type { Task } from './storage'
import { taskRepository } from './core/taskRepository'

interface Props {
  task: Task
  onUpdate: (id: string, updates: Partial<Task>) => void
  onAddSubtask: (parentId: string, title: string) => void
  depth?: number
}

export default function TaskEditor({ task, onUpdate, onAddSubtask, depth = 0 }: Props) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  if (!task) {
    console.warn('TaskEditor: task is undefined')
    return null
  }

  const editor = useEditor({
    extensions: [StarterKit],
    content: task.description || '',
    onUpdate: ({ editor }) => {
      onUpdate(task.id, { description: editor.getHTML() })
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== task.description) {
      editor.commands.setContent(task.description || '')
    }
  }, [task.description, editor])

  if (!editor) {
    return null
  }

  const updateTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(task.id, { title: e.target.value })
  }

  const handleAddSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim() !== '') {
      e.preventDefault() // Предотвращаем перенос строки в input
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
      }
    }
  }

  return (
    <div className="task" style={{ marginLeft: depth > 0 ? '2rem' : '0' }}>
      <input
        type="text"
        className="task-title"
        value={task.title}
        onChange={updateTitle}
        placeholder="Заголовок задачи"
      />
      <div className="task-description">
        <EditorContent editor={editor} />
      </div>
      
      {/* Рекурсивный рендеринг подзадач */}
      {(task.children || []).length > 0 && (
        <div className="task-children">
          {(task.children || []).map(child => (
            <TaskEditor
              key={child.id}
              task={child}
              onUpdate={onUpdate}
              onAddSubtask={onAddSubtask}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Инлайн-поле для добавления новой подзадачи */}
      <div className="add-subtask-container" style={{ marginLeft: depth > 0 ? '0' : '0' }}>
        <input
          type="text"
          className="add-subtask-input"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleAddSubtaskKeyDown}
          placeholder={depth === 0 ? "Нажмите Enter, чтобы добавить подзадачу..." : "Добавить ещё одну подзадачу..."}
        />
      </div>
    </div>
  )
}
