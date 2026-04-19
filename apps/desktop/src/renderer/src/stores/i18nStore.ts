import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useSettingsStore, LanguageType } from './settingsStore'
import ca from '../locales/ca.json'
import es from '../locales/es.json'
import en from '../locales/en.json'

const translations: Record<LanguageType, Record<string, string>> = { ca, es, en }

export const useI18nStore = defineStore('i18n', () => {
  const settings = useSettingsStore()

  const t = computed(() => {
    return (key: string) => {
      return translations[settings.language][key] || key
    }
  })

  return {
    t
  }
})
