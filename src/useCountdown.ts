import { useEffect, useState } from 'react'

export function useCountdown(readyAt: number | null) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (readyAt === null) return
    const id = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [readyAt])

  if (readyAt === null) return null
  return Math.max(0, readyAt - Date.now())
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function formatReadyDate(readyAt: number) {
  const date = new Date(readyAt)
  const roundedMinutes = Math.ceil(date.getMinutes() / 15) * 15
  date.setMinutes(roundedMinutes, 0, 0)

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  return `${day}/${month} ~${time}`
}
