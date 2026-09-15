import helmetImg from './assets/helmet.png'
import starBatteryImg from './assets/star-battery.png'
import toolCaseImg from './assets/tool-case.png'
import { TimerCard } from './TimerCard'

const ITEMS = [
  { storageKey: 'gl-timer-star-battery', name: 'Star Battery', image: starBatteryImg, cooldownHours: 11, accent: '#5ec8ff' },
  { storageKey: 'gl-timer-tool-case', name: 'Tool Case', image: toolCaseImg, cooldownHours: 23, accent: '#ffb85e' },
  { storageKey: 'gl-timer-helmet', name: 'Helmet', image: helmetImg, cooldownHours: 35, accent: '#c084fc' },
]

function App() {
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">GL Drop Timer</h1>
        <p className="mt-2 text-white/50">
          Track the cooldown of your free Galaxy Life items
        </p>
      </header>

      <main className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        {ITEMS.map((item) => (
          <TimerCard key={item.storageKey} {...item} />
        ))}
      </main>

      <footer className="mt-12 text-center text-sm text-white/30">
        Timers are saved in your browser.
      </footer>
    </div>
  )
}

export default App
