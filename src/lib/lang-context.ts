import { createContext, useContext } from 'react'
import type { Dict, Lang } from '@/content/types'

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void }

export const LangContext = createContext<Ctx | null>(null)

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>')
  return ctx
}
