import { useLocation } from 'react-router'
import { useTransition } from '@/components/transition-context'

export const navItems = [
  { id: 'work', key: 'work' },
  { id: 'services', key: 'services' },
  { id: 'journey', key: 'about' },
  { id: 'contact', key: 'contact' },
] as const

/** Jump to a home section behind a curtain, or travel home first when we are on another page. */
export function useNavTo() {
  const { pathname } = useLocation()
  const { go, jump } = useTransition()
  return (id: string, label = '') => {
    if (pathname === '/') jump(`#${id}`, label)
    else go('/', { hash: id })
  }
}
