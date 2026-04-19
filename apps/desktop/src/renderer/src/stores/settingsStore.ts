import { defineStore } from 'pinia'
import { ref, watch, nextTick } from 'vue'

export type ThemeType = 'dark' | 'light'
export type LanguageType = 'ca' | 'es' | 'en'

export const useSettingsStore = defineStore('settings', () => {
    const savedTheme = localStorage.getItem('vertex-theme') as ThemeType | null
    const theme = ref<ThemeType>(savedTheme || 'dark')

    const savedLang = localStorage.getItem('vertex-lang') as LanguageType | null
    const language = ref<LanguageType>(savedLang || 'ca')

    const savedFontSize = localStorage.getItem('vertex-fontsize')
    const chatFontSize = ref<number>(savedFontSize ? parseInt(savedFontSize) : 14)

    function toggleTheme() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    function setTheme(newTheme: ThemeType) {
        theme.value = newTheme
    }

    function setLanguage(newLang: LanguageType) {
        language.value = newLang
    }

    function setFontSize(newSize: number) {
        chatFontSize.value = newSize
    }

    // Efecte col·lateral que manté el document sincronitzat amb Pinia i persisteix la dada
    watch(theme, (newTheme) => {
        localStorage.setItem('vertex-theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }, { immediate: true })

    watch(language, (newLang) => {
        localStorage.setItem('vertex-lang', newLang)
        document.documentElement.setAttribute('lang', newLang)
    }, { immediate: true })

    watch(chatFontSize, (newSize) => {
        localStorage.setItem('vertex-fontsize', newSize.toString())
    }, { immediate: true })

    return {
        theme,
        language,
        chatFontSize,
        toggleTheme,
        setTheme,
        setLanguage,
        setFontSize
    }
})
