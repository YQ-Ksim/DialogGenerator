const icon = (text: string) => <span aria-hidden="true" style="display:inline-flex;min-width:14px;justify-content:center">{text}</span>

export const Octicon: Record<string, any> = {
  link_external: icon('↗'),
  sync: icon('↻'),
  trashcan: icon('×'),
  plus_circle: icon('+'),
  history: icon('⟲'),
  chevron_right: icon('›'),
  chevron_down: icon('˅'),
  chevron_up: icon('˄'),
  issue_opened: icon('!'),
  duplicate: icon('⧉'),
}
