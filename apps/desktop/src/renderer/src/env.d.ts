declare module '@twemoji/api' {
  interface ParseOptions {
    base?: string;
    folder?: string;
    ext?: string;
    className?: string;
    size?: string | number;
    attributes?: (icon: string, variant: string) => object;
    callback?: (icon: string, options: Required<ParseOptions>, variant: string) => string | false;
  }

  const twemoji: {
    parse(text: string | HTMLElement, options?: ParseOptions): string;
  };

  export default twemoji;
}

// Tipus per a l'API exposada pel preload d'Electron
declare interface Window {
  api: {
    // Access Token (session.bin)
    saveToken: (token: string) => Promise<boolean>
    loadToken: () => Promise<string | null>
    clearToken: () => Promise<boolean>
    // Refresh Token (refresh.bin)
    saveRefreshToken: (token: string) => Promise<boolean>
    getRefreshToken: () => Promise<string | null>
    clearRefreshToken: () => Promise<boolean>

    // Splash Screen Handlers
    onSplashMessage: (callback: (event: any, data: { message: string, progress?: number, isError?: boolean }) => void) => void
    splashRetry: () => void
    splashQuit: () => void
  }
}
