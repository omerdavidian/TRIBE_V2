import { useEffect, type RefObject } from 'react'

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const el = ref.current
      if (!el) return
      if (event.target instanceof Node && !el.contains(event.target)) {
        onOutside()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [ref, onOutside, enabled])
}
