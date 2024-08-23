import { createContext, useContext } from 'react';

/**
 * This React context is used to share deep into a node tree the message ID we are currently rendering.
 * This is to avoid passing the prop to all the subtree component
 */
const ContextMessageId = createContext<string | undefined>(undefined);

export const ContextMessageProvider = ContextMessageId.Provider;

export function useMessageIdFromContext() {
  const messageId = useContext(ContextMessageId);
  return messageId;
}
