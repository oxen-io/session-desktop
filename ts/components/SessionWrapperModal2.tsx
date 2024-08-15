import classNames from 'classnames';
import { ReactNode, useRef } from 'react';
import useKey from 'react-use/lib/useKey';

import styled from 'styled-components';
import { SessionIconButton } from './icon';

import { SessionFocusTrap } from './SessionFocusTrap';
import { Flex } from './basic/Flex';
import { SessionButton, SessionButtonColor, SessionButtonType } from './basic/SessionButton';
import { SpacerXL } from './basic/Text';

const StyledModalContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  position: absolute;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: var(--modal-background-color);
  padding: 0 20px;
  z-index: 100;
  overflow-y: auto;

  .content {
    position: relative;
    max-width: 350px;
    max-height: 90vh;
    margin: 100px auto;
    padding: 1rem;
    background-color: var(--modal-background-content-color);
    /* border-radius: var(--border-radius); */
    overflow: auto;
    box-shadow: var(--modal-drop-shadow);
  }

  input {
    background-color: var(--input-background-color);
    color: var(--input-text-color);
    border: 1px solid var(--input-border-color);

    &::placeholder {
      color: var(--input-text-placeholder-color);
    }
  }

  input[type='radio'] {
    width: inherit;
  }

  input:not([type='radio']) {
    width: 100%;
  }

  input {
    padding: 8px;
    border: 0;
    outline: none;
    border-radius: 4px;

    &:focus {
      outline: none;
    }
  }

  h4 {
    margin-top: 8px;
    margin-bottom: 16px;
  }
`;

const StyledConfirmWrapper = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
  display: flex;

  .session-modal {
    margin: auto auto;
  }
`;

const StyledModal = styled.div`
  animation: fadein var(--default-duration);
  z-index: 150;
  min-width: 300px;
  box-sizing: border-box;
  max-height: 90vh;
  max-width: calc(min(70vw, 800px));
  font-family: var(--font-default);
  /* background-color: var(--modal-background-content-color); */
  color: var(--modal-text-color);
  /* border: 1px solid var(--border-color);
  border-right: none;
  border-top-left-radius: 14px;
  border-bottom-left-radius: 14px; */
  box-shadow: var(--modal-drop-shadow);

  // session-confirm-wrapper
  margin: auto auto;

  overflow: hidden;
  display: flex;
  flex-direction: column;

  .__header {
    font-family: var(--font-default);
    font-size: var(--font-size-lg);
    font-weight: 500;
    text-align: center;
    line-height: 18px;
  }

  .__body {
    padding: 0px var(--margins-lg) var(--margins-lg) var(--margins-lg);
    font-family: var(--font-default);
    line-height: var(--font-size-md);
    font-size: var(--font-size-md);
    overflow-y: auto;
    overflow-x: hidden;

    .message {
      text-align: center;
    }
  }

  &__centered {
    display: flex;
    flex-direction: column;
    align-items: center;
    // to allow new lines
    white-space: pre-wrap;
  }

  &__button-group {
    display: flex;
    justify-content: flex-end;

    .session-button {
      margin: var(--margins-xs);
      font-weight: 500;
    }

    &__center {
      display: flex;
      justify-content: center;

      .session-button {
        margin: var(--margins-xs);
      }
    }
  }

  &__text-highlight {
    @include text-highlight(var(--primary-color));

    color: var(--black-color);

    font-family: var(--font-mono);
    font-style: normal;
    font-size: var(--font-size-xs);
  }
`;

const StyledModalViewport = styled.div`
  max-height: 500px;
  max-width: 400px;
  /* overflow: hidden;
  overflow-y: auto; */
  /* border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color); */
  /* border-radius: 14px; */
  /* border-top-left-radius: 14px; */
  /* border-bottom-left-radius: 14px; */
  background-color: var(--modal-background-content-color);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding-right: 10px;
`;

const StyledModalBorder = styled.div`
  height: 100%;
  width: 100%;
  max-height: 480px;
  max-width: 400px;
  margin: 10px auto;
  /* padding-right: 20px; */
  position: relative;
  overflow: hidden;
  overflow-y: auto;
  background-color: var(--modal-background-content-color);
`;

const StyledModalContent = styled.div`
  /* background-color: var(--modal-background-content-color); */
  height: 100%;
  width: 100%;
  /* border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color); */
  /* border-radius: 14px; */
  /* border-top-right-radius: 14px; */
  /* border-bottom-right-radius: 14px; */
`;

