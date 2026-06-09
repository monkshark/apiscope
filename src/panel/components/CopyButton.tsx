import { useState } from 'react'
import { copyText } from '../util'

export default function CopyButton({
  text,
  className,
  label = '복사',
}: {
  text: string
  className?: string
  label?: string
}) {
  const [done, setDone] = useState(false)
  const onClick = async () => {
    const ok = await copyText(text)
    if (ok) {
      setDone(true)
      window.setTimeout(() => setDone(false), 1200)
    }
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {done ? '복사완료' : label}
    </button>
  )
}
