import { Component, Suspense, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode; onFail?: () => void }

/** Keeps the page alive when WebGL is unavailable or a scene throws, and shows the fallback instead. */
export default class SafeCanvas extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('[webgl] scene disabled:', error)
    this.props.onFail?.()
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return <Suspense fallback={null}>{this.props.children}</Suspense>
  }
}
