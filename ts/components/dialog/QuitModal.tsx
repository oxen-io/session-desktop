import { useState } from 'react';
import { useDispatch } from 'react-redux';
import useKey from 'react-use/lib/useKey';
import { CSSProperties } from 'styled-components';
import { updateQuitModal } from '../../state/onboarding/ducks/modals';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { Flex } from '../basic/Flex';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SpacerLG, SpacerSM } from '../basic/Text';
import { SessionConfirmDialogProps } from './SessionConfirm';
import { StyledI18nSubText } from '../basic/StyledI18nSubText';

const thisSpecificModalStyle: CSSProperties = {
  maxWidth: '300px',
  width: '100%',
  lineHeight: 1.4,
};

export const QuitModal = (props: SessionConfirmDialogProps) => {
  const dispatch = useDispatch();
  const {
    title = '',
    i18nMessage,
    okTheme,
    closeTheme = SessionButtonColor.Danger,
    onClickOk,
    onClickClose,
    onClickCancel,
    closeAfterInput = true,
  } = props;

  const [isLoading, setIsLoading] = useState(false);

  const okText = props.okText || window.i18n('okay');
  const cancelText = props.cancelText || window.i18n('cancel');

  const onClickOkHandler = async () => {
    if (onClickOk) {
      setIsLoading(true);
      try {
        await onClickOk();
      } catch (e) {
        window.log.warn(e);
      } finally {
        setIsLoading(false);
      }
    }

    if (closeAfterInput) {
      dispatch(updateQuitModal(null));
    }
  };

  /**
   * Performs specified on close action then removes the modal.
   */
  const onClickCancelHandler = () => {
    onClickCancel?.();
    onClickClose?.();
    dispatch(updateQuitModal(null));
  };

  useKey('Enter', () => {
    void onClickOkHandler();
  });

  useKey('Escape', () => {
    onClickCancelHandler();
  });

  return (
    <SessionWrapperModal
      title={title}
      onClose={onClickClose}
      showExitIcon={false}
      showHeader={true}
      additionalClassName={'no-body-padding'}
    >
      {i18nMessage ? (
        <Flex
          container={true}
          width={'100%'}
          justifyContent="center"
          alignItems="center"
          style={thisSpecificModalStyle}
        >
          <SpacerLG />
          <StyledI18nSubText {...i18nMessage}></StyledI18nSubText>
          <SpacerLG />
        </Flex>
      ) : null}
      <SpacerSM />
      <Flex container={true} width={'100%'} justifyContent="center" alignItems="center">
        <SessionButton
          text={okText}
          buttonColor={okTheme}
          buttonType={SessionButtonType.Ghost}
          onClick={onClickOkHandler}
          disabled={isLoading}
          dataTestId="session-confirm-ok-button"
        />
        <SessionButton
          text={cancelText}
          buttonColor={!okTheme ? closeTheme : undefined}
          buttonType={SessionButtonType.Ghost}
          onClick={onClickCancelHandler}
          disabled={isLoading}
          dataTestId="session-confirm-cancel-button"
        />
      </Flex>
    </SessionWrapperModal>
  );
};
