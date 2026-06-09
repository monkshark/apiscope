import { useEffect, useRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

export default function AutoTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.6)}px`
  }

  useEffect(resize, [props.value])

  return <textarea ref={ref} onInput={resize} {...props} />
}
