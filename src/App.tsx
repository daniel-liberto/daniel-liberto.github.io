import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { LangProvider } from '@/lib/i18n'
import { TransitionProvider } from '@/components/Transition'
import SmoothScroll from '@/components/SmoothScroll'
import Cursor from '@/components/Cursor'
import Header from '@/components/Header'
import Menu from '@/components/Menu'
import Preloader from '@/components/Preloader'
import EscapeHatch from '@/components/EscapeHatch'
import Home from '@/pages/Home'

const Case = lazy(() => import('@/pages/Case'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export default function App() {
  return (
    <LangProvider>
      <SmoothScroll />
      <TransitionProvider>
        <Header />
        <Menu />
        <main id="main">
          <Suspense fallback={<div className="h-svh bg-ink" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/work/:id" element={<Case />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <EscapeHatch />
      </TransitionProvider>
      <Preloader />
      <Cursor />
      <div className="grain" aria-hidden />
    </LangProvider>
  )
}
