/* eslint-disable no-await-in-loop */
import { useDispatch } from 'react-redux';

import { isEmpty } from 'lodash';
import { useCallback } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useHotkey } from '../../../hooks/useHotkey';
import { useConversationsNicknameRealNameOrShortenPubkey } from '../../../hooks/useParamSelector';
import { updateBlockOrUnblockModal } from '../../../state/ducks/modalDialog';
import { BlockedNumberController } from '../../../util';
import { SessionWrapperModal } from '../../SessionWrapperModal';
import { Flex } from '../../basic/Flex';
import { I18n } from '../../basic/I18n';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../../basic/SessionButton';
import { StyledModalDescriptionContainer } from '../shared/ModalDescriptionContainer';
import { BlockOrUnblockModalState } from './BlockOrUnblockModalState';

type ModalState = NonNullable<BlockOrUnblockModalState>;

function getUnblockTokenAndArgs(names: Array<string>) {
  // multiple unblock is supported
  switch (names.length) {
    case 1:
      return { token: 'blockUnblockName', args: { name: names[0] } } as const;
    case 2:
      return { token: 'blockUnblockNameTwo', args: { name: names[0] } } as const;

    default:
      return {
        token: 'blockUnblockNameMultiple',
        args: { name: names[0], count: names.length - 1 },
      } as const;
  }
}

function useBlockUnblockI18nDescriptionArgs({
  action,
  pubkeys,
}: Pick<ModalState, 'action' | 'pubkeys'>) {
  const names = useConversationsNicknameRealNameOrShortenPubkey(pubkeys);
  if (!pubkeys.length) {
    throw new Error('useI18nDescriptionArgsForAction called with empty list of pubkeys');
  }
  if (action === 'block') {
    if (pubkeys.length !== 1 || names.length !== 1) {
      throw new Error('we can only block a single user at a time');
    }
    return { token: 'blockDescription', args: { name: names[0] } } as const;
  }

  return getUnblockTokenAndArgs(names);
}

export const BlockOrUnblockDialog = ({ pubkeys, action, onConfirmed }: NonNullable<ModalState>) => {
  const dispatch = useDispatch();

  const localizedAction = action === 'block' ? window.i18n('block') : window.i18n('blockUnblock');

  const args = useBlockUnblockI18nDescriptionArgs({ action, pubkeys });

  const closeModal = useCallback(() => {
    dispatch(updateBlockOrUnblockModal(null));
  }, [dispatch]);
  useHotkey('Escape', closeModal);

  const [, onConfirm] = useAsyncFn(async () => {
    if (action === 'block') {
      // we never block more than one user from the UI, so this is not very useful, just a type guard
      for (let index = 0; index < pubkeys.length; index++) {
        const pubkey = pubkeys[index];
        await BlockedNumberController.block(pubkey);
      }
    } else {
      await BlockedNumberController.unblockAll(pubkeys);
    }
    closeModal();
    onConfirmed?.();
  }, [action, onConfirmed, pubkeys]);

  if (isEmpty(pubkeys)) {
    closeModal();
    return null;
  }
  return (
    <SessionWrapperModal showExitIcon={true} title={localizedAction} onClose={closeModal}>
      <StyledModalDescriptionContainer>
        <I18n {...args} />
      </StyledModalDescriptionContainer>
      <Flex container={true} flexDirection="column" alignItems="center">
        <Flex container={true}>
          <div className="session-modal__button-group">
            <SessionButton
              buttonType={SessionButtonType.Simple}
              buttonColor={SessionButtonColor.Danger}
              onClick={onConfirm}
              text={localizedAction}
            />
            <SessionButton
              buttonType={SessionButtonType.Simple}
              buttonColor={SessionButtonColor.White}
              onClick={closeModal}
              text={window.i18n('cancel')}
            />
          </div>
        </Flex>
      </Flex>
    </SessionWrapperModal>
  );
};
