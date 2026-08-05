import { useState, useEffect } from 'react'
import type { DueDate } from './storage'
import { 
  getDaysInMonth, getFirstDayOfMonth, getWeekNumber, 
  getMonthName, getToday, getCurrentWeek, getCurrentMonth, getCurrentYear 
} from './dateUtils'

interface Props {
  currentDueDate: DueDate | null
  onSelect: (dueDate: DueDate | null) => void
  onClose: () => void
}

export default function DueDatePicker({ currentDueDate, onSelect, onClose }: Props) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const todayStr = getToday()

  // Закрытие попапа по ESC, без передачи события дальше
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation() // Останавливаем всплытие, чтобы модалка не закрылась
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc, true) // capture: true — перехватываем раньше
    return () => window.removeEventListener('keydown', handleEsc, true)
  }, [onClose])

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const isSelected = (type: string, value: string) => {
    return currentDueDate?.type === type && currentDueDate?.value === value
  }

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  return (
    <div className="popover-overlay" onClick={onClose}>
      <div className="popover-content" onClick={(e) => e.stopPropagation()}>
        {/* Шапка: Год и Месяц */}
        <div className="calendar-header">
          <button className="nav-btn" onClick={handlePrevMonth}>‹</button>
          <span 
            className={`calendar-title year-title ${isSelected('year', viewYear.toString()) ? 'selected' : ''}`}
            onClick={() => onSelect({ type: 'year', value: viewYear.toString() })}
          >
            {viewYear}
          </span>
          <span 
            className={`calendar-title month-title ${isSelected('month', `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`) ? 'selected' : ''}`}
            onClick={() => onSelect({ type: 'month', value: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}` })}
          >
            {getMonthName(viewMonth)}
          </span>
          <button className="nav-btn" onClick={handleNextMonth}>›</button>
        </div>

        {/* Сетка дней */}
        <div className="calendar-grid">
          <div className="weekdays">
            <div className="week-num-header">Нед</div>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
          </div>
          
          {Array.from({ length: Math.ceil((days.length) / 7) }).map((_, rowIndex) => {
            const weekDays = days.slice(rowIndex * 7, rowIndex * 7 + 7)
            const firstValidDay = weekDays.find(d => d !== null)
            const weekDate = firstValidDay ? new Date(viewYear, viewMonth, firstValidDay) : null
            const weekNum = weekDate ? getWeekNumber(weekDate) : 0
            const weekValue = `${viewYear}-W${String(weekNum).padStart(2, '0')}`

            return (
              <div key={rowIndex} className="calendar-row">
                <div 
                  className={`week-number ${isSelected('week', weekValue) ? 'selected' : ''}`}
                  onClick={() => onSelect({ type: 'week', value: weekValue })}
                >
                  {weekNum}
                </div>
                {weekDays.map((day, colIndex) => (
                  <div key={colIndex} className="calendar-cell">
                    {day && (
                      <div 
                        className={`day ${isSelected('day', `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`) ? 'selected' : ''} ${`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayStr ? 'today' : ''}`}
                        onClick={() => onSelect({ type: 'day', value: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` })}
                      >
                        {day}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Кнопки быстрого выбора */}
        <div className="quick-actions">
          <button onClick={() => onSelect({ type: 'day', value: getToday() })}>Сегодня</button>
          <button onClick={() => {
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
            onSelect({ type: 'day', value: tomorrow.toISOString().split('T')[0] })
          }}>Завтра</button>
          <button onClick={() => onSelect({ type: 'week', value: getCurrentWeek() })}>На этой неделе</button>
          {currentDueDate && <button className="clear-btn" onClick={() => onSelect(null)}>Очистить</button>}
        </div>
      </div>
    </div>
  )
}
