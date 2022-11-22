import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  RemoveMembersWithMessagesModalState,
  updateRemoveMembersWithMessagesModal,
} from '../../state/ducks/modalDialog';
import { SpacerLG } from '../basic/Text';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SessionSpinner } from '../basic/SessionSpinner';
import { SessionWrapperModal } from '../SessionWrapperModal';

import { SessionRadioGroup } from '../basic/SessionRadioGroup';
import { useDisplayNamesOfPubkeys } from '../../state/selectors/conversations';
import { isString } from 'lodash';

const MEMBER_ONLY = 'member_only';
const MEMBER_AND_MESSAGES = 'member_and_messages';
type RemoveMods = typeof MEMBER_ONLY | typeof MEMBER_AND_MESSAGES;

export const RemoveMembersWithMessagesDialog = (props: RemoveMembersWithMessagesModalState) => {
  const [isLoading, setIsLoading] = useState(false);
  const [removeMemberMode, setRemoveMemberMode] = useState<RemoveMods>(MEMBER_ONLY);
  const dispatch = useDispatch();
  const displayNames = useDisplayNamesOfPubkeys(props?.membersToRemove, 3);

  const removeMembersOnly = async () => {
    if (!isLoading) {
      setIsLoading(true);
      try {
        console.warn('removeMembersOnly with', props?.membersToRemove);
        debugger; // do the network call
      } catch (e) {
        window.log.warn(e);
      } finally {
        setIsLoading(false);
      }
    }
  };
  const removeMembersWithMessages = async () => {
    if (!isLoading) {
      setIsLoading(true);
      try {
        console.warn('removeMembersWithMessages with', props?.membersToRemove);
        debugger; // do the network call
      } catch (e) {
        window.log.warn(e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Performs specified on close action then removes the modal.
   */
  const onClickCancelHandler = () => {
    dispatch(updateRemoveMembersWithMessagesModal(null));
  };

  return (
    <SessionWrapperModal
      title={window.i18n('removeUserTitle')}
      onClose={onClickCancelHandler}
      showExitIcon={true}
    >
      <span className="session-confirm-main-message">
        {isString(displayNames)
          ? window.i18n('removeMultipleUsersConfirmation')
          : window.i18n('removeUserConfirmation', [displayNames.join(', ')])}
      </span>

      <SpacerLG />
      <SessionRadioGroup
        group="remove_member"
        initialItem={removeMemberMode}
        onClick={value => {
          if (value === MEMBER_ONLY || value === MEMBER_AND_MESSAGES) {
            setRemoveMemberMode(value);
          }
        }}
        items={[
          { label: window.i18n('removeUserOnly'), value: MEMBER_ONLY },
          { label: window.i18n('removeUserWithMessages'), value: MEMBER_AND_MESSAGES },
        ]}
      />

      <div className="session-modal__centered">
        <div className="session-modal__button-group">
          <SessionButton
            text={window.i18n('yes')}
            buttonColor={SessionButtonColor.Danger}
            buttonType={SessionButtonType.Simple}
            onClick={() => {
              if (removeMemberMode === 'member_only') {
                void removeMembersOnly();
              } else if (removeMemberMode === 'member_and_messages') {
                void removeMembersWithMessages();
              }
            }}
            disabled={isLoading}
          />

          <SessionButton
            text={window.i18n('cancel')}
            buttonType={SessionButtonType.Simple}
            onClick={() => {
              dispatch(updateRemoveMembersWithMessagesModal(null));
            }}
            disabled={isLoading}
          />
        </div>
        <SpacerLG />
        <SessionSpinner loading={isLoading} />
      </div>
    </SessionWrapperModal>
  );
};
