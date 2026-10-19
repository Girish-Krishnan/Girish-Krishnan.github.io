import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSim, visitStation } from '../store'
import { useGame, isVehicleUnlocked } from '../game/store'
import { missions } from '../game/missions'
import { vehicles, paints } from '../game/vehicles'
import { runExtra, extraCommands, extraHelp } from './terminalExtras'
import {
  stations, projects, experience, courses, socials, profile, cvUrl, publications, type StationId,
} from '../data/content'

type Line = { kind: 'in' | 'out' | 'err'; text: ReactNode }

const COMMANDS = ['help', 'ls', 'cd', 'open', 'whoami', 'cv', 'contact', 'clear', 'pwd', 'plain', 'exit', 'missions', 'vehicle', 'garage', 'paint', 'hint', 'goto']
const DIRS = stations.map((s) => s.id)

const stationAlias: Record<string, StationId> = {
  about: 'about', me: 'about', experience: 'experience', work: 'experience', exp: 'experience',
  projects: 'projects', project: 'projects', research: 'research', papers: 'research', publications: 'research',
  teaching: 'teaching', teach: 'teaching', ta: 'teaching', contact: 'contact', cv: 'contact',
}

function findProject(q: string) {
  const s = q.toLowerCase().replace(/^projects\//, '').trim()
  return (
    projects.find((p) => p.slug === s) ||
    projects.find((p) => p.slug.startsWith(s)) ||
    projects.find((p) => p.title.toLowerCase().includes(s))
  )
}

const welcome: Line[] = [
  { kind: 'out', text: <>simlab shell v1.0 · type <b>help</b> to get started</> },
]

export function Terminal() {
  const openT = useSim((s) => s.terminalOpen)
  const setTerminal = useSim((s) => s.setTerminal)
  const [lines, setLines] = useState<Line[]>(welcome)
  const [value, setValue] = useState('')
  const [cwd, setCwd] = useState('~')
  const hist = useRef<string[]>([])
  const hIdx = useRef(-1)
  const input = useRef<HTMLInputElement>(null)
  const out = useRef<HTMLDivElement>(null)

  useEffect(() => { if (openT) setTimeout(() => input.current?.focus(), 30) }, [openT])
  useEffect(() => { out.current?.scrollTo({ top: out.current.scrollHeight }) }, [lines])

  const print = (...l: Line[]) => setLines((prev) => [...prev, ...l].slice(-200))
  const o = (text: ReactNode): Line => ({ kind: 'out', text })
  const err = (text: ReactNode): Line => ({ kind: 'err', text })

  function go(id: StationId, project?: string) {
    setCwd(`~/${id}`)
    visitStation(id, project)
  }

  function run(raw: string) {
    const cmdline = raw.trim()
    print({ kind: 'in', text: <><span className="ps1">girish@simlab:{cwd}$</span> {cmdline}</> })
    if (!cmdline) return
    hist.current.unshift(cmdline); hIdx.current = -1
    const [cmd, ...args] = cmdline.split(/\s+/)
    const arg = args.join(' ')
    switch (cmd.toLowerCase()) {
      case 'help':
        return print(o(<pre>{`commands:
  ls [dir]            list stations, or the contents of one (ls projects)
  cd <station>        drive to a station and open it   (cd experience)
  cd ..  /  cd ~      return to the center pad
  open <name>         open a station or a project      (open vi-slam)
  whoami              who is this?
  cv                  open my CV (PDF)
  contact             how to reach me
  missions            mission log (also: hint)
  vehicle [name]      list or switch vehicles   (vehicle car)
  paint [name]        list or apply paint jobs
  garage              open the garage
  goto <place>        tank · track · planning · cartpole · launch · weld · home
  plain               switch to the plain, no-3D view
  clear               clear the screen
  exit                close the terminal
keys: Tab completes · ↑/↓ history · Esc closes`}{extraHelp()}</pre>))
      case 'ls': {
        const target = (arg || (cwd === '~' ? '' : cwd.replace('~/', ''))).replace(/\/$/, '')
        if (!target) return print(o(<span className="ls">{DIRS.map((d) => <span key={d} className="dir">{d}/</span>)}<span>cv.pdf</span></span>))
        const st = stationAlias[target]
        if (st === 'projects') return print(o(<pre>{(['Robotics', 'Machine Learning', 'Software', 'Physics'] as const).map((c) => `# ${c}\n` + projects.filter((p) => p.category === c).map((p) => `  ${p.slug.padEnd(26)} ${p.title}`).join('\n')).join('\n') + '\n\nopen <name> to view one'}</pre>))
        if (st === 'experience') return print(o(<pre>{experience.map((e) => `${(e.start + '–' + e.end).padEnd(20)} ${e.role} @ ${e.org}`).join('\n')}</pre>))
        if (st === 'teaching') return print(o(<pre>{courses.map((c) => `${c.code.padEnd(11)} ${c.title}`).join('\n')}</pre>))
        if (st === 'research') return print(o(<pre>{publications.map((p) => `[${p.venue}] ${p.title}`).join('\n')}</pre>))
        if (st === 'contact') return print(o(<pre>{socials.map((s) => `${s.label.padEnd(15)} ${s.value}`).join('\n')}</pre>))
        if (st === 'about') return print(o('bio.md  education.md  awards.md  skills.md'))
        return print(err(`ls: cannot access '${target}': No such file or directory`))
      }
      case 'cd': {
        if (!arg || arg === '~' || arg === '..' || arg === '/') {
          setCwd('~'); useSim.getState().close(); useSim.getState().teleportTo('home')
          return print(o('returning to center pad…'))
        }
        const st = stationAlias[arg.replace(/^~\//, '').replace(/\/$/, '').toLowerCase()]
        if (!st) return print(err(`cd: no such station: ${arg}`))
        go(st); return print(o(`driving to ${st}…`))
      }
      case 'open': {
        if (!arg) return print(err('usage: open <station|project>'))
        const st = stationAlias[arg.toLowerCase().replace(/\/$/, '')]
        if (st) { go(st); return print(o(`opening ${st}…`)) }
        const p = findProject(arg)
        if (p) { go('projects', p.slug); return print(o(<>opening <b>{p.title}</b> · <a href={p.github} target="_blank" rel="noreferrer">github ↗</a></>)) }
        return print(err(`open: '${arg}' not found. try: ls projects`))
      }
      case 'whoami':
        return print(o(<pre>{`${profile.name}\n${profile.headline}\n${profile.subheadline}`}</pre>))
      case 'pwd': return print(o(`/home/girish/${cwd.replace('~', '').replace(/^\//, '')}`))
      case 'cv': {
        const w = window.open(cvUrl, '_blank', 'noopener')
        return print(o(<>{w ? 'opened' : 'popup blocked:'} <a href={cvUrl} target="_blank" rel="noreferrer">cv.pdf ↗</a></>))
      }
      case 'cat':
        if (/cv/.test(arg)) return run('cv')
        return print(err(`cat: ${arg || '?'}: try 'open' instead`))
      case 'contact':
        return print(o(<div className="ls-col">{socials.map((s) => <span key={s.label}><span className="dim">{s.label.padEnd(15)}</span>{s.href ? <a href={s.href} target="_blank" rel="noreferrer">{s.value}</a> : s.value}</span>)}</div>))
      case 'missions': {
        const d = useGame.getState().done
        const n = missions.filter((m) => d[m.id]).length
        return print(o(<pre>{`missions ${n}/${missions.length}\n` + missions.map((m) => {
          const ok = !!d[m.id]
          if (m.hidden && !ok) return `  [?] ${'???'.padEnd(20)} ${m.lockedHint ?? 'keep exploring…'}`
          return `  [${ok ? 'x' : ' '}] ${m.title.padEnd(20)} ${m.desc}`
        }).join('\n') + `\n\ntype 'hint' for a nudge · open the ★ Missions panel for details`}</pre>))
      }
      case 'hint': {
        const d = useGame.getState().done
        const open = missions.filter((m) => !d[m.id] && !m.hidden)
        if (!open.length) { const s = missions.find((m) => !d[m.id] && m.hidden); return print(o(s ? <>hint · <b>???</b>: {s.lockedHint}</> : 'every mission done. nice.')) }
        const m = open[Math.floor(Math.random() * open.length)]
        return print(o(<>hint · <b>{m.title}</b>: {m.hint}</>))
      }
      case 'goto': case 'tp': {
        const places = ['home', 'tank', 'track', 'planning', 'cartpole', 'launch', 'weld']
        const a = arg.toLowerCase()
        if (!places.includes(a)) return print(err(`goto: try one of: ${places.join(', ')}`))
        useSim.getState().close()
        if (a === 'home') { setCwd('~'); useSim.getState().teleportTo('home') } else useSim.getState().teleportTo(`zone:${a}`)
        return print(o(`warping to ${a}…`))
      }
      case 'garage': useSim.getState().openSheetFn('garage'); return print(o('opening garage…'))
      case 'vehicle': case 'vehicles': case 'drive': {
        const g = useGame.getState()
        if (!arg) return print(o(<pre>{vehicles.map((v) => `${v.id === g.vehicle ? '*' : ' '} ${v.id.padEnd(6)} ${v.name.padEnd(15)} ${isVehicleUnlocked(v.id) ? v.tagline : '[locked: ' + missions.find((m) => m.id === v.unlock)?.title + ']'}`).join('\n') + '\n\nvehicle <name> to switch'}</pre>))
        const want = vehicles.find((v) => v.id === arg.toLowerCase() || v.name.toLowerCase().includes(arg.toLowerCase()) || (arg.toLowerCase() === 'f1tenth' && v.id === 'car') || (arg.toLowerCase() === 'drone' && v.id === 'quad'))
        if (!want) return print(err(`vehicle: unknown '${arg}'. try: ${vehicles.map((v) => v.id).join(', ')}`))
        if (!g.setVehicle(want.id)) return print(err(`${want.name} is locked. complete “${missions.find((m) => m.id === want.unlock)?.title}” first.`))
        return print(o(`switched to ${want.name}. ${want.controls}`))
      }
      case 'paint': {
        const g = useGame.getState()
        if (!arg) return print(o(<pre>{paints.map((p) => `${p.id === g.paint ? '*' : ' '} ${p.id.padEnd(7)} ${p.name.padEnd(20)} ${!p.unlock || g.done[p.unlock] ? '' : '[locked]'}`).join('\n')}</pre>))
        const want = paints.find((p) => p.id === arg.toLowerCase())
        if (!want) return print(err(`paint: unknown '${arg}'`))
        return print(g.setPaint(want.id) ? o(`applied ${want.name}`) : err(`${want.name} is locked`))
      }
      case 'clear': return setLines([])
      case 'plain': location.hash = 'plain'; return
      case 'exit': setTerminal(false); return
      case 'sudo': return print(err('nice try. this incident will be reported to the PID controller.'))
      case 'rm': return print(err('rm: permission denied (read-only filesystem, like a good portfolio)'))
      default: {
        const extra = runExtra(cmd.toLowerCase(), args)
        if (extra) return print(...extra)
      }
        if (stationAlias[cmd.toLowerCase()]) { go(stationAlias[cmd.toLowerCase()]); return print(o(`opening ${stationAlias[cmd.toLowerCase()]}…`)) }
        return print(err(`${cmd}: command not found. type 'help'`))
    }
  }

  function complete() {
    const parts = value.split(/\s+/)
    if (parts.length === 1) {
      const m = [...COMMANDS, ...extraCommands()].filter((c) => c.startsWith(parts[0]))
      if (m.length === 1) setValue(m[0] + ' ')
      else if (m.length > 1) print(o(m.join('  ')))
      return
    }
    const last = parts[parts.length - 1]
    const pool = parts[0] === 'open' ? [...DIRS, ...projects.map((p) => p.slug)] : parts[0] === 'vehicle' ? vehicles.map((v) => v.id) : parts[0] === 'paint' ? paints.map((p) => p.id) : parts[0] === 'goto' ? ['home', 'tank', 'track', 'planning', 'cartpole', 'launch', 'weld'] : parts[0] === 'seam' ? ['straight', 'L', 'curve'] : DIRS
    const m = pool.filter((c) => c.startsWith(last))
    if (m.length === 1) { parts[parts.length - 1] = m[0]; setValue(parts.join(' ')) }
    else if (m.length > 1) print(o(m.join('  ')))
  }

  if (!openT) return null
  return (
    <section className="terminal" role="dialog" aria-label="Terminal" onClick={() => input.current?.focus()}>
      <header className="term-bar">
        <span className="lights" aria-hidden="true"><i /><i /><i /></span>
        <span className="mono">girish@simlab: {cwd}</span>
        <button className="icon-btn sm" onClick={() => setTerminal(false)} aria-label="Close terminal">✕</button>
      </header>
      <div className="term-out mono" ref={out} aria-live="polite">
        {lines.map((l, i) => <div key={i} className={'tl ' + l.kind}>{l.text}</div>)}
      </div>
      <form className="term-in mono" onSubmit={(e) => { e.preventDefault(); run(value); setValue('') }}>
        <label htmlFor="term-input" className="ps1">girish@simlab:{cwd}$</label>
        <input
          id="term-input"
          ref={input}
          value={value}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Terminal command"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') { e.preventDefault(); complete() }
            else if (e.key === 'ArrowUp') { e.preventDefault(); hIdx.current = Math.min(hIdx.current + 1, hist.current.length - 1); setValue(hist.current[hIdx.current] ?? '') }
            else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx.current = Math.max(hIdx.current - 1, -1); setValue(hist.current[hIdx.current] ?? '') }
            else if (e.key === 'Escape') { e.stopPropagation(); setTerminal(false) }
            else if (e.key === '`') { e.preventDefault(); setTerminal(false) }
          }}
        />
      </form>
    </section>
  )
}
