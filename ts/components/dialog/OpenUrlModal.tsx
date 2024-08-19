import { shell } from 'electron';
import { isEmpty } from 'lodash';
import { Dispatch } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { MessageInteraction } from '../../interactions';
import { OpenUrlModalState, updateOpenUrlModal } from '../../state/ducks/modalDialog';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SpacerMD } from '../basic/Text';
import { StyledSubText } from './StyledSubText';

const StyledDescriptionContainer = styled.div`
  max-height: 110px;
  max-width: 500px;
  padding: var(--margins-md);
  overflow-y: auto;
`;

export function OpenUrlModal(props: OpenUrlModalState) {
  const dispatch = useDispatch();

  if (!props || isEmpty(props) || !props.urlToOpen) {
    return null;
  }
  const url = props.urlToOpen;

  function onClose() {
    dispatch(updateOpenUrlModal(null));
  }
  function onClickOpen() {
    void shell.openExternal(url);

    onClose();
  }

  function onClickCopy() {
    MessageInteraction.copyBodyToClipboard(url);
    onClose();
  }

  return (
    <SessionWrapperModal
      title={window.i18n('urlOpen')}
      onClose={onClose}
      showExitIcon={true}
      showHeader={true}
    >
      <div className="session-modal__centered">
        <StyledDescriptionContainer>
          <StyledSubText
            tag="span"
            textLength={url.length}
            html={window.i18n('urlOpenDescription', { url })}
          />
        </StyledDescriptionContainer>
      </div>
      <SpacerMD />
      <div className="session-modal__button-group">
        <SessionButton
          text={window.i18n('urlOpen')}
          buttonColor={SessionButtonColor.Danger}
          buttonType={SessionButtonType.Simple}
          onClick={onClickOpen}
          dataTestId="session-confirm-ok-button"
        />
        <SessionButton
          text={window.i18n('urlCopy')}
          buttonColor={SessionButtonColor.White}
          buttonType={SessionButtonType.Simple}
          onClick={onClickCopy}
          dataTestId="session-confirm-cancel-button"
        />
      </div>
    </SessionWrapperModal>
  );
}

export const showLinkVisitWarningDialog = (urlToOpen: string, dispatch: Dispatch<any>) => {
  dispatch(
    updateOpenUrlModal({
      urlToOpen,
    })
  );
};
