import { useEffect, useRef } from 'react'
import { profile, stations } from '../data/content'
import { SectionFor } from './Sections'

export function PlainView({ noWebGL }: { noWebGL?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="plain">
      <header className="plain-top">
        <strong>{profile.name}</strong>
        <nav aria-label="Sections">
          <ul>{stations.map((s) => <li key={s.id}><a href={`#sec-${s.id}`}>{s.label}</a></li>)}</ul>
        </nav>
        {!noWebGL && <a className="ghost" href="#">Enter the 3D lab →</a>}
      </header>
      <main id="content" ref={ref} tabIndex={-1}>
        <h1>{profile.name}</h1>
        <p className="eyebrow">{profile.headline} · {profile.subheadline}</p>
        {noWebGL && <p className="muted">Your browser doesn’t support WebGL, so you’re seeing the plain version of this site.</p>}
        {stations.map((s) => (
          <section key={s.id} id={`sec-${s.id}`} aria-labelledby={`h-${s.id}`} style={{ ['--accent' as string]: s.color }}>
            <h2 id={`h-${s.id}`}>{s.label}</h2>
            <SectionFor id={s.id} />
          </section>
        ))}
        <footer className="muted small">© {new Date().getFullYear()} {profile.name}</footer>
      </main>
    </div>
  )
}
