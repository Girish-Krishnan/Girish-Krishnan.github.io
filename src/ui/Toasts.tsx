import { useToasts } from '../game/toasts'

export function Toasts() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + (t.tone ?? 'info')} onClick={() => dismiss(t.id)}>
          {t.tone === 'mission' && <span className="toast-badge" aria-hidden="true">★</span>}
          <div>
            <strong>{t.title}</strong>
            {t.body && <p>{t.body}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
