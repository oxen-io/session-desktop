import { CallStatusEnum } from '../ducks/call';
import { ReduxConversationType } from '../ducks/conversations';
import { StateType } from '../reducer';

// --- INCOMING CALLS
export const getHasIncomingCallFrom = (state: StateType) => {
  return state.call.ongoingWith && state.call.ongoingCallStatus === 'incoming'
    ? state.call.ongoingWith
    : undefined;
};

export const getHasIncomingCall = (state: StateType) => !!getHasIncomingCallFrom(state);

// --- ONGOING CALLS
export const getHasOngoingCallWith = (state: StateType): ReduxConversationType | undefined => {
  if (
    state.call.ongoingWith &&
    (state.call.ongoingCallStatus === 'connecting' ||
      state.call.ongoingCallStatus === 'offering' ||
      state.call.ongoingCallStatus === 'ongoing')
  ) {
    return state.conversations.conversationLookup[state.call.ongoingWith] || undefined;
  }
  return undefined;
};

export const getHasOngoingCall = (state: StateType): boolean => {
  return !!getHasOngoingCallWith(state);
};

export const getHasOngoingCallWithPubkey = (state: StateType): string | undefined =>
  getHasOngoingCallWith(state)?.id;

export const getHasOngoingCallWithFocusedConvo = (state: StateType) => {
  const withPubkey = getHasOngoingCallWithPubkey(state);
  const selectedPubkey = state.conversations.selectedConversation;
  return withPubkey && withPubkey === selectedPubkey;
};

const getCallStateWithFocusedConvo = (state: StateType): CallStatusEnum => {
  const selected = state.conversations.selectedConversation;
  const ongoingWith = state.call.ongoingWith;
  if (selected && ongoingWith && selected === ongoingWith) {
    return state.call.ongoingCallStatus;
  }
  return undefined;
};

export const getCallWithFocusedConvoIsOffering = (state: StateType): boolean => {
  return getCallStateWithFocusedConvo(state) === 'offering';
};

export const getCallWithFocusedConvosIsConnecting = (state: StateType): boolean => {
  return getCallStateWithFocusedConvo(state) === 'connecting';
};

export const getCallWithFocusedConvosIsConnected = (state: StateType): boolean => {
  const callState = getCallStateWithFocusedConvo(state);
  return callState === 'ongoing';
};

export const getCallIsInFullScreen = (state: StateType): boolean => state.call.callIsInFullScreen;
