import React, { useState } from 'react';
import { ConversationController } from "../../session/conversations/ConversationController";
import { SessionModal } from './SessionModal';
import { SessionButton, SessionButtonColor } from './SessionButton';
import { SessionHtmlRenderer } from './SessionHTMLRenderer';
import { SessionIcon, SessionIconSize, SessionIconType } from './icon';
import { DefaultTheme, withTheme } from 'styled-components';

type Props = {
  message: string;
  messageSub: string;
  title: string;
  onOk?: any;
  onClose?: any;
  onClickOk: any;
  onClickClose: any;
  okText?: string;
  cancelText?: string;
  hideCancel: boolean;
  okTheme: SessionButtonColor;
  closeTheme: SessionButtonColor;
  sessionIcon?: SessionIconType;
  iconSize?: SessionIconSize;
  theme: DefaultTheme;
  convoId?: any
};

const SessionNicknameInner = (props: Props) => {
  const {
    title = '',
    message,
    messageSub = '',
    okTheme = SessionButtonColor.Primary,
    closeTheme = SessionButtonColor.Primary,
    onClickOk,
    onClickClose,
    hideCancel = false,
    sessionIcon,
    iconSize,
    convoId
  } = props;

  const okText = props.okText || window.i18n('ok');
  const cancelText = props.cancelText || window.i18n('cancel');
  const showHeader = !!props.title;

  const [nickname, setNickname] = useState('');

  const messageSubText = messageSub ? 'session-confirm-main-message' : 'subtle';

  /**
   * Changes the state of nickname variable. If enter is pressed, saves the current
   * entered nickname value as the nickname.
   */
  const onNicknameInput = async (event: any) => {
    if (event.key === 'Enter') {
      saveNickname();
    }
    const currentNicknameEntered = event.target.value;
    setNickname(currentNicknameEntered);
  }

  /**
   * Saves the currently entered nickname. 
   */
  const saveNickname = async () => {
    const convo = await ConversationController.getInstance().get(convoId);
    // .getOrCreateAndWait(
      // message.get('source'),
      // ConversationTypeEnum.PRIVATE
    // );
    console.log({convoId});
    onClickOk(nickname);

    convo.setNickname(nickname);
    convo.commit();
  }

  console.log(`nickname is ${nickname} on this render`);

  return (
    <SessionModal
      title={title}
      onClose={onClickClose}
      showExitIcon={false}
      showHeader={showHeader}
      theme={props.theme}
    >
      {!showHeader && <div className="spacer-lg" />}

      <div className="session-modal__centered">
        {sessionIcon && iconSize && (
          <>
            <SessionIcon iconType={sessionIcon} iconSize={iconSize} theme={props.theme} />
            <div className="spacer-lg" />
          </>
        )}

        <SessionHtmlRenderer tag="span" className={messageSubText} html={message} />
        <SessionHtmlRenderer
          tag="span"
          className="session-confirm-sub-message subtle"
          html={messageSub}
        />
      </div>

      <input
        type="nickname"
        id="nickname-modal-input"
        // ww TODO: is this needed?
        ref={input => {
          // TODO: remove
          console.log('input ref called');
        }}
        // ww TODO: change to internationalized input
        placeholder="Enter a nickname"
        onKeyUp={e => { onNicknameInput(e) }}
      />

      <div className="session-modal__button-group">
        <SessionButton text={okText + " test"} buttonColor={okTheme} onClick={saveNickname} />
          {/* // TODO: Alter to allow to take onClick function like below rather than hard reference in the component 
        <SessionButton text={okText + " test"} buttonColor={okTheme} onClick={onClickOk} /> */}

        {!hideCancel && (
          <SessionButton text={cancelText} buttonColor={closeTheme} onClick={onClickClose} />
        )}
      </div>
    </SessionModal>
  );
};

export const SessionNicknameDialog = withTheme(SessionNicknameInner);
