import type { DueDate, Task } from './storage'

// Получаем текущую дату в формате ISO (YYYY-MM-DD)
export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

// Получаем номер текущей недели в формате ISO (YYYY-Www)
export function getCurrentWeek(): string {
  const now = new Date()
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = date.getUTCDay() || 7 // Воскресенье = 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum) // Находим четверг текущей недели
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// Получаем текущий месяц в формате ISO (YYYY-MM)
export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Получаем текущий год
export function getCurrentYear(): string {
  return new Date().getFullYear().toString()
}

// Проверяем, попадает ли задача в горизонт "Сегодня"
export function isDueToday(task: Task): boolean {
  if (!task.dueDate) return false
  if (task.dueDate.type === 'day') {
    return task.dueDate.value === getToday()
  }
  return false
}

// Проверяем, попадает ли задача в горизонт "Неделя"
export function isDueThisWeek(task: Task): boolean {
  if (!task.dueDate) return false
  const currentWeek = getCurrentWeek()
  
  // Если задача на конкретный день этой недели
  if (task.dueDate.type === 'day') {
    const taskDate = new Date(task.dueDate.value)
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    return taskDate >= startOfWeek && taskDate <= endOfWeek
  }
  
  // Если задача на эту неделю
  if (task.dueDate.type === 'week') {
    return task.dueDate.value === currentWeek
  }
  
  return false
}

// Проверяем, попадает ли задача в горизонт "Месяц"
export function isDueThisMonth(task: Task): boolean {
  if (!task.dueDate) return false
  const currentMonth = getCurrentMonth()
  
  // Если задача на день этого месяца
  if (task.dueDate.type === 'day') {
    return task.dueDate.value.startsWith(currentMonth)
  }
  
  // Если задача на неделю этого месяца
  if (task.dueDate.type === 'week') {
    return task.dueDate.value.startsWith(currentMonth.split('-')[0])
  }
  
  // Если задача на этот месяц
  if (task.dueDate.type === 'month') {
    return task.dueDate.value === currentMonth
  }
  
  return false
}

// Проверяем, попадает ли задача в горизонт "Год"
export function isDueThisYear(task: Task): boolean {
  if (!task.dueDate) return false
  const currentYear = getCurrentYear()
  
  // Если задача на день этого года
  if (task.dueDate.type === 'day') {
    return task.dueDate.value.startsWith(currentYear)
  }
  
  // Если задача на неделю этого года
  if (task.dueDate.type === 'week') {
    return task.dueDate.value.startsWith(currentYear)
  }
  
  // Если задача на месяц этого года
  if (task.dueDate.type === 'month') {
    return task.dueDate.value.startsWith(currentYear)
  }
  
  // Если задача на этот год
  if (task.dueDate.type === 'year') {
    return task.dueDate.value === currentYear
  }
  
  return false
}

// Проверяем, есть ли у задачи срок (любой)
export function hasDueDate(task: Task): boolean {
  return task.dueDate !== null
}

// Форматируем dueDate для отображения
export function formatDueDate(dueDate: DueDate | null): string {
  if (!dueDate) return 'Без срока'
  
  switch (dueDate.type) {
    case 'day':
      return new Date(dueDate.value).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    case 'week':
      return `Неделя ${dueDate.value.split('-W')[1]}, ${dueDate.value.split('-')[0]}`
    case 'month':
      return new Date(dueDate.value + '-01').toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric'
      })
    case 'year':
      return dueDate.value
    default:
      return 'Неизвестно'
  }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  let day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Понедельник = 0, Воскресенье = 6
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getMonthName(monthIndex: number): string {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ]
  return months[monthIndex]
}

export function getWeekDays(year: number, month: number, weekNumber: number): Date[] {
  const jan1 = new Date(year, 0, 1)
  const daysOffset = (weekNumber - 1) * 7 - getFirstDayOfMonth(year, 0) // Упрощенно
  // Более точный расчет начала недели:
  const target = new Date(year, 0, 1 + (weekNumber - 1) * 7)
  const dow = target.getDay()
  const ISOweekStart = target
  if (dow <= 4) ISOweekStart.setDate(target.getDate() - target.getDay() + 1)
  else ISOweekStart.setDate(target.getDate() + 8 - target.getDay())

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(ISOweekStart)
    d.setDate(ISOweekStart.getDate() + i)
    if (d.getMonth() === month) days.push(d)
  }
  return days
}

// Проверяем, просрочена ли задача (срок уже прошел)
export function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false

  const today = getToday()           // '2026-08-02'
  const currentWeek = getCurrentWeek() // '2026-W31'
  const currentMonth = getCurrentMonth() // '2026-08'
  const currentYear = getCurrentYear()   // '2026'

  switch (task.dueDate.type) {
    case 'day':
      return task.dueDate.value < today
    case 'week':
      return task.dueDate.value < currentWeek
    case 'month':
      return task.dueDate.value < currentMonth
    case 'year':
      return task.dueDate.value < currentYear
    default:
      return false
  }
}
