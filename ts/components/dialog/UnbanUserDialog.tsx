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
import { updateUnbanUserModal } from '../../state/ducks/modalDialog';

type Props = {
  conversationId: string;
};

export const UnbanUserDialog = (props: Props) => {
  const { conversationId } = props;

  const dispatch = useDispatch();
  const convo = getConversationController().get(conversationId);

  const [inputBoxValue, setInputBoxValue] = useState('');
  const [addingInProgress, setUnbanningInProgress] = useState(false);

  const unbanUser = async () => {
    // if we don't have valid data entered by the user
    const pubkey = PubKey.from(inputBoxValue);
    if (!pubkey) {
      window.log.info('invalid pubkey for unbanning user:', inputBoxValue);
      ToastUtils.pushInvalidPubKey();
      return;
    }

    window?.log?.info(`asked to unban user: ${pubkey.key}`);

    try {
      setUnbanningInProgress(true);
      let isUnbanned: any;
      // this is a v2 opengroup
      const roomInfos = convo.toOpenGroupV2();
      isUnbanned = await ApiV2.unbanUser(pubkey, roomInfos);

      if (!isUnbanned) {
        window?.log?.warn('failed to unban user:', isUnbanned);
        ToastUtils.pushUserUnbanFailure();
      } else {
        window?.log?.info(`${pubkey.key} unbanned user...`);
        ToastUtils.pushUserUnbanSuccess();

        // clear input box
        setInputBoxValue('');
      }
    } catch (e) {
      window?.log?.error('Got error while unbanning user:', e);
    } finally {
      setUnbanningInProgress(false);
    }
  };

  const { i18n } = window;
  const chatName = convo.get('name');

  // TODO: translations
  const title = `${window.i18n('unbanUser')}: ${chatName}`;

  const onPubkeyBoxChanges = (e: any) => {
    const val = e.target.value;
    setInputBoxValue(val);
  };

  return (
    <SessionWrapperModal
      showExitIcon={true}
      title={title}
      onClose={() => {
        dispatch(updateUnbanUserModal(null));
      }}
    >
      <Flex container={true} flexDirection="column" alignItems="center">
        <p>{window.i18n('unbanUser')}:</p>
        <input
          type="text"
          className="module-main-header__search__input"
          placeholder={i18n('enterSessionID')}
          dir="auto"
          onChange={onPubkeyBoxChanges}
          disabled={addingInProgress}
          value={inputBoxValue}
        />
        <SessionButton
          buttonType={SessionButtonType.Brand}
          buttonColor={SessionButtonColor.Primary}
          onClick={unbanUser}
          text={i18n('unban')}
          disabled={addingInProgress}
        />

        <SessionSpinner loading={addingInProgress} />
      </Flex>
    </SessionWrapperModal>
  );
};
