export type Language = 'zh' | 'en'

export const LANGUAGE_STORAGE_KEY = 'dialog-generator.ui-language'

export function isLanguage(value: unknown): value is Language {
  return value === 'zh' || value === 'en'
}

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'zh'
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (isLanguage(stored)) {
    return stored
  }

  const browserLang = window.navigator.language.toLowerCase()
  return browserLang.startsWith('zh') ? 'zh' : 'en'
}
