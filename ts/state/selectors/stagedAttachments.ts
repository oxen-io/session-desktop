import { StagedAttachmentType } from '../../components/conversation/composition/CompositionBox';
import { StagedAttachmentsStateType } from '../ducks/stagedAttachments';
import { StateType } from '../reducer';

export const getStagedAttachmentsState = (state: StateType): StagedAttachmentsStateType =>
  state.stagedAttachments;

const getStagedAttachmentsForConversation = (
  state: StagedAttachmentsStateType,
  conversationKey: string | undefined
) => {
  if (!conversationKey) {
    return undefined;
  }
  return state.stagedAttachments[conversationKey] || [];
};

export const getStagedAttachmentsForCurrentConversation = (
  state: StateType
): Array<StagedAttachmentType> | undefined => {
  const stagedAttachments = getStagedAttachmentsState(state);
  const selectedConvo = state.conversations.selectedConversation;
  return getStagedAttachmentsForConversation(stagedAttachments, selectedConvo);
};
