import { shell } from 'electron';
import { isEmpty } from 'lodash';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { MessageInteraction } from '../../interactions';
import { OpenUrlModalState, updateOpenUrlModal } from '../../state/ducks/modalDialog';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { Flex } from '../basic/Flex';
import { I18n } from '../basic/I18n';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SpacerMD } from '../basic/Text';

const StyledDescriptionContainer = styled.div`
  max-height: 150px;
  overflow-y: auto;
`;

export function OpenUrlModal(props: OpenUrlModalState) {
  const dispatch = useDispatch();
  // console.warn('props', props);

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
      showExitIcon={false}
      showHeader={true}
      additionalClassName="no-body-padding"
    >
      <StyledDescriptionContainer>
        <I18n token={'urlOpenDescription'} args={{ url }} />
      </StyledDescriptionContainer>
      <SpacerMD />
      <Flex container={true} justifyContent="center" alignItems="center" width="100%">
        <SessionButton
          text={window.i18n('urlOpen')}
          buttonColor={SessionButtonColor.Danger}
          buttonType={SessionButtonType.Ghost}
          onClick={onClickOpen}
          dataTestId="session-confirm-ok-button"
        />
        <SessionButton
          text={window.i18n('urlCopy')}
          buttonColor={SessionButtonColor.Primary}
          buttonType={SessionButtonType.Ghost}
          onClick={onClickCopy}
          dataTestId="session-confirm-cancel-button"
        />
      </Flex>
    </SessionWrapperModal>
  );
}
