import type { ComponentChildren } from 'preact'
import { Octicon } from './Octicon'

interface BtnProps {
  icon?: keyof typeof Octicon
  onClick?: () => void
  children?: ComponentChildren
}

export function Btn({ icon, onClick, children }: BtnProps) {
  return (
    <button class="btn small" type="button" onClick={onClick}>
      {icon ? Octicon[icon] : null}
      {children}
    </button>
  )
}
