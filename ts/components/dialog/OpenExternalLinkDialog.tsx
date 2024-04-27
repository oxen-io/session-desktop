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

const StyledSubText = styled(SessionHtmlRenderer) <{ textLength: number }>`
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
`

const StyledExternalLinkInput = styled.input`
  font: inherit;
  border: none !important;
  flex: 1;
`

interface SessionOpenExternalLinkDialogProps {
  urlToOpen: string
}

export const SessionOpenExternalLinkDialog = ({ urlToOpen }: SessionOpenExternalLinkDialogProps) => {
  const dispatch = useDispatch();

  useKey('Enter', () => {
    handleOpen();
  });

  useKey('Escape', () => {
    handleClose();
  });

  const handleOpen = () => {
    void shell.openExternal(urlToOpen);
  };

  const handleCopy = () => {
    MessageInteraction.copyBodyToClipboard(urlToOpen);
  };

  const handleClose = () => {
    dispatch(setOpenExternalLinkModal(null))
  }

  // TODO: replace translations to remove $url$ dynamic varialbe, 
  // instead put this variable below in the readonly input
  const message = window.i18n('linkVisitWarningMessage', ['URL']);

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
    </SessionWrapperModal>
  );
};

export const showLinkVisitWarningDialog = (urlToOpen: string, dispatch: Dispatch<any>) => {
  dispatch(
    setOpenExternalLinkModal({
      urlToOpen,
    })
  );
};
