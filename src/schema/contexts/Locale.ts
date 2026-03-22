import { useMemo } from 'preact/hooks'

const MESSAGES: Record<string, string> = {
  root: 'root',
  unset: 'Unset',
  remove: 'Remove',
  expand: 'Expand',
  collapse: 'Collapse',
  reset: 'Reset',
  add_top: 'Add top',
  add_bottom: 'Add bottom',
  add_key: 'Add key',
  duplicate: 'Duplicate',
  move_up: 'Move up',
  move_down: 'Move down',
  entries_hidden: '%s hidden',
  'entries_hidden.more': 'Show %s more',
  'entries_hidden.all': 'Show all',
  follow_reference: 'Open reference',
  generate_new_color: 'Generate color',
  generate_new_seed: 'Generate seed',
  missing_key: 'Missing key: %s',
}

function format(message: string, args: string[]) {
  let idx = 0
  return message.replace(/%s/g, () => args[idx++] ?? '')
}

export function useLocale() {
  return useMemo(() => {
    const locale = (key: string, ...args: string[]) => {
      const msg = MESSAGES[key] ?? key
      return format(msg, args)
    }
    return { locale }
  }, [])
}
