import { shell } from 'electron';
import React, { Dispatch } from 'react';
import useKey from 'react-use/lib/useKey';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { MessageInteraction } from '../../interactions';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SessionHtmlRenderer } from '../basic/SessionHTMLRenderer';
import { SpacerLG } from '../basic/Text';
import { setOpenExternalLinkModal } from '../../state/ducks/modalDialog';
import { SessionIconButton } from '../icon';
import { TrustedWebsitesController } from '../../util';

const StyledSubText = styled(SessionHtmlRenderer)<{ textLength: number }>`
  font-size: var(--font-size-md);
  line-height: 1.5;
  margin-bottom: var(--margins-lg);

  max-width: ${props =>
    props.textLength > 90
      ? '60ch'
      : '33ch'}; // this is ugly, but we want the dialog description to have multiple lines when a short text is displayed
`;

const StyledExternalLinkContainer = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid var(--input-border-color);
  border-radius: 6px;
  transition: var(--default-duration);
  width: 100%;
`;

const StyledExternalLinkInput = styled.input`
  font: inherit;
  border: none !important;
  flex: 1;
`;

const StyledActionButtons = styled.div`
  display: flex;
  flex-direction: column;

  & > button {
    font-weight: 400;
  }
`;

interface SessionOpenExternalLinkDialogProps {
  urlToOpen: string;
}

export const SessionOpenExternalLinkDialog = ({
  urlToOpen,
}: SessionOpenExternalLinkDialogProps) => {
  const dispatch = useDispatch();

  useKey('Enter', () => {
    handleOpen();
  });

  useKey('Escape', () => {
    handleClose();
  });

  // TODO: replace translations to remove $url$ dynamic varialbe,
  // instead put this variable below in the readonly input
  const message = window.i18n('linkVisitWarningMessage', ['URL']);

  const hostname: string | null = React.useMemo(() => {
    try {
      const url = new URL(urlToOpen);
      return url.hostname;
    } catch (e) {
      return null;
    }
  }, [urlToOpen]);

  const handleOpen = () => {
    void shell.openExternal(urlToOpen);
    handleClose();
  };

  const handleCopy = () => {
    MessageInteraction.copyBodyToClipboard(urlToOpen);
  };

  const handleClose = () => {
    dispatch(setOpenExternalLinkModal(null));
  };

  const handleTrust = () => {
    void TrustedWebsitesController.addToTrusted(hostname!);
    handleOpen();
  };

  return (
    <SessionWrapperModal
      title={window.i18n('linkVisitWarningTitle')}
      onClose={() => 0}
      showExitIcon={false}
      showHeader
    >
      <SpacerLG />

      <div className="session-modal__centered">
        <StyledSubText tag="span" textLength={message.length} html={message} />
        <StyledExternalLinkContainer>
          <StyledExternalLinkInput readOnly value={urlToOpen} />
          <SessionIconButton
            aria-label={window.i18n('editMenuCopy')}
            iconType="copy"
            iconSize="small"
            onClick={handleCopy}
          />
        </StyledExternalLinkContainer>
      </div>

      <SpacerLG />

      <StyledActionButtons>
        <div className="session-modal__button-group">
          <SessionButton
            text={window.i18n('cancel')}
            buttonType={SessionButtonType.Simple}
            onClick={handleClose}
          />
          <SessionButton
            text={window.i18n('open')}
            buttonColor={SessionButtonColor.Primary}
            buttonType={SessionButtonType.Simple}
            onClick={handleOpen}
          />
        </div>
        {hostname && (
          <SessionButton
            text={window.i18n('trustHostname', [hostname])}
            buttonColor={SessionButtonColor.Grey}
            buttonType={SessionButtonType.Simple}
            onClick={handleTrust}
          />
        )}
      </StyledActionButtons>
    </SessionWrapperModal>
  );
};

export const promptToOpenExternalLink = (urlToOpen: string, dispatch: Dispatch<any>) => {
  let hostname: string | null;

  try {
    const url = new URL(urlToOpen);
    hostname = url.hostname;
  } catch (e) {
    hostname = null;
  }

  if (hostname && TrustedWebsitesController.isTrusted(hostname)) {
    void shell.openExternal(urlToOpen);
  } else {
    dispatch(
      setOpenExternalLinkModal({
        urlToOpen,
      })
    );
  }
};
