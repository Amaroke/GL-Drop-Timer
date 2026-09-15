import { useEffect, useState } from 'react'
import { formatDuration, useCountdown } from './useCountdown'

type TimerCardProps = {
  storageKey: string
  name: string
  icon: string
  cooldownHours: number
  accent: string
}

export function TimerCard({ storageKey, name, icon, cooldownHours, accent }: TimerCardProps) {
  const [readyAt, setReadyAt] = useState<number | null>(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? Number(stored) : null
  })

  const remaining = useCountdown(readyAt)
  const isReady = readyAt !== null && remaining === 0

  useEffect(() => {
    if (readyAt === null) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, String(readyAt))
  }, [readyAt, storageKey])

  const collect = () => setReadyAt(Date.now() + cooldownHours * 3600 * 1000)

  return (
    <div
      className="relative flex flex-col items-center gap-4 rounded-2xl border p-6 text-center backdrop-blur-sm transition-shadow"
      style={{
        borderColor: isReady ? accent : 'rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        boxShadow: isReady ? `0 0 24px ${accent}55` : undefined,
      }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        style={{ background: `${accent}22`, border: `1px solid ${accent}66` }}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{name}</h2>
        <p className="text-sm text-white/40">Recharge en {cooldownHours} h</p>
      </div>

      <div className="font-mono text-3xl tabular-nums" style={{ color: isReady ? accent : '#e9e6f5' }}>
        {isReady ? 'Prêt !' : remaining === null ? '--:--:--' : formatDuration(remaining)}
      </div>

      <button
        type="button"
        onClick={collect}
        className="w-full rounded-xl px-4 py-2 font-medium transition-colors"
        style={{
          background: isReady ? accent : 'rgba(255,255,255,0.08)',
          color: isReady ? '#0a0716' : '#e9e6f5',
        }}
      >
        {readyAt === null ? 'Démarrer le timer' : "J'ai récupéré l'objet"}
      </button>
    </div>
  )
}
