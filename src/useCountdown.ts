import { useEffect, useState } from 'react'

export function useCountdown(readyAt: number | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (readyAt === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [readyAt])

  if (readyAt === null) return null
  return Math.max(0, readyAt - now)
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
