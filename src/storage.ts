export interface Task {
  id: string
  title: string
  description: string
  dueDate: DueDate | null
  completed: boolean // <-- Новое поле
  children: Task[]
}

export type DueDate = {
  type: 'day' | 'week' | 'month' | 'year'
  value: string
}

const STORAGE_KEY = 'octarine-tasks'

export function loadTasks(): Task[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const today = new Date().toISOString().split('T')[0]
    return [
      {
        id: '1',
        title: 'Задача на сегодня',
        description: '<p>Описание задачи на сегодня</p>',
        dueDate: { type: 'day', value: today },
        completed: false,
        children: [],
      },
      {
        id: '2',
        title: 'Задача на неделю',
        description: '<p>Описание задачи на эту неделю</p>',
        dueDate: { type: 'week', value: '2026-W31' },
        completed: false,
        children: [
          {
            id: '2-1',
            title: 'Подзадача без срока',
            description: '<p>Описание подзадачи</p>',
            dueDate: null,
            completed: false,
            children: [],
          },
        ],
      },
      {
        id: '3',
        title: 'Задача без горизонта',
        description: '<p>Эта задача не имеет срока выполнения</p>',
        dueDate: null,
        completed: false,
        children: [],
      },
    ]
  }
  return JSON.parse(raw)
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}
