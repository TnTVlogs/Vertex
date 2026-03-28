import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeType = 'dark' | 'light'

export const useSettingsStore = defineStore('settings', () => {
    // Carreguem el tema des del localStorage (fosc per defecte)
    const savedTheme = localStorage.getItem('vertex-theme') as ThemeType | null
    const theme = ref<ThemeType>(savedTheme || 'dark')

    function toggleTheme() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    function setTheme(newTheme: ThemeType) {
        theme.value = newTheme
    }

    // Efecte col·lateral que manté el document sincronitzat amb Pinia i persisteix la dada
    watch(theme, (newTheme) => {
        localStorage.setItem('vertex-theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }, { immediate: true })

    return {
        theme,
        toggleTheme,
        setTheme
    }
})
