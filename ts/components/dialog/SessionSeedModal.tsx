import React, { MouseEvent, useState } from 'react';
import { QRCode } from 'react-qr-svg';
import { useDispatch } from 'react-redux';
import useMount from 'react-use/lib/useMount';
import styled from 'styled-components';

import { ToastUtils } from '../../session/utils';

import { mnDecode } from '../../session/crypto/mnemonic';
import { recoveryPhraseModal } from '../../state/ducks/modalDialog';
import { SpacerSM } from '../basic/Text';

import { saveQRCode } from '../../util/saveQRCode';
import { getCurrentRecoveryPhrase } from '../../util/storage';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { SessionButton, SessionButtonType } from '../basic/SessionButton';
import { Password, loadPassword, newVerificationState } from './SessionPasswordVerification';

interface SeedProps {
  recoveryPhrase: string;
  onClickCopy?: () => any;
}

const StyledRecoveryPhrase = styled.i``;

const StyledQRImage = styled.div`
  width: fit-content;
  margin: 0 auto var(--margins-lg);
  cursor: pointer;
`;

const handleSaveQRCode = (event: MouseEvent) => {
  event.preventDefault();
  saveQRCode(
    'session-recovery-phrase',
    '220px',
    '220px',
    'var(--white-color)',
    'var(--black-color)'
  );
};

const Seed = (props: SeedProps) => {
  const { recoveryPhrase, onClickCopy } = props;
  const i18n = window.i18n;
  const bgColor = 'var(--white-color)';
  const fgColor = 'var(--black-color)';
  const dispatch = useDispatch();

  const hexEncodedSeed = mnDecode(recoveryPhrase, 'english');

  const copyRecoveryPhrase = (recoveryPhraseToCopy: string) => {
    window.clipboard.writeText(recoveryPhraseToCopy);
    ToastUtils.pushCopiedToClipBoard();
    if (onClickCopy) {
      onClickCopy();
    }
    dispatch(recoveryPhraseModal(null));
  };

  return (
    <>
      <div className="session-modal__centered text-center">
        <p
          className="session-modal__description"
          style={{
            lineHeight: '1.3333',
            marginTop: '0px',
            marginBottom: 'var(--margins-md)',
            maxWidth: '600px',
          }}
        >
          {i18n('recoveryPhraseSavePromptMain')}
        </p>

        <StyledQRImage
          aria-label={window.i18n('clickToTrustContact')}
          title={window.i18n('clickToTrustContact')}
          className="qr-image"
          onClick={handleSaveQRCode}
        >
          <QRCode value={hexEncodedSeed} bgColor={bgColor} fgColor={fgColor} level="L" />
        </StyledQRImage>

        <StyledRecoveryPhrase
          data-testid="recovery-phrase-seed-modal"
          className="session-modal__text-highlight"
        >
          {recoveryPhrase}
        </StyledRecoveryPhrase>
      </div>
      <div
        className="session-modal__button-group"
        style={{ justifyContent: 'center', width: '100%' }}
      >
        <SessionButton
          text={i18n('editMenuCopy')}
          buttonType={SessionButtonType.Simple}
          onClick={() => {
            copyRecoveryPhrase(recoveryPhrase);
          }}
        />
      </div>
    </>
  );
};

const StyledSeedModalContainer = styled.div`
  margin: var(--margins-md) var(--margins-sm);
`;

interface ModalInnerProps {
  onClickOk?: () => any;
}

const SessionSeedModalInner = (props: ModalInnerProps) => {
  const { onClickOk } = props;
  const [verificationState, setVerificationState] = useState(newVerificationState());
  const [loadingSeed, setLoadingSeed] = useState(true);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const dispatch = useDispatch();
  const { loadingPassword, passwordValid, hasPassword } = verificationState;

  useMount(() => {
    async function getRecoveryPhrase() {
      if (recoveryPhrase) {
        return false;
      }
      const newRecoveryPhrase = getCurrentRecoveryPhrase();
      setRecoveryPhrase(newRecoveryPhrase);
      setLoadingSeed(false);

      return true;
    }

    setTimeout(() => (document.getElementById('seed-input-password') as any)?.focus(), 100);
    void loadPassword(verificationState, setVerificationState);
    void getRecoveryPhrase();
  });

  const onClose = () => dispatch(recoveryPhraseModal(null));

  return (
    <>
      {!loadingSeed && !loadingPassword && (
        <SessionWrapperModal
          title={window.i18n('showRecoveryPhrase')}
          onClose={onClose}
          showExitIcon={true}
        >
          <StyledSeedModalContainer>
            <SpacerSM />

            {hasPassword && !passwordValid ? (
              <Password
                verificationState={verificationState}
                setVerificationState={setVerificationState}
                onClose={onClose}
              />
            ) : (
              <Seed recoveryPhrase={recoveryPhrase} onClickCopy={onClickOk} />
            )}
          </StyledSeedModalContainer>
        </SessionWrapperModal>
      )}
    </>
  );
};

export const SessionSeedModal = SessionSeedModalInner;
