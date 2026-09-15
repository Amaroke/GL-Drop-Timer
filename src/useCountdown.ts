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
