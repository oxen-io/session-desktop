import React, { useState } from 'react';

import _, { difference } from 'lodash';
import { SpacerLG } from '../basic/Text';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { MemberListItem } from '../MemberListItem';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { useDispatch } from 'react-redux';
import {
  useConversationUsername,
  useGroupAdmins,
  useGroupMembers,
  useIsClosedGroupV3,
  useWeAreAdmin,
} from '../../hooks/useParamSelector';
import { getConversationController } from '../../session/conversations';
import styled from 'styled-components';
import { promoteAdminToClosedGroup } from '../../state/ducks/modalDialog';
import { ConversationTypeEnum } from '../../models/conversationAttributes';
import { useEscapeAction } from '../../hooks/useEscapeAction';

type Props = {
  conversationId: string;
};

const MemberList = styled.div`
  max-height: 240px;
`;

/**
 * Admins are always put first in the list of group members.
 * Also, admins have a little crown on their avatar.
 */
const PromoteAdminList = (props: {
  selected: string | null;
  members: Array<string>;
  onSelect: (m: string) => void;
  onUnselect: (m: string) => void;
}) => {
  const { onSelect, onUnselect, selected, members } = props;

  return (
    <>
      {members.map(member => {
        const isSelected = member === selected || false;

        return (
          <MemberListItem
            pubkey={member}
            isSelected={isSelected}
            onSelect={onSelect}
            onUnselect={onUnselect}
            key={member}
            isAdmin={false}
            disableBg={true}
          />
        );
      })}
    </>
  );
};

// tslint:disable-next-line: max-func-body-length
async function onTriggerPromoteAdmin(convoId: string, memberToPromote: string) {
  const convo = getConversationController()
    .get(convoId)
    ?.getConversationModelProps();
  // we can only promote an admin on a closed group v3 where we are an admin
  if (
    !convo ||
    !convo.weAreAdmin ||
    convo.type !== ConversationTypeEnum.CLOSED_GROUP_V3 ||
    !memberToPromote
  ) {
    throw new Error('Invalid convo for PromoteAdminClosedGroupDialog');
  }

  if (convo.groupAdmins?.includes(memberToPromote)) {
    window.log.warn(`${memberToPromote} is already an admin`);
    return;
  }
  console.warn('onPromoteAdmin ', memberToPromote);
  debugger;
}

function AskConfirmationDescription(props: { memberToPromote: string | null }) {
  const memberToPromoteDisplayName = useConversationUsername(props.memberToPromote || undefined);

  const before = window.i18n('addAsClosedGroupAdminBefore'); // "are you sure you want to add"
  const after = window.i18n('addAsClosedGroupAdminAfter'); // "as an admin? This cannot be undone"

  return (
    <div>
      {before} <strong>{memberToPromoteDisplayName}</strong> {after}
    </div>
  );
}

export const PromoteAdminClosedGroupDialog = (props: Props) => {
  const dispatch = useDispatch();

  const { conversationId } = props;
  const isGroupV3 = useIsClosedGroupV3(conversationId);
  const weAreAdmin = useWeAreAdmin(conversationId);
  const existingMembers = useGroupMembers(conversationId);
  const existingAdmins = useGroupAdmins(conversationId);
  const [memberToPromote, setMemberToPromote] = useState<string | null>(null);
  const [askConfirmation, setAskConfirmation] = useState(false);
  const membersWithoutAdmins = difference(existingMembers, existingAdmins);

  if (!isGroupV3) {
    throw new Error('PromoteAdminClosedGroupDialog invalid group');
  }

  if (!weAreAdmin) {
    throw new Error('PromoteAdminClosedGroupDialog weAreAdmin is false');
  }

  const closeDialog = () => {
    dispatch(promoteAdminToClosedGroup(null));
  };

  const onClickOK = async () => {
    if (memberToPromote && conversationId && askConfirmation) {
      await onTriggerPromoteAdmin(conversationId, memberToPromote);
      closeDialog();
    } else if (memberToPromote && conversationId && !askConfirmation) {
      setAskConfirmation(true);
    } else {
      window.log.info('no member to promote or invalid convo');
      closeDialog;
    }
  };

  const onSelect = (select: string) => {
    console.warn('onselect', select);
    setMemberToPromote(select);
  };

  const onUnselect = (unselect: string) => {
    console.warn('onunselect', unselect);
    if (memberToPromote === unselect) {
      setMemberToPromote(null);
    }
  };

  useEscapeAction(closeDialog);

  const showNoMembersMessage = existingMembers.length === 0;
  const okText = window.i18n('add');
  const cancelText = window.i18n('cancel');
  const titleText = askConfirmation ? window.i18n('addModerator') : window.i18n('addModerators');

  return (
    <SessionWrapperModal title={titleText} onClose={closeDialog}>
      <SpacerLG />
      {!askConfirmation ? (
        <>
          <MemberList className="group-member-list__selection">
            <PromoteAdminList
              onSelect={onSelect}
              onUnselect={onUnselect}
              selected={memberToPromote}
              members={membersWithoutAdmins}
            />
          </MemberList>
          {showNoMembersMessage && <p>{window.i18n('noMembersInThisGroup')}</p>}
        </>
      ) : (
        <AskConfirmationDescription memberToPromote={memberToPromote} />
      )}
      <SpacerLG />
      <div className="session-modal__button-group">
        {!!memberToPromote && (
          <SessionButton
            text={okText}
            onClick={onClickOK}
            buttonType={SessionButtonType.Simple}
            buttonColor={SessionButtonColor.Green}
          />
        )}

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
