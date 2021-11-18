import React, { useState } from 'react';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../session/SessionButton';
import { PubKey } from '../../session/types';
import { ToastUtils } from '../../session/utils';
import { SessionSpinner } from '../session/SessionSpinner';
import { Flex } from '../basic/Flex';
import { ApiV2 } from '../../opengroup/opengroupV2';
import { SessionWrapperModal } from '../session/SessionWrapperModal';
import { getConversationController } from '../../session/conversations';
import { useDispatch } from 'react-redux';
import { updateBanUserModal } from '../../state/ducks/modalDialog';
import { SpacerSM } from '../basic/Text';

type Props = {
  conversationId: string;
};

export const BanUserDialog = (props: Props) => {
  const { conversationId } = props;

  const dispatch = useDispatch();
  const convo = getConversationController().get(conversationId);

  const [inputBoxValue, setInputBoxValue] = useState('');
  const [banningInProgress, setBanningInProgress] = useState(false);

  const banUser = async (deleteAll: boolean = false) => {
    // if we don't have valid data entered by the user
    const pubkey = PubKey.from(inputBoxValue);
    if (!pubkey) {
      window.log.info('invalid pubkey for banning user:', inputBoxValue);
      ToastUtils.pushInvalidPubKey();
      return;
    }

    window?.log?.info(`asked to ban user: ${pubkey.key}`);

    try {
      setBanningInProgress(true);
      let isBanned: any;
      // this is a v2 opengroup
      const roomInfos = convo.toOpenGroupV2();
      isBanned = await ApiV2.banUser(pubkey, roomInfos, deleteAll);

      if (!isBanned) {
        window?.log?.warn('failed to ban user:', isBanned);

        ToastUtils.pushUserBanFailure();
      } else {
        window?.log?.info(`${pubkey.key} ban user...`);
        ToastUtils.pushUserBanSuccess();

        // clear input box
        setInputBoxValue('');
      }
    } catch (e) {
      window?.log?.error('Got error while banning user:', e);
    } finally {
      setBanningInProgress(false);
    }
  };

  const { i18n } = window;
  const chatName = convo.get('name');

  // TODO: translate
  const title = `${window.i18n('banUser')}: ${chatName}`;

  const onPubkeyBoxChanges = (e: any) => {
    const val = e.target.value;
    setInputBoxValue(val);
  };

  return (
    <SessionWrapperModal
      showExitIcon={true}
      title={title}
      onClose={() => {
        dispatch(updateBanUserModal(null));
      }}
    >
      <Flex container={true} flexDirection="column" alignItems="center">
        <p>{window.i18n('banUser')}:</p>
        <input
          type="text"
          className="module-main-header__search__input"
          placeholder={i18n('enterSessionID')}
          dir="auto"
          onChange={onPubkeyBoxChanges}
          disabled={banningInProgress}
          value={inputBoxValue}
        />
        <SessionButton
          buttonType={SessionButtonType.Brand}
          buttonColor={SessionButtonColor.Primary}
          onClick={banUser}
          text={i18n('ban')}
          disabled={banningInProgress}
        />
        <SpacerSM />
        <SessionButton
          buttonType={SessionButtonType.Brand}
          buttonColor={SessionButtonColor.Primary}
          onClick={() => {
            banUser(true);
          }}
          text={i18n('banUserAndDeleteAll')}
          disabled={banningInProgress}
        />

        <SessionSpinner loading={banningInProgress} />
      </Flex>
    </SessionWrapperModal>
  );
};
