import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Dict, Lang } from '@/content/types'
import { LangContext } from './lang-context'
import { en } from '@/content/en'
import { pt } from '@/content/pt'

const dicts: Record<Lang, Dict> = { en, pt }

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('dl2-lang')
    if (saved === 'en' || saved === 'pt') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('dl2-lang', l)
    } catch {
      /* storage unavailable */
    }
    document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en'
    document.title = dicts[l].meta.title
  }, [])

  const value = useMemo(() => ({ lang, t: dicts[lang], setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}
