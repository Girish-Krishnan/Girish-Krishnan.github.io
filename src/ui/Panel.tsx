import { Suspense, lazy, useEffect, useRef } from 'react'
import { useSim } from '../store'
import { stations } from '../data/content'
import { SectionFor } from './Sections'
import { MissionsSheet, GarageSheet } from './Sheets'
const RaceSheet = lazy(() => import('./RaceSheet').then((m) => ({ default: m.RaceSheet })))

const SHEETS = {
  missions: { label: 'Missions', crumb: '~/missions', color: '#fbbf24' },
  garage: { label: 'Garage', crumb: '~/garage', color: '#f43f5e' },
  race: { label: 'Time trial', crumb: '~/track', color: '#f43f5e' },
} as const

export function Panel() {
  const id = useSim((s) => s.openStation)
  const sheet = useSim((s) => s.openSheet)
  const key = id ?? sheet
  const focus = useSim((s) => s.focusProject)
  const close = useSim((s) => s.close)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<Element | null>(null)

  useEffect(() => {
    if (!key) return
    returnTo.current = document.activeElement
    if (!focus) closeRef.current?.focus({ preventScroll: true })
    panelRef.current?.querySelector('.panel-body')?.scrollTo({ top: 0 })
    return () => {
      const el = returnTo.current as HTMLElement | null
      if (el && document.contains(el) && el !== document.body) el.focus?.({ preventScroll: true })
    }
  }, [key, focus])

  useEffect(() => {
    if (!key) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
      if (e.key === 'Tab' && panelRef.current) {
        // simple focus trap
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href],button,[tabindex="0"],input')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, close])

  if (!key) return null
  const st = id ? stations.find((s) => s.id === id)! : { id: SHEETS[sheet!].crumb.slice(2), label: SHEETS[sheet!].label, color: SHEETS[sheet!].color }
  return (
    <div
      ref={panelRef}
      className="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-title"
      style={{ ['--accent' as string]: st.color }}
    >
      <header className="panel-head">
        <div>
          <p className="mono crumb">~/{st.id}</p>
          <h2 id="panel-title">{st.label}</h2>
        </div>
        <button ref={closeRef} className="icon-btn" onClick={close} aria-label={`Close ${st.label} panel`}>
          <span aria-hidden="true">✕</span>
        </button>
      </header>
      <div className="panel-body">
        {id ? <SectionFor id={id} focus={focus} /> : sheet === 'missions' ? <MissionsSheet /> : sheet === 'garage' ? <GarageSheet /> : <Suspense fallback={<p className="muted">loading…</p>}><RaceSheet /></Suspense>}
      </div>
    </div>
  )
}