const StyledTitle = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding: 0 var(--margins-sm);
`;

export type SessionWrapperModalType2 = {
  title?: string;
  showHeader?: boolean;
  onConfirm?: () => void;
  onClose?: (event?: KeyboardEvent) => void;
  showClose?: boolean;
  confirmText?: string;
  cancelText?: string;
  showExitIcon?: boolean;
  headerIconButtons?: Array<any>;
  children: ReactNode;
  headerReverse?: boolean;
  additionalClassName?: string;
};

export const SessionWrapperModal2 = (props: SessionWrapperModalType2) => {
  const {
    title,
    onConfirm,
    onClose,
    showHeader = true,
    showClose = false,
    confirmText,
    cancelText,
    showExitIcon,
    headerIconButtons,
    headerReverse,
    additionalClassName,
  } = props;

  useKey(
    'Esc',
    event => {
      props.onClose?.(event);
    },
    undefined,
    [props.onClose]
  );

  useKey(
    'Escape',
    event => {
      props.onClose?.(event);
    },
    undefined,
    [props.onClose]
  );

  const modalRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: any) => {
    if (!modalRef.current?.contains(e.target)) {
      props.onClose?.();
    }
  };

  return (
    <SessionFocusTrap>
      <StyledModalContainer
        className={classNames(additionalClassName)}
        onClick={handleClick}
        role="dialog"
      >
        <StyledConfirmWrapper>
          <StyledModal ref={modalRef}>
            <StyledModalViewport>
              <StyledModalBorder>
                {/* <hr
                  style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    right: 0,
                    borderColor: 'var(--border-color)',
                    margin: 0,
                  }}
                /> */}
                <StyledModalContent>
                  {showHeader ? (
                    <Flex
                      container={true}
                      flexDirection={headerReverse ? 'row-reverse' : 'row'}
                      justifyContent={'space-between'}
                      alignItems={'center'}
                      padding={'var(--margins-lg)'}
                      className={'__header'}
                    >
                      <Flex
                        container={true}
                        flexDirection={headerReverse ? 'row-reverse' : 'row'}
                        alignItems={'center'}
                        padding={'0'}
                        margin={'0'}
                        className={'__header__close'}
                      >
                        {showExitIcon ? (
                          <SessionIconButton
                            iconType="exit"
                            iconSize="small"
                            onClick={() => {
                              props.onClose?.();
                            }}
                            padding={'5px'}
                            margin={'0'}
                            dataTestId="modal-close-button"
                          />
                        ) : null}
                        {headerIconButtons?.length
                          ? headerIconButtons.map((_, index) => {
                              const offset = showExitIcon
                                ? headerIconButtons.length - 2
                                : headerIconButtons.length - 1;
                              if (index > offset) {
                                return null;
                              }
                              return <SpacerXL key={`session-modal__header_space-${index}`} />;
                            })
                          : null}
                      </Flex>
                      <StyledTitle className="__header__title">{title}</StyledTitle>
                      <Flex
                        container={true}
                        flexDirection={headerReverse ? 'row-reverse' : 'row'}
                        alignItems={'center'}
                        padding={'0'}
                        margin={'0'}
                      >
                        {headerIconButtons?.length ? (
                          headerIconButtons.map((iconItem: any) => {
                            return (
                              <SessionIconButton
                                key={iconItem.iconType}
                                iconType={iconItem.iconType}
                                iconSize={'large'}
                                iconRotation={iconItem.iconRotation}
                                onClick={iconItem.onClick}
                                padding={'0'}
                                margin={'0'}
                              />
                            );
                          })
                        ) : showExitIcon ? (
                          <SpacerXL />
                        ) : null}
                      </Flex>
                    </Flex>
                  ) : null}

                  <div className="__body">
                    <div className="__centered">
                      {props.children}

                      <div className="__button-group">
                        {onConfirm ? (
                          <SessionButton
                            buttonType={SessionButtonType.Simple}
                            onClick={props.onConfirm}
                          >
                            {confirmText || window.i18n('ok')}
                          </SessionButton>
                        ) : null}
                        {onClose && showClose ? (
                          <SessionButton
                            buttonType={SessionButtonType.Simple}
                            buttonColor={SessionButtonColor.Danger}
                            onClick={props.onClose}
                          >
                            {cancelText || window.i18n('close')}
                          </SessionButton>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </StyledModalContent>
                {/* <hr
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    borderColor: 'var(--border-color)',
                    margin: 0,
                  }}
                /> */}
              </StyledModalBorder>
            </StyledModalViewport>
          </StyledModal>
        </StyledConfirmWrapper>
      </StyledModalContainer>
    </SessionFocusTrap>
  );
};
