import React, { useState } from 'react';
import { SpacerLG } from '../basic/Text';
import { getConversationController } from '../../session/conversations';
import { markAllAsReadModal } from '../../state/ducks/modalDialog';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { ToastUtils } from '../../session/utils';
import { useDispatch } from 'react-redux';
import { SessionSpinner } from '../basic/SessionSpinner';

export const MarkAllAsReadDialog = () => {
  const titleText = window.i18n('markAllAsRead');
  const okText = window.i18n('markAllAsRead');
  const cancelText = window.i18n('cancel');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const onClickOK = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    const controller = getConversationController();
    const convos = controller.getConversations().filter(conversation => {
      return conversation.isApproved();
    });
    // should probably do a batch call to the DB for those, but it must also mark messages as read, and trigger timers etc, so hard.
    for (const convo of convos) {
      await controller.get(convo.id).markAllAsRead();
    }
    setIsLoading(false);
    closeDialog();
    ToastUtils.pushToastSuccess('allMarkedRead', window.i18n('allMarkedAsRead'));
  };

  const closeDialog = () => {
    dispatch(markAllAsReadModal(null));
  };

  return (
    <SessionWrapperModal title={titleText} onClose={closeDialog}>
      <SpacerLG />
      <SessionSpinner loading={isLoading} />
      <SpacerLG />

      <div className="session-modal__button-group">
        <SessionButton
          text={cancelText}
          buttonType={SessionButtonType.Simple}
          onClick={closeDialog}
        />
        <SessionButton
          text={okText}
          buttonType={SessionButtonType.Simple}
          buttonColor={SessionButtonColor.Primary}
          onClick={onClickOK}
        />
      </div>
    </SessionWrapperModal>
  );
};
