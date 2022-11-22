import React from 'react';

import { getConversationController } from '../../session/conversations';
import { ConversationTypeEnum } from '../../models/conversationAttributes';
import { getCompleteUrlForV2ConvoId } from '../../interactions/conversationInteractions';
import _ from 'lodash';
import { SpacerLG } from '../basic/Text';
import { useDispatch, useSelector } from 'react-redux';
import { updateInvitePublicModal } from '../../state/ducks/modalDialog';
// tslint:disable-next-line: no-submodule-imports
import useKey from 'react-use/lib/useKey';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { MemberListItem } from '../MemberListItem';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { getPrivateContactsPubkeys } from '../../state/selectors/conversations';
import { useSet } from '../../hooks/useSet';
import { useEscapeAction } from '../../hooks/useEscapeAction';
import {
  useSelectedDisplayNameInProfile,
  useSelectedIsPublic,
} from '../../state/selectors/selectedConversation';

type Props = {
  conversationId: string;
};

const submitForOpenGroup = async (conversationId: string, pubkeys: Array<string>) => {
  const completeUrl = await getCompleteUrlForV2ConvoId(conversationId);
  const convo = getConversationController().get(conversationId);
  if (!convo || !convo.isOpenGroupV2()) {
    throw new Error('submitForOpenGroup group not found');
  }
  const groupInvitation = {
    url: completeUrl,
    name: convo.getNicknameOrRealUsernameOrPlaceholder(),
  };
  pubkeys.forEach(async pubkeyStr => {
    const privateConvo = await getConversationController().getOrCreateAndWait(
      pubkeyStr,
      ConversationTypeEnum.PRIVATE
    );

    if (privateConvo) {
      void privateConvo.sendMessage({
        body: '',
        attachments: undefined,
        groupInvitation,
        preview: undefined,
        quote: undefined,
      });
    }
  });
};



// tslint:disable-next-line: max-func-body-length
export const InvitePublicDialog = (props: Props) => {
  const { conversationId } = props;
  const dispatch = useDispatch();

  const privateContactPubkeys = useSelector(getPrivateContactsPubkeys);
  const isPublic = useSelectedIsPublic();

  const groupName = useSelectedDisplayNameInProfile() || window.i18n('unknown');

  const { uniqueValues: selectedContacts, addTo, removeFrom } = useSet<string>();

  if (!conversationId) {
    throw new Error('InvitePublicDialog not a valid convoId given');
  }
  if (!isPublic) {
    throw new Error('InvitePublicDialog must be a group');
  }

  const closeDialog = () => {
    dispatch(updateInvitePublicModal(null));
  };

  const onClickOK = () => {
    if (selectedContacts.length > 0) {
      if (!isPublic) {
        throw new Error('Only public chat are supported in this dialog');
      }

      void submitForOpenGroup(conversationId, selectedContacts);
    }

    closeDialog();
  };

  useKey((event: KeyboardEvent) => {
    return event.key === 'Enter';
  }, onClickOK);

  useEscapeAction(closeDialog);

  const titleText = `${window.i18n('addingContacts', [groupName])}`;
  const cancelText = window.i18n('cancel');
  const okText = window.i18n('ok');

  const hasContacts = privateContactPubkeys.length > 0;

  return (
    <SessionWrapperModal title={titleText} onClose={closeDialog}>
      <SpacerLG />

      <div className="contact-selection-list">
        {hasContacts ? (
          privateContactPubkeys.map((member: string) => (
            <MemberListItem
              key={member}
              pubkey={member}
              isSelected={selectedContacts.includes(member)}
              onSelect={addTo}
              onUnselect={removeFrom}
              disableBg={true}
            />
          ))
        ) : (
          <>
            <SpacerLG />
            <p className="no-contacts">{window.i18n('noContactsToAdd')}</p>
            <SpacerLG />
          </>
        )}
      </div>
      <SpacerLG />

      <div className="session-modal__button-group">
        <SessionButton
          text={okText}
          buttonType={SessionButtonType.Simple}
          disabled={!hasContacts}
          onClick={onClickOK}
        />
        <SessionButton
          text={cancelText}
          buttonColor={SessionButtonColor.Danger}
          buttonType={SessionButtonType.Simple}
          onClick={closeDialog}
        />
      </div>
    </SessionWrapperModal>
  );
};
