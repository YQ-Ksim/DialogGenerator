export type DialogType = 'notice' | 'confirmation' | 'multi_action' | 'dialog_list' | 'server_links'

export const DIALOG_TYPES: DialogType[] = ['notice', 'confirmation', 'multi_action', 'dialog_list', 'server_links']

export const TEMPLATE_DATA: Record<DialogType, any> = {
  notice: {
    type: 'minecraft:notice',
    title: { text: 'Travel Notice', color: 'yellow' },
    body: [
      {
        type: 'minecraft:plain_message',
        width: 220,
        contents: {
          text: 'Welcome to the hub. Review your settings before entering.',
          color: 'white',
        },
      },
    ],
    inputs: [],
    action: {
      label: { text: 'Continue' },
      width: 150,
    },
  },
  confirmation: {
    type: 'minecraft:confirmation',
    title: { text: 'Delete Save?', color: 'red' },
    body: [
      {
        type: 'minecraft:plain_message',
        width: 240,
        contents: {
          text: 'This operation cannot be undone.',
          color: 'white',
        },
      },
    ],
    inputs: [],
    yes: {
      label: { text: 'Delete', color: 'red' },
      tooltip: { text: 'Delete this world permanently.' },
      width: 150,
    },
    no: {
      label: { text: 'Cancel' },
      width: 150,
    },
  },
  multi_action: {
    type: 'minecraft:multi_action',
    title: { text: 'Quick Actions' },
    body: [],
    inputs: [],
    columns: 2,
    actions: [
      { label: { text: 'Open Shop' }, tooltip: { text: 'Buy useful tools.' }, width: 150 },
      { label: { text: 'Start Quest' }, tooltip: { text: 'Begin storyline quests.' }, width: 150 },
    ],
    exit_action: {
      label: { text: 'Back' },
    },
  },
  dialog_list: {
    type: 'minecraft:dialog_list',
    title: { text: 'Select Destination', color: 'aqua' },
    body: [],
    inputs: [],
    columns: 2,
    button_width: 150,
    dialogs: ['minecraft:village_center', 'minecraft:forest_camp'],
    exit_action: {
      label: { text: 'Close' },
    },
  },
  server_links: {
    type: 'minecraft:server_links',
    title: { text: 'Community Links', color: 'green' },
    body: [],
    inputs: [],
    columns: 2,
    button_width: 150,
    exit_action: {
      label: { text: 'Back' },
    },
  },
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function stringifyDialog(dialog: unknown): string {
  return JSON.stringify(dialog, null, 2)
}

export function createTemplate(type: DialogType): any {
  return deepClone(TEMPLATE_DATA[type])
}

export function getDialogType(dialog: any): DialogType {
  const type = typeof dialog?.type === 'string' ? dialog.type.replace(/^minecraft:/, '') : ''
  return DIALOG_TYPES.find((entry) => entry === type) ?? 'notice'
}

export function setDialogType(dialog: any, nextType: DialogType): any {
  const source = normalizeDialog(dialog)
  const defaults = createTemplate(nextType)

  return normalizeDialog({
    ...defaults,
    title: source.title,
    body: source.body,
    inputs: source.inputs,
    type: `minecraft:${nextType}`,
  })
}

export function normalizeDialog(raw: any): any {
  const type = getDialogType(raw)
  const defaults = createTemplate(type)
  const dialog = isObject(raw) ? deepClone(raw) : defaults

  dialog.type = `minecraft:${type}`
  if (dialog.title === undefined) {
    dialog.title = defaults.title
  }

  if (dialog.body === undefined) {
    dialog.body = defaults.body ?? []
  } else if (!Array.isArray(dialog.body)) {
    dialog.body = [dialog.body]
  }

  if (dialog.inputs === undefined) {
    dialog.inputs = defaults.inputs ?? []
  } else if (!Array.isArray(dialog.inputs)) {
    dialog.inputs = [dialog.inputs]
  }

  if (type === 'notice') {
    if (dialog.action === undefined) {
      dialog.action = defaults.action
    }
    delete dialog.yes
    delete dialog.no
    delete dialog.actions
    delete dialog.dialogs
    delete dialog.columns
    delete dialog.button_width
  } else if (type === 'confirmation') {
    if (dialog.yes === undefined) {
      dialog.yes = defaults.yes
    }
    if (dialog.no === undefined) {
      dialog.no = defaults.no
    }
    delete dialog.action
    delete dialog.actions
    delete dialog.dialogs
    delete dialog.columns
    delete dialog.button_width
    delete dialog.exit_action
  } else if (type === 'multi_action') {
    if (!Array.isArray(dialog.actions)) {
      dialog.actions = defaults.actions
    }
    dialog.columns = toNumber(dialog.columns, defaults.columns)
    delete dialog.action
    delete dialog.yes
    delete dialog.no
    delete dialog.dialogs
    delete dialog.button_width
  } else if (type === 'dialog_list') {
    if (!Array.isArray(dialog.dialogs)) {
      if (typeof dialog.dialogs === 'string') {
        dialog.dialogs = [dialog.dialogs]
      } else {
        dialog.dialogs = defaults.dialogs
      }
    }
    dialog.columns = toNumber(dialog.columns, defaults.columns)
    dialog.button_width = toNumber(dialog.button_width, defaults.button_width)
    delete dialog.action
    delete dialog.yes
    delete dialog.no
    delete dialog.actions
  } else if (type === 'server_links') {
    dialog.columns = toNumber(dialog.columns, defaults.columns)
    dialog.button_width = toNumber(dialog.button_width, defaults.button_width)
    delete dialog.action
    delete dialog.yes
    delete dialog.no
    delete dialog.actions
    delete dialog.dialogs
  }

  return dialog
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return fallback
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
