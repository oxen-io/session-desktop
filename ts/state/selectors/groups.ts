import { GroupMemberGet, GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { useSelector } from 'react-redux';
import { PubKey } from '../../session/types';
import { GroupState } from '../ducks/metaGroups';
import { StateType } from '../reducer';

const getLibGroupsState = (state: StateType): GroupState => state.groups;
const getInviteSendingState = (state: StateType) => getLibGroupsState(state).membersInviteSending;
const getPromoteSendingState = (state: StateType) => getLibGroupsState(state).membersPromoteSending;

function getMembersOfGroup(state: StateType, convo?: string): Array<GroupMemberGet> {
  if (!convo) {
    return [];
  }
  if (!PubKey.is03Pubkey(convo)) {
    return [];
  }

  const members = getLibGroupsState(state).members[convo];
  return members || [];
}

function findMemberInMembers(members: Array<GroupMemberGet>, memberPk: string) {
  return members.find(m => m.pubkeyHex === memberPk);
}

export function getLibMembersPubkeys(state: StateType, convo?: string): Array<PubkeyType> {
  const members = getMembersOfGroup(state, convo);

  return members.map(m => m.pubkeyHex);
}

function getIsCreatingGroupFromUI(state: StateType): boolean {
  return getLibGroupsState(state).creationFromUIPending;
}

function getIsMemberGroupChangePendingFromUI(state: StateType): boolean {
  return getLibGroupsState(state).memberChangesFromUIPending;
}

function getGroupNameChangeFromUIPending(state: StateType): boolean {
  return getLibGroupsState(state).nameChangesFromUIPending;
}

export function getLibAdminsPubkeys(state: StateType, convo?: string): Array<string> {
  const members = getMembersOfGroup(state, convo);
  return members.filter(m => m.promoted).map(m => m.pubkeyHex);
}

function getMemberInviteFailed(state: StateType, pubkey: PubkeyType, convo?: GroupPubkeyType) {
  const members = getMembersOfGroup(state, convo);
  return findMemberInMembers(members, pubkey)?.inviteFailed || false;
}

function getMemberInviteSent(state: StateType, pubkey: PubkeyType, convo?: GroupPubkeyType) {
  const members = getMembersOfGroup(state, convo);

  return findMemberInMembers(members, pubkey)?.invitePending || false;
}

function getMemberIsPromoted(state: StateType, pubkey: PubkeyType, convo?: GroupPubkeyType) {
  const members = getMembersOfGroup(state, convo);
  return findMemberInMembers(members, pubkey)?.promoted || false;
}

function getMemberPromotionFailed(state: StateType, pubkey: PubkeyType, convo?: GroupPubkeyType) {
  const members = getMembersOfGroup(state, convo);
  return findMemberInMembers(members, pubkey)?.promotionFailed || false;
}

function getMemberPromotionSent(state: StateType, pubkey: PubkeyType, convo?: GroupPubkeyType) {
  const members = getMembersOfGroup(state, convo);
  return findMemberInMembers(members, pubkey)?.promotionPending || false;
}

export function getLibMembersCount(state: StateType, convo?: GroupPubkeyType): Array<string> {
  return getLibMembersPubkeys(state, convo);
}

function getLibGroupName(state: StateType, convo?: string): string | undefined {
  if (!convo) {
    return undefined;
  }
  if (!PubKey.is03Pubkey(convo)) {
    return undefined;
  }

  const name = getLibGroupsState(state).infos[convo]?.name;
  return name || undefined;
}

export function useLibGroupName(convoId?: string): string | undefined {
  return useSelector((state: StateType) => getLibGroupName(state, convoId));
}

export function useLibGroupMembers(convoId?: string): Array<PubkeyType> {
  return useSelector((state: StateType) => getLibMembersPubkeys(state, convoId));
}

export function useLibGroupAdmins(convoId?: string): Array<string> {
  return useSelector((state: StateType) => getLibAdminsPubkeys(state, convoId));
}

export function getLibGroupNameOutsideRedux(convoId: string): string | undefined {
  const state = window.inboxStore?.getState();
  return state ? getLibGroupName(state, convoId) : undefined;
}

export function getLibGroupMembersOutsideRedux(convoId: string): Array<string> {
  const state = window.inboxStore?.getState();
  return state ? getLibMembersPubkeys(state, convoId) : [];
}

export function getLibGroupAdminsOutsideRedux(convoId: string): Array<string> {
  const state = window.inboxStore?.getState();
  return state ? getLibAdminsPubkeys(state, convoId) : [];
}

export function getMemberInviteSentOutsideRedux(
  member: PubkeyType,
  convoId: GroupPubkeyType
): boolean {
  const state = window.inboxStore?.getState();
  return state ? getMemberInviteSent(state, member, convoId) : false;
}

export function useIsCreatingGroupFromUIPending() {
  return useSelector(getIsCreatingGroupFromUI);
}

export function useMemberInviteFailed(member: PubkeyType, groupPk: GroupPubkeyType) {
  return useSelector((state: StateType) => getMemberInviteFailed(state, member, groupPk));
}

export function useMemberInviteSent(member: PubkeyType, groupPk: GroupPubkeyType) {
  return useSelector((state: StateType) => getMemberInviteSent(state, member, groupPk));
}

export function useMemberIsPromoted(member: PubkeyType, groupPk: GroupPubkeyType) {
  return useSelector((state: StateType) => getMemberIsPromoted(state, member, groupPk));
}

export function useMemberPromotionFailed(member: PubkeyType, groupPk: GroupPubkeyType) {
  return useSelector((state: StateType) => getMemberPromotionFailed(state, member, groupPk));
}

export function useMemberPromotionSent(member: PubkeyType, groupPk: GroupPubkeyType) {
  return useSelector((state: StateType) => getMemberPromotionSent(state, member, groupPk));
}

export function useMemberGroupChangePending() {
  return useSelector(getIsMemberGroupChangePendingFromUI);
}

export function useGroupNameChangeFromUIPending() {
  return useSelector(getGroupNameChangeFromUIPending);
}

/**
 * The selectors above are all deriving data from libsession.
 * There is also some data that we only need in memory, not part of libsession (and so unsaved).
 * An example is the "sending invite" or "sending promote" state of a member in a group.
 */

function useMembersInviteSending(groupPk: GroupPubkeyType) {
  return useSelector((state: StateType) => getInviteSendingState(state)[groupPk] || []);
}

export function useMemberInviteSending(groupPk: GroupPubkeyType, memberPk: PubkeyType) {
  return useMembersInviteSending(groupPk).includes(memberPk);
}

function useMembersPromoteSending(groupPk: GroupPubkeyType) {
  return useSelector((state: StateType) => getPromoteSendingState(state)[groupPk] || []);
}

export function useMemberPromoteSending(groupPk: GroupPubkeyType, memberPk: PubkeyType) {
  return useMembersPromoteSending(groupPk).includes(memberPk);
}
