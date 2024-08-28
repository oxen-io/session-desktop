import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useMount from 'react-use/lib/useMount';
import { ToastUtils } from '../../session/utils';

import { updateEnterPasswordModal } from '../../state/ducks/modalDialog';
import { SpacerSM } from '../basic/Text';

import { useHotkey } from '../../hooks/useHotkey';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';

const StyledModalContainer = styled.div`
  margin: var(--margins-md) var(--margins-sm);
`;

export type EnterPasswordModalProps = {
  setPasswordValid: (value: boolean) => void;
  onClickOk?: () => void;
  onClickClose?: () => void;
};

export const EnterPasswordModal = (props: EnterPasswordModalProps) => {
  const { setPasswordValid, onClickOk, onClickClose } = props;
  const title = window.i18n('sessionRecoveryPassword');

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();

  const onPasswordVerified = () => {
    onClickOk?.();
    dispatch(updateEnterPasswordModal(null));
  };

  const [, verifyPassword] = useAsyncFn(async () => {
    try {
      const passwordValue = passwordInputRef.current?.value;
      if (!passwordValue) {
        ToastUtils.pushToastError('enterPasswordErrorToast', window.i18n('passwordIncorrect'));

        return;
      }

      // this throws if the password is invalid.
      await window.onTryPassword(passwordValue);

      setPasswordValid(true);
      onPasswordVerified();
    } catch (e) {
      window.log.error('window.onTryPassword failed with', e);
      ToastUtils.pushToastError('enterPasswordErrorToast', window.i18n('passwordIncorrect'));
    }
  });

  const onClose = () => {
    if (onClickClose) {
      onClickClose();
    }
    dispatch(updateEnterPasswordModal(null));
  };

  useMount(() => {
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  });

  useHotkey('Enter', (event: KeyboardEvent) => {
    if (event.target === passwordInputRef.current) {
      void verifyPassword();
    }
  });

  return (
    <SessionWrapperModal
      title={title || window.i18n('passwordEnter')}
      onClose={onClose}
      showExitIcon={true}
    >
      <StyledModalContainer>
        <SpacerSM />

        <div className="session-modal__input-group">
          <input
            type="password"
            ref={passwordInputRef}
            data-testid="password-input"
            placeholder={window.i18n('passwordEnter')}
          />
        </div>

        <SpacerSM />

        <div
          className="session-modal__button-group"
          style={{ justifyContent: 'center', width: '100%' }}
        >
          <SessionButton
            text={window.i18n('done')}
            buttonType={SessionButtonType.Simple}
            onClick={verifyPassword}
            dataTestId="session-confirm-ok-button"
          />
          <SessionButton
            text={window.i18n('cancel')}
            buttonType={SessionButtonType.Simple}
            buttonColor={SessionButtonColor.Danger}
            onClick={onClose}
            dataTestId="session-confirm-cancel-button"
          />
        </div>
      </StyledModalContainer>
    </SessionWrapperModal>
  );
};
