import classNames from 'classnames';
import React from 'react';
import useMount from 'react-use/lib/useMount';
import useTimeoutFn from 'react-use/lib/useTimeoutFn';
import { MAX_USERNAME_BYTES } from '../../session/constants';
import { isAutoLogin, isDevProd } from '../../shared/env_vars';
import { SessionInput } from '../basic/SessionInput';

type DisplayNameProps = {
  stealAutoFocus?: boolean;
  displayName: string;
  onDisplayNameChanged: (val: string) => any;
  handlePressEnter: () => any;
};

/**
 * Can only be used with yarn start-prod. Auto creates a user with the NODE_APP_INSTANCE as username
 */
function useAutoRegister(props: DisplayNameProps) {
  useTimeoutFn(() => {
    if (isDevProd() && isAutoLogin() && !props.displayName) {
      if (!process.env.NODE_APP_INSTANCE) {
        throw new Error('NODE_APP_INSTANCE empty but devprod is true');
      }
      props.onDisplayNameChanged(process.env.NODE_APP_INSTANCE.replace('devprod', ''));
    }
  }, 100);

  useTimeoutFn(() => {
    if (isAutoLogin() && props.displayName) {
      props.handlePressEnter();
    }
  }, 200);
}

const DisplayNameInput = (props: DisplayNameProps) => {
  useAutoRegister(props);

  return (
    <SessionInput
      autoFocus={props.stealAutoFocus || false}
      label={window.i18n('displayName')}
      type="text"
      placeholder={window.i18n('enterDisplayName')}
      value={props.displayName}
      maxLength={MAX_USERNAME_BYTES}
      onValueChanged={props.onDisplayNameChanged}
      onEnterPressed={props.handlePressEnter}
      inputDataTestId="display-name-input"
    />
  );
};

const RecoveryPhraseInput = (props: {
  recoveryPhrase: string;
  onSeedChanged: (val: string) => any;
  handlePressEnter: () => any;
  stealAutoFocus?: boolean;
}) => {
  useMount(() => {
    if (isAutoLogin()) {
      const seed = window.clipboard.readText() as string | undefined;
      if (seed?.split(' ').length === 13) {
        props.onSeedChanged(seed);
      }
    }
  });
  return (
    <SessionInput
      label={window.i18n('recoveryPhrase')}
      type="password"
      value={props.recoveryPhrase}
      autoFocus={props.stealAutoFocus || false}
      placeholder={window.i18n('enterRecoveryPhrase')}
      enableShowHide={true}
      onValueChanged={props.onSeedChanged}
      onEnterPressed={props.handlePressEnter}
      inputDataTestId="recovery-phrase-input"
    />
  );
};

export interface Props {
  showDisplayNameField: boolean;
  showSeedField: boolean;
  stealAutoFocus?: boolean;
  recoveryPhrase?: string;
  displayName: string;
  handlePressEnter: () => any;
  onSeedChanged?: (val: string) => any;
  onDisplayNameChanged: (val: string) => any;
}

export const RegistrationUserDetails = (props: Props) => {
  if (props.showSeedField && (props.recoveryPhrase === undefined || !props.onSeedChanged)) {
    throw new Error('if show seed is true, we need callback + value');
  }
  return (
    <div className={classNames('session-registration__entry-fields')}>
      {props.showSeedField && (
        <RecoveryPhraseInput
          recoveryPhrase={props.recoveryPhrase as string}
          handlePressEnter={props.handlePressEnter}
          onSeedChanged={props.onSeedChanged as any}
          stealAutoFocus={props.stealAutoFocus}
        />
      )}
      <div className="inputfields">
        {props.showDisplayNameField && (
          <DisplayNameInput
            stealAutoFocus={!props.showSeedField && props.stealAutoFocus}
            displayName={props.displayName}
            handlePressEnter={props.handlePressEnter}
            onDisplayNameChanged={props.onDisplayNameChanged}
          />
        )}
      </div>
    </div>
  );
};
