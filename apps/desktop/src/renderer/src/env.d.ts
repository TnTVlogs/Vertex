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
