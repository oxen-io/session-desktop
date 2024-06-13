import React from 'react';
import styled from 'styled-components';

import { GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { useNicknameOrProfileNameOrShortenedPubkey } from '../hooks/useParamSelector';
import { PubKey } from '../session/types';
import { UserUtils } from '../session/utils';
import { GroupInvite } from '../session/utils/job_runners/jobs/GroupInviteJob';
import { GroupPromote } from '../session/utils/job_runners/jobs/GroupPromoteJob';
import {
  useMemberInviteFailed,
  useMemberInviteSending,
  useMemberInviteSent,
  useMemberPromoteSending,
  useMemberPromotionFailed,
  useMemberPromotionSent,
} from '../state/selectors/groups';
import { Avatar, AvatarSize, CrownIcon } from './avatar/Avatar';
import { Flex } from './basic/Flex';
import {
  SessionButton,
  SessionButtonColor,
  SessionButtonShape,
  SessionButtonType,
} from './basic/SessionButton';
import { SessionRadio } from './basic/SessionRadio';
import { hasClosedGroupV2QAButtons } from '../shared/env_vars';

const AvatarContainer = styled.div`
  position: relative;
`;

const AvatarItem = (props: { memberPubkey: string; isAdmin: boolean }) => {
  const { memberPubkey, isAdmin } = props;
  return (
    <AvatarContainer>
      <Avatar size={AvatarSize.XS} pubkey={memberPubkey} />
      {isAdmin && <CrownIcon />}
    </AvatarContainer>
  );
};

const StyledSessionMemberItem = styled.button<{
  inMentions?: boolean;
  zombie?: boolean;
  selected?: boolean;
  disableBg?: boolean;
}>`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  flex-grow: 1;
  font-family: var(--font-default);
  padding: 0px var(--margins-sm);
  height: ${props => (props.inMentions ? '40px' : '50px')};
  width: 100%;
  transition: var(--default-duration);
  opacity: ${props => (props.zombie ? 0.5 : 1)};
  background-color: ${props =>
    !props.disableBg && props.selected
      ? 'var(--conversation-tab-background-selected-color) !important'
      : null};

  :not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }
`;

const StyledInfo = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
`;

const StyledName = styled.span`
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledCheckContainer = styled.div`
  display: flex;
  align-items: center;
`;

type MemberListItemProps = {
  pubkey: string;
  isSelected: boolean;
  // this bool is used to make a zombie appear with less opacity than a normal member
  isZombie?: boolean;
  inMentions?: boolean; // set to true if we are rendering members but in the Mentions picker
  disableBg?: boolean;
  isAdmin?: boolean; // if true,  we add a small crown on top of their avatar
  onSelect?: (pubkey: string) => void;
  onUnselect?: (pubkey: string) => void;
  dataTestId?: React.SessionDataTestId;
  displayGroupStatus?: boolean;
  groupPk?: string;
};

const ResendContainer = ({
  displayGroupStatus,
  groupPk,
  pubkey,
}: Pick<MemberListItemProps, 'displayGroupStatus' | 'pubkey' | 'groupPk'>) => {
  if (
    displayGroupStatus &&
    groupPk &&
    PubKey.is03Pubkey(groupPk) &&
    PubKey.is05Pubkey(pubkey) &&
    !UserUtils.isUsFromCache(pubkey)
  ) {
    return (
      <Flex
        container={true}
        margin="0 0 0 auto"
        padding="0 var(--margins-lg)"
        gap="var(--margins-sm)"
      >
        <ResendInviteButton groupPk={groupPk} pubkey={pubkey} />
        <ResendPromoteButton groupPk={groupPk} pubkey={pubkey} />
      </Flex>
    );
  }
  return null;
};

const StyledGroupStatusText = styled.span<{ isFailure: boolean }>`
  color: ${props => (props.isFailure ? 'var(--danger-color)' : 'var(--text-secondary-color)')};
  font-size: var(--font-size-xs);
  margin-top: var(--margins-xs);
  min-width: 100px; // min-width so that the dialog does not resize when the status change to sending
  text-align: left;
`;

const GroupStatusText = ({ groupPk, pubkey }: { pubkey: PubkeyType; groupPk: GroupPubkeyType }) => {
  const groupInviteFailed = useMemberInviteFailed(pubkey, groupPk);
  const groupPromotionFailed = useMemberPromotionFailed(pubkey, groupPk);
  const groupPromotionSending = useMemberPromoteSending(groupPk, pubkey);

  const groupInviteSent = useMemberInviteSent(pubkey, groupPk);
  const groupPromotionSent = useMemberPromotionSent(pubkey, groupPk);
  const groupInviteSending = useMemberInviteSending(groupPk, pubkey);

  const statusText = groupPromotionFailed
    ? window.i18n('promotionFailed')
    : groupInviteFailed
      ? window.i18n('inviteFailed')
      : groupInviteSending
        ? window.i18n('inviteSending')
        : groupPromotionSending
          ? window.i18n('promotionSending')
          : groupInviteSent
            ? window.i18n('inviteSent')
            : groupPromotionSent
              ? window.i18n('promotionSent')
              : null;

  if (!statusText) {
    return null;
  }
  return (
    <StyledGroupStatusText
      data-testid={'group-member-status-text'}
      isFailure={groupPromotionFailed || groupInviteFailed}
    >
      {statusText}
    </StyledGroupStatusText>
  );
};

const GroupStatusContainer = ({
  displayGroupStatus,
  groupPk,
  pubkey,
}: Pick<MemberListItemProps, 'displayGroupStatus' | 'pubkey' | 'groupPk'>) => {
  if (
    displayGroupStatus &&
    groupPk &&
    PubKey.is03Pubkey(groupPk) &&
    PubKey.is05Pubkey(pubkey) &&
    !UserUtils.isUsFromCache(pubkey)
  ) {
    return <GroupStatusText groupPk={groupPk} pubkey={pubkey} />;
  }
  return null;
};

const ResendInviteButton = ({
  groupPk,
  pubkey,
}: {
  pubkey: PubkeyType;
  groupPk: GroupPubkeyType;
}) => {
  return (
    <SessionButton
      dataTestId={'resend-invite-button'}
      buttonShape={SessionButtonShape.Square}
      buttonType={SessionButtonType.Solid}
      text={window.i18n('resend')}
      onClick={() => {
        void GroupInvite.addJob({ groupPk, member: pubkey });
      }}
    />
  );
};

const ResendPromoteButton = ({
  groupPk,
  pubkey,
}: {
  pubkey: PubkeyType;
  groupPk: GroupPubkeyType;
}) => {
  if (!hasClosedGroupV2QAButtons()) {
    return null;
  }
  return (
    <SessionButton
      dataTestId={'resend-promote-button'}
      buttonShape={SessionButtonShape.Square}
      buttonType={SessionButtonType.Solid}
      buttonColor={SessionButtonColor.Danger}
      text="PrOmOtE"
      onClick={() => {
        void GroupPromote.addJob({ groupPk, member: pubkey });
      }}
    />
  );
};

export const MemberListItem = ({
  isSelected,
  pubkey,
  dataTestId,
  disableBg,
  displayGroupStatus,
  inMentions,
  isAdmin,
  isZombie,
  onSelect,
  onUnselect,
  groupPk,
}: MemberListItemProps) => {
  const memberName = useNicknameOrProfileNameOrShortenedPubkey(pubkey);

  return (
    <StyledSessionMemberItem
      onClick={() => {
        // eslint-disable-next-line no-unused-expressions
        isSelected ? onUnselect?.(pubkey) : onSelect?.(pubkey);
      }}
      style={
        !inMentions && !disableBg
          ? {
              backgroundColor: 'var(--background-primary-color)',
            }
          : {}
      }
      data-testid={dataTestId}
      zombie={isZombie}
      inMentions={inMentions}
      selected={isSelected}
      disableBg={disableBg}
    >
      <StyledInfo>
        <AvatarItem memberPubkey={pubkey} isAdmin={isAdmin || false} />
        <Flex
          container={true}
          flexDirection="column"
          margin="0 var(--margins-md)"
          alignItems="flex-start"
        >
          <StyledName data-testid={'group-member-name'}>{memberName}</StyledName>
          <GroupStatusContainer
            pubkey={pubkey}
            displayGroupStatus={displayGroupStatus}
            groupPk={groupPk}
          />
        </Flex>
      </StyledInfo>

      <ResendContainer pubkey={pubkey} displayGroupStatus={displayGroupStatus} groupPk={groupPk} />

      {!inMentions && (
        <StyledCheckContainer>
          <SessionRadio active={isSelected} value={pubkey} inputName={pubkey} label="" />
        </StyledCheckContainer>
      )}
    </StyledSessionMemberItem>
  );
};
