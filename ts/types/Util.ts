export type RenderTextCallbackType = (options: {
  text: string;
  key: number;
  isGroup?: boolean;
  convoId?: string;
}) => JSX.Element | string;

export type LocalizerType = (key: string, values?: Array<string>) => string;