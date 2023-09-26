import React from 'react';
import { useMount } from 'react-use';
import { ToastUtils } from '../../session/utils';
import { matchesHash } from '../../util/passwordUtils';
import { SpacerSM } from '../basic/Text';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { Data } from '../../data/data';

interface PasswordVerificationState {
  loadingPassword: boolean;
  hasPassword: boolean | null;
  passwordHash: string;
  passwordValid: boolean;
}

export function newVerificationState(): PasswordVerificationState {
  return {
    loadingPassword: true,
    hasPassword: null,
    passwordHash: '',
    passwordValid: false,
  };
}

export async function loadPassword(
  state: PasswordVerificationState,
  setState: (val: PasswordVerificationState) => any
) {
  if (!state.loadingPassword) {
    return;
  }

  const hash = await Data.getPasswordHash();

  setState({
    ...state,
    hasPassword: !!hash,
    passwordHash: hash || '',
    loadingPassword: false,
  });
}

export interface PasswordProps {
  verificationState: PasswordVerificationState;
  setVerificationState: (val: PasswordVerificationState) => any;
  onClose: () => any;
}

export const Password = (props: PasswordProps) => {
  const { verificationState, setVerificationState, onClose } = props;
  const { passwordHash } = verificationState;
  const i18n = window.i18n;

  useMount(() => {
    setTimeout(() => (document.getElementById('input-password') as any)?.focus(), 100);
  });

  const setPasswordValid = (passwordValid: boolean) => {
    setVerificationState({
      ...verificationState,
      passwordValid,
    });
  };

  const confirmPassword = () => {
    const passwordValue = (document.getElementById('input-password') as any)?.value;
    const isPasswordValid = matchesHash(passwordValue as string, passwordHash);

    if (!passwordValue) {
      ToastUtils.pushToastError('enterPasswordErrorToast', i18n('noGivenPassword'));

      return false;
    }

    if (passwordHash && !isPasswordValid) {
      ToastUtils.pushToastError('enterPasswordErrorToast', i18n('invalidPassword'));
      return false;
    }

    setPasswordValid(true);

    window.removeEventListener('keyup', onEnter);
    return true;
  };

  const onEnter = (event: any) => {
    if (event.key === 'Enter') {
      confirmPassword();
    }
  };

  return (
    <>
      <div className="session-modal__input-group">
        <input
          type="password"
          id="input-password"
          placeholder={i18n('enterPassword')}
          onKeyUp={onEnter}
        />
      </div>

      <SpacerSM />

      <div
        className="session-modal__button-group"
        style={{ justifyContent: 'center', width: '100%' }}
      >
        <SessionButton
          text={i18n('done')}
          buttonType={SessionButtonType.Simple}
          onClick={confirmPassword}
        />
        <SessionButton
          text={i18n('cancel')}
          buttonType={SessionButtonType.Simple}
          buttonColor={SessionButtonColor.Danger}
          onClick={onClose}
        />
      </div>
    </>
  );
};
