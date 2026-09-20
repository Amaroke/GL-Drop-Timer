import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { createMemoryDropStore } from './dropStore'

const NOW = new Date('2026-01-01T12:00:00').getTime()

function card(name: string) {
  return within(screen.getByRole('group', { name }))
}

describe('App', () => {
  it('shows a Drop with no saved Ready date as not started', () => {
    render(<App store={createMemoryDropStore()} now={() => NOW} />)

    const starBattery = card('Star Battery')
    expect(starBattery.getByText('--:--:--')).toBeInTheDocument()
    expect(starBattery.getByRole('button', { name: 'Start timer' })).toBeEnabled()
  })

  it('starts the Cooldown immediately when the player presses Collect', async () => {
    render(<App store={createMemoryDropStore()} now={() => NOW} />)

    await userEvent.click(card('Star Battery').getByRole('button', { name: 'Start timer' }))

    expect(card('Star Battery').getByText('11:00:00')).toBeInTheDocument()
    expect(card('Tool Case').getByText('--:--:--')).toBeInTheDocument()
  })

  it('keeps a running Cooldown after a reload', async () => {
    const store = createMemoryDropStore()
    const { unmount } = render(<App store={store} now={() => NOW} />)
    await userEvent.click(card('Tool Case').getByRole('button', { name: 'Start timer' }))
    unmount()

    const twoHoursLater = NOW + 2 * 3600 * 1000
    render(<App store={store} now={() => twoHoursLater} />)

    expect(card('Tool Case').getByText('21:00:00')).toBeInTheDocument()
  })
})
