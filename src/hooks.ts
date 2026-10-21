import { useEffect, useState } from 'react'

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
export const useCoarsePointer = () => useMedia('(pointer: coarse)')
export const useNarrow = () => useMedia('(max-width: 720px)')
/** Phone-sized screens (portrait or landscape): zone panels dock compactly and the camera reframes around them. */
export const COMPACT_QUERY = '(max-width: 720px), (max-height: 540px) and (orientation: landscape)'
export const useCompact = () => useMedia(COMPACT_QUERY)

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
