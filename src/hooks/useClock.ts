import { useEffect, useState } from 'react'

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

export function useClock() {
  const [now, setNow] = useState(() => fmt.format(new Date()))
  useEffect(() => {
    const id = window.setInterval(() => setNow(fmt.format(new Date())), 5000)
    return () => window.clearInterval(id)
  }, [])
  return now
}
