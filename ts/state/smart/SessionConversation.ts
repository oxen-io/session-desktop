import { connect } from 'react-redux';
import { mapDispatchToProps } from '../actions';
import { StateType } from '../reducer';
import { getTheme } from '../selectors/theme';
import { getLightBoxOptions, getSelectedMessageIds } from '../selectors/conversations';
import { getOurNumber } from '../selectors/user';
import { getStagedAttachmentsForCurrentConversation } from '../selectors/stagedAttachments';
import { getHasOngoingCallWithFocusedConvo } from '../selectors/call';
import { SessionConversation } from '../../components/conversation/SessionConversation';
import { isRightOverlayShown } from '../selectors/section';
import { selectedConversationSelectors } from '../selectors/selectedConversation';

const mapStateToProps = (state: StateType) => {
  return {
    selectedConversation: selectedConversationSelectors.getSelectedConversation(state),
    selectedConversationKey: selectedConversationSelectors.getSelectedConversationKey(state),
    theme: getTheme(state),
    ourNumber: getOurNumber(state),
    isRightOverlayShown: isRightOverlayShown(state),
    selectedMessages: getSelectedMessageIds(state),
    lightBoxOptions: getLightBoxOptions(state),
    stagedAttachments: getStagedAttachmentsForCurrentConversation(state),
    hasOngoingCallWithFocusedConvo: getHasOngoingCallWithFocusedConvo(state),
    isSelectedConvoInitialLoadingInProgress: selectedConversationSelectors.getIsSelectedConvoInitialLoadingInProgress(
      state
    ),
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
