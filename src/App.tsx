import { TimerCard } from './TimerCard'

const ITEMS = [
  { storageKey: 'gl-timer-star-battery', name: 'Starbatterie', icon: '🔋', cooldownHours: 11, accent: '#5ec8ff' },
  { storageKey: 'gl-timer-tool-case', name: 'Boîte à outils', icon: '🧰', cooldownHours: 23, accent: '#ffb85e' },
  { storageKey: 'gl-timer-helmet', name: 'Casque', icon: '⛑️', cooldownHours: 35, accent: '#c084fc' },
]

function App() {
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">GL Drop Timer</h1>
        <p className="mt-2 text-white/50">
          Suis le temps de recharge de tes objets gratuits Galaxy Life
        </p>
      </header>

      <main className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        {ITEMS.map((item) => (
          <TimerCard key={item.storageKey} {...item} />
        ))}
      </main>

      <footer className="mt-12 text-center text-sm text-white/30">
        Les timers sont sauvegardés dans ton navigateur.
      </footer>
    </div>
  )
}

export default App
