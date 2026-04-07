import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useSettingsStore, LanguageType } from './settingsStore'

const translations: Record<LanguageType, Record<string, string>> = {
  ca: {
    // General
    'settings.title': 'Configuracions',
    'settings.category.account': 'Compte',
    'settings.category.visual': 'Aparença',
    'settings.category.chat': 'Xat de Text',
    'settings.category.voice': 'Veu i Vídeo',
    'settings.category.language': 'Idioma',
    'settings.category.accessibility': 'Accessibilitat',
    
    // Account
    'settings.account.identifier': 'Identificador d\'Enllaç',
    'settings.account.username': 'Nom d\'usuari',
    'settings.account.email': 'Correu electrònic',
    
    // Visual
    'settings.visual.theme': 'Tema Visual',
    'settings.visual.dark': 'Protocol Fosc',
    'settings.visual.light': 'Protocol Clar',
    
    // Chat
    'settings.chat.title': 'Configuració de Xat',
    'settings.chat.font_size': 'Mida de la lletra del xat',
    'settings.chat.font_size_desc': 'Ajusta com es veuen els missatges per a una millor llegibilitat.',
    'settings.chat.preview': 'Previsualització del sistema',
    'settings.chat.preview_text': 'Així és com es veuran els teus missatges a Vertex.',
    
    // Voice
    'settings.voice.upcoming': 'Properament',
    'settings.voice.desc': 'Els protocols de veu i vídeo estan en fase de desenvolupament.',
    
    // Language
    'settings.language.select': 'Selecciona l\'idioma de la interfície',
    'settings.language.ca': 'Català',
    'settings.language.es': 'Castellano',
    'settings.language.en': 'English',

    // Chat Component
    'chat.placeholder': 'TRANSMETRE PAQUET DE DADES...',
    'chat.no_logs': 'NO S\'HAN TROBAT REGISTRES EN AQUEST SECTOR',
    'chat.send': 'ENVIAR',

    // Sidebar
    'sidebar.friends': 'Amics',
    'sidebar.workspace': 'Espai de treball',
    'sidebar.servers': 'Servidors',
    'sidebar.settings': 'Configuració',

    // Auth
    'auth.welcome': 'VERTEX',
    'auth.welcomesub': 'CORE',
    'auth.subtitle': 'Subsistema Integrat',
    'auth.username': 'Identificador d\'Usuari',
    'auth.email': 'Punt d\'Enllaç (Email)',
    'auth.password': 'Clau d\'Encriptació',
    'auth.login_btn': 'INICIAR ENLLAÇ',
    'auth.register_btn': 'REGISTRAR PROTOCOL',
    'auth.switch_register': 'Crear Nou Perfil de Node',
    'auth.switch_login': 'Punt existent? Accedir Aquí',
    'auth.status_online': 'Unitat_Central_En_Línia',
    'auth.error_failed': 'Error de connexió détectat',
    'auth.success_register': 'Protocol registrat. Accés concedit.'
  },
  es: {
    // General
    'settings.title': 'Configuraciones',
    'settings.category.account': 'Cuenta',
    'settings.category.visual': 'Apariencia',
    'settings.category.chat': 'Chat de Texto',
    'settings.category.voice': 'Voz y Vídeo',
    'settings.category.language': 'Idioma',
    'settings.category.accessibility': 'Accesibilidad',
    
    // Account
    'settings.account.identifier': 'Identificador de Enlace',
    'settings.account.username': 'Nombre de usuario',
    'settings.account.email': 'Correo electrónico',
    
    // Visual
    'settings.visual.theme': 'Tema Visual',
    'settings.visual.dark': 'Protocolo Oscuro',
    'settings.visual.light': 'Protocolo Claro',
    
    // Chat
    'settings.chat.title': 'Configuración de Chat',
    'settings.chat.font_size': 'Tamaño de la fuente del chat',
    'settings.chat.font_size_desc': 'Ajusta cómo se ven los mensajes para una mejor legibilidad.',
    'settings.chat.preview': 'Previsualización del sistema',
    'settings.chat.preview_text': 'Así es como se verán tus mensajes en Vertex.',
    
    // Voice
    'settings.voice.upcoming': 'Próximamente',
    'settings.voice.desc': 'Los protocolos de voz y vídeo están en fase de desarrollo.',
    
    // Language
    'settings.language.select': 'Selecciona el idioma de la interfaz',
    'settings.language.ca': 'Català',
    'settings.language.es': 'Castellano',
    'settings.language.en': 'English',

    // Chat Component
    'chat.placeholder': 'TRANSMITIR PAQUETE DE DATOS...',
    'chat.no_logs': 'NO SE HAN ENCONTRADO REGISTROS EN ESTE SECTOR',
    'chat.send': 'ENVIAR',

    // Sidebar
    'sidebar.friends': 'Amigos',
    'sidebar.workspace': 'Espacio de trabajo',
    'sidebar.servers': 'Servidores',
    'sidebar.settings': 'Configuración',

    // Auth
    'auth.welcome': 'VERTEX',
    'auth.welcomesub': 'CORE',
    'auth.subtitle': 'Subsistema Integrado',
    'auth.username': 'Identificador de Usuario',
    'auth.email': 'Punto de Enlace (Email)',
    'auth.password': 'Clave de Encriptación',
    'auth.login_btn': 'INICIAR ENLACE',
    'auth.register_btn': 'REGISTRAR PROTOCOLO',
    'auth.switch_register': 'Crear Nuevo Perfil de Nodo',
    'auth.switch_login': '¿Punto existente? Acceder Aquí',
    'auth.status_online': 'Unidad_Central_En_Línea',
    'auth.error_failed': 'Error de conexión detectado',
    'auth.success_register': 'Protocolo registrado. Acceso concedido.'
  },
  en: {
    // General
    'settings.title': 'Settings',
    'settings.category.account': 'Account',
    'settings.category.visual': 'Appearance',
    'settings.category.chat': 'Text Chat',
    'settings.category.voice': 'Voice & Video',
    'settings.category.language': 'Language',
    'settings.category.accessibility': 'Accessibility',
    
    // Account
    'settings.account.identifier': 'Uplink Identifier',
    'settings.account.username': 'Username',
    'settings.account.email': 'Email Address',
    
    // Visual
    'settings.visual.theme': 'Visual Theme',
    'settings.visual.dark': 'Dark Protocol',
    'settings.visual.light': 'Light Protocol',
    
    // Chat
    'settings.chat.title': 'Chat Configuration',
    'settings.chat.font_size': 'Chat Font Size',
    'settings.chat.font_size_desc': 'Adjust how messages appear for better readability.',
    'settings.chat.preview': 'System Preview',
    'settings.chat.preview_text': 'This is how your messages will look in Vertex.',
    
    // Voice
    'settings.voice.upcoming': 'Coming Soon',
    'settings.voice.desc': 'Voice and video protocols are under development.',
    
    // Language
    'settings.language.select': 'Select interface language',
    'settings.language.ca': 'Català',
    'settings.language.es': 'Castellano',
    'settings.language.en': 'English',

    // Chat Component
    'chat.placeholder': 'TRANSMIT DATA PACKET...',
    'chat.no_logs': 'NO LOGS RECORDED IN THIS SECTOR',
    'chat.send': 'SEND',

    // Sidebar
    'sidebar.friends': 'Friends',
    'sidebar.workspace': 'Workspace',
    'sidebar.servers': 'Servers',
    'sidebar.settings': 'Settings',

    // Auth
    'auth.welcome': 'VERTEX',
    'auth.welcomesub': 'CORE',
    'auth.subtitle': 'Integrated Subsystem',
    'auth.username': 'Username Handle',
    'auth.email': 'Email Endpoint',
    'auth.password': 'Encryption Key',
    'auth.login_btn': 'INITIATE UPLINK',
    'auth.register_btn': 'REGISTER PROTOCOL',
    'auth.switch_register': 'Create New Node Profile',
    'auth.switch_login': 'Existing Endpoint? Access Here',
    'auth.status_online': 'Mainframe_Online',
    'auth.error_failed': 'System Interrupt Detected',
    'auth.success_register': 'Uplink Registered. Access Granted.'
  }
}

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
