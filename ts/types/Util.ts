export type RenderTextCallbackType = (options: {
  text: string;
  key: number;
  isGroup: boolean;
}) => JSX.Element;

export type LocalizerType = typeof window.i18n;
