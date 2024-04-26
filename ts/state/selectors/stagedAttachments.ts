import { createSelector } from '@reduxjs/toolkit';
import type { StagedAttachmentType } from '../../models/conversationTypes';
import type { StagedAttachmentsStateType } from '../ducks/stagedAttachments';
import type { StateType } from '../reducer';
import { getSelectedConversationKey } from './selectedConversation';

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

export const getStagedAttachmentsForCurrentConversation = createSelector(
  [getSelectedConversationKey, getStagedAttachmentsState],
  (
    selectedConversationKey: string | undefined,
    state: StagedAttachmentsStateType
  ): Array<StagedAttachmentType> | undefined => {
    return getStagedAttachmentsForConversation(state, selectedConversationKey);
  }
);
