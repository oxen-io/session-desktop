import { connect } from 'react-redux';
import { mapDispatchToProps } from '../actions';
import { StateType } from '../reducer';
import { getTheme } from '../selectors/theme';
import {
  getIsSelectedConvoInitialLoadingInProgress,
  getLightBoxOptions,
  getSelectedConversation,
  getSelectedConversationKey,
  getSelectedMessageIds,
  getSortedMessagesOfSelectedConversation,
} from '../selectors/conversations';
import { getOurNumber } from '../selectors/user';
import { getStagedAttachmentsForCurrentConversation } from '../selectors/stagedAttachments';
import { getHasOngoingCallWithFocusedConvo } from '../selectors/call';
import { SessionConversation } from '../../components/conversation/SessionConversation';
import { isRightOverlayShown } from '../selectors/section';

const mapStateToProps = (state: StateType) => {
  return {
    selectedConversation: getSelectedConversation(state),
    selectedConversationKey: getSelectedConversationKey(state),
    theme: getTheme(state),
    messagesProps: getSortedMessagesOfSelectedConversation(state),
    ourNumber: getOurNumber(state),
    isRightOverlayShown: isRightOverlayShown(state),
    selectedMessages: getSelectedMessageIds(state),
    lightBoxOptions: getLightBoxOptions(state),
    stagedAttachments: getStagedAttachmentsForCurrentConversation(state),
    hasOngoingCallWithFocusedConvo: getHasOngoingCallWithFocusedConvo(state),
    isSelectedConvoInitialLoadingInProgress: getIsSelectedConvoInitialLoadingInProgress(state),
  };
};

const smart = connect(
  mapStateToProps,
  mapDispatchToProps,
  (stateProps, dispatchProps, ownProps) => {
    return {
      ...stateProps,
      router: ownProps,
      actions: dispatchProps,
    };
  }
);
export const SmartSessionConversation = smart(SessionConversation);
