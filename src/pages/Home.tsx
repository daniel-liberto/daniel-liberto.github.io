import { useRef } from 'react'
import { useSectionWatch } from '@/hooks/useSectionWatch'
import { useLang } from '@/lib/lang-context'
import Hero from '@/sections/Hero'
import Manifesto from '@/sections/Manifesto'
import Process from '@/sections/Process'
import Work from '@/sections/Work'
import Services from '@/sections/Services'
import Toolbox from '@/sections/Toolbox'
import Changelog from '@/sections/Changelog'
import Finale from '@/sections/Finale'
import PostCredits from '@/sections/PostCredits'

export default function Home() {
  const root = useRef<HTMLDivElement>(null)
  const { lang } = useLang()
  useSectionWatch(root, [lang])
  return (
    <div ref={root}>
      <Hero />
      <Manifesto />
      <Process />
      <Work />
      <Services />
      <Toolbox />
      <Changelog />
      <Finale />
      <PostCredits />
    </div>
  )
}
