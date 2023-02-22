import React, { useState } from 'react';
import { SpacerLG } from '../basic/Text';
import { getConversationController } from '../../session/conversations';
import { markAllAsReadModal } from '../../state/ducks/modalDialog';
import { SessionButton, SessionButtonType } from '../basic/SessionButton';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { ToastUtils } from '../../session/utils';

export const MarkAllAsReadDialog = () => {
  const titleText = window.i18n('markAllAsRead');
  const okText = window.i18n('markAllAsRead');
  const cancelText = window.i18n('cancel');
  const [_isLoading, setIsLoading] = useState(false);

  const onClickOK = async () => {
    setIsLoading(true);

    const controller = getConversationController();
    const convos = controller.getConversations().filter(conversation => {
      return conversation.isApproved();
    });
    for (const convo of convos) {
      await controller.get(convo.id).markAllAsRead();
    }
    ToastUtils.pushToastSuccess( 'allMarkedRead', window.i18n('allMarkedAsRead'));

    setIsLoading(false);
    closeDialog();
  };

  const closeDialog = () => {
    window.inboxStore?.dispatch(markAllAsReadModal(null));
  };

  return (
    <SessionWrapperModal title={titleText} onClose={closeDialog}>
      <SpacerLG />

      <div className="session-modal__button-group">
        <SessionButton
          text={okText}
          buttonType={SessionButtonType.Simple}
          onClick={onClickOK}
        />
        <SessionButton
          text={cancelText}
          buttonType={SessionButtonType.Simple}
          onClick={closeDialog}
        />
      </div>
    </SessionWrapperModal>
  );
};
