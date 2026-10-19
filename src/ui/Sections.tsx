import { useEffect, useMemo, useRef, useState } from 'react'
import {
  profile, experience, leadership, education, awards, skills, projects, publications,
  researchLabs, courses, teachingSummary, socials, cvUrl, type StationId, type ProjectCategory,
} from '../data/content'

import { useSim } from '../store'
const base = import.meta.env.BASE_URL

export function AboutSection() {
  return (
    <div className="sec">
      <div className="about-hero">
        <img src={`${base}${profile.photo}`} alt={`Portrait of ${profile.name}`} width={160} height={240} loading="lazy" />
        <div>
          <p className="eyebrow">{profile.headline}</p>
          <p className="muted">{profile.subheadline}</p>
          <ul className="chips" aria-label="Interests">
            {profile.interests.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      </div>
      <p className="lead">{profile.summary}</p>
      <h3>Education</h3>
      <ul className="list">
        {education.map((e) => (
          <li key={e.degree}><strong>{e.degree}</strong><span className="muted"> · {e.school} · {e.when}</span></li>
        ))}
      </ul>
      <h3>Awards</h3>
      <ul className="list bullets">{awards.map((a) => <li key={a}>{a}</li>)}</ul>
      <h3>Skills</h3>
      {Object.entries(skills).map(([k, v]) => (
        <div key={k} className="skillrow">
          <span className="muted">{k}</span>
          <ul className="chips">{v.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      ))}
    </div>
  )
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function ExperienceSection() {
  const focus = useSim((s) => s.focusProject)
  useEffect(() => {
    if (!focus) return
    const el = document.getElementById(`exp-${focus}`)
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }) }
  }, [focus])
  return (
    <div className="sec">
      <ol className="timeline">
        {experience.map((e) => (
          <li key={e.org + e.start} id={`exp-${slugify(e.org)}`} tabIndex={-1} className={focus === slugify(e.org) ? 'focus' : undefined}>
            <div className="tl-head">
              <strong>{e.org}</strong>
              <span className="muted mono">{e.start} – {e.end}</span>
            </div>
            <div className="tl-role">{e.role}</div>
            {e.bullets.length > 0 && <ul className="bullets">{e.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
            {e.tags && <ul className="chips small">{e.tags.map((t) => <li key={t}>{t}</li>)}</ul>}
          </li>
        ))}
      </ol>
      <h3>Leadership</h3>
      <ul className="list">
        {leadership.map((l) => (
          <li key={l.org}><strong>{l.role}</strong>, {l.org} <span className="muted mono">{l.when}</span><br /><span className="muted">{l.detail}</span></li>
        ))}
      </ul>
    </div>
  )
}

const cats: (ProjectCategory | 'All')[] = ['All', 'Robotics', 'Machine Learning', 'Software', 'Physics']

export function ProjectsSection({ focus }: { focus?: string | null }) {
  const [cat, setCat] = useState<(typeof cats)[number]>('All')
  const list = useMemo(() => projects.filter((p) => cat === 'All' || p.category === cat), [cat])
  const refs = useRef<Record<string, HTMLElement | null>>({})
  useEffect(() => {
    if (!focus) return
    setCat('All')
    const t = setTimeout(() => {
      const el = refs.current[focus]
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.focus({ preventScroll: true })
    }, 80)
    return () => clearTimeout(t)
  }, [focus])
  return (
    <div className="sec">
      <div className="filters" role="group" aria-label="Filter projects by category">
        {cats.map((c) => (
          <button key={c} className={c === cat ? 'on' : ''} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <ul className="cards">
        {list.map((p) => (
          <li key={p.slug}>
            <article
              className={'card' + (focus === p.slug ? ' focus' : '')}
              ref={(el) => { refs.current[p.slug] = el }}
              tabIndex={-1}
              aria-labelledby={`p-${p.slug}`}
            >
              {p.thumb ? (
                <img src={`${base}thumbs/${p.thumb}.webp`} alt="" loading="lazy" />
              ) : (
                <div className="thumb-ph" aria-hidden="true">{p.category}</div>
              )}
              <div className="card-body">
                <span className="tag">{p.category}</span>
                <h4 id={`p-${p.slug}`}>{p.title}</h4>
                <p>{p.description}</p>
                <a href={p.github} target="_blank" rel="noreferrer">View on GitHub <span aria-hidden="true">↗</span></a>
                <code className="slug" aria-label={`terminal command: open ${p.slug}`}>open {p.slug}</code>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <p className="muted">More on <a href="https://github.com/Girish-Krishnan" target="_blank" rel="noreferrer">github.com/Girish-Krishnan</a> (50+ public repos).</p>
    </div>
  )
}

export function ResearchSection() {
  return (
    <div className="sec">
      <h3>Publications</h3>
      {publications.map((p) => (
        <article key={p.title} className="pub">
          <span className="tag">{p.venue}</span>
          <h4>{p.title}</h4>
          <p className="muted">
            {p.authors.map((a, i) => (
              <span key={a}>{a === profile.name ? <strong className="me">{a}</strong> : a}{i < p.authors.length - 1 ? ', ' : ''}</span>
            ))}
          </p>
          <p>{Object.entries(p.links).map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="pill">{k} ↗</a>)}</p>
        </article>
      ))}
      <h3>Labs</h3>
      <ul className="list">
        {researchLabs.map((l) => <li key={l.lab}><strong>{l.lab}</strong><br /><span className="muted">{l.focus}</span></li>)}
      </ul>
      <p className="muted">Google Scholar: <a href="https://scholar.google.com/citations?user=CtpuYxcAAAAJ" target="_blank" rel="noreferrer">profile ↗</a></p>
    </div>
  )
}

export function TeachingSection() {
  return (
    <div className="sec">
      <p className="lead">{teachingSummary}</p>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Courses taught</caption>
          <thead><tr><th scope="col">Course</th><th scope="col">Role</th><th scope="col">Quarters</th></tr></thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.code}>
                <th scope="row"><span className="mono">{c.code}</span><br /><span className="muted small">{c.title}</span></th>
                <td>{c.role}</td>
                <td className="muted">{c.quarters}<br /><span className="small">{c.instructor}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ContactSection() {
  return (
    <div className="sec">
      <p className="lead">Want to talk robotics, controls, ML, or hard engineering problems? Reach out.</p>
      <ul className="socials">
        {socials.map((s) => (
          <li key={s.label}>
            <span className="muted">{s.label}</span>
            {s.href ? <a href={s.href} target={s.href.startsWith('mailto') ? undefined : '_blank'} rel="noreferrer">{s.value}</a> : <span>{s.value}</span>}
          </li>
        ))}
      </ul>
      <a className="cta" href={cvUrl} target="_blank" rel="noreferrer">Download CV (PDF) ↗</a>
    </div>
  )
}

export function SectionFor({ id, focus }: { id: StationId; focus?: string | null }) {
  switch (id) {
    case 'about': return <AboutSection />
    case 'experience': return <ExperienceSection />
    case 'projects': return <ProjectsSection focus={focus} />
    case 'research': return <ResearchSection />
    case 'teaching': return <TeachingSection />
    case 'contact': return <ContactSection />
  }
}
