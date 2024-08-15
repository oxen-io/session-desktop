import { getConversationController } from '../session/conversations';
import { UserUtils } from '../session/utils';

// to remove after merge with groups
function usAndXOthers(arr: Array<string>) {
  const us = UserUtils.getOurPubKeyStrFromCache();

  if (arr.includes(us)) {
    return { us: true, others: arr.filter(m => m !== us) };
  }
  return { us: false, others: arr };
}

export function getKickedGroupUpdateStr(
  kicked: Array<string>,
  groupName: string,
  stripTags: boolean
) {
  const { others, us } = usAndXOthers(kicked);
  const othersNames = others.map(
    getConversationController().getContactProfileNameOrShortenedPubKey
  );
  if (us) {
    switch (others.length) {
      case 0:
        return window.i18n('groupRemovedYou', { group_name: groupName });
      case 1:
        return window.i18n('groupRemovedYouTwo', { other_name: othersNames[0] });
      default:
        return window.i18n('groupRemovedYouMultiple', { count: othersNames.length });
    }
  }
  switch (others.length) {
    case 0:
      throw new Error('kicked without anyone in it.');
    case 1:
      return window.i18n('groupRemoved', { name: othersNames[0] });
    case 2:
      return window.i18n('groupRemovedTwo', {
        name: othersNames[0],
        other_name: othersNames[1],
      });
    default:
      return window.i18n('groupRemovedMore', {
        name: others[0],
        count: othersNames.length - 1,
      });
  }
}

export function getLeftGroupUpdateChangeStr(
  left: Array<string>,
  _groupName: string,
  stripTags: boolean
) {
  const { others, us } = usAndXOthers(left);

  if (left.length !== 1) {
    throw new Error('left.length should never be more than 1');
  }

  return us
    ? window.i18n('groupMemberYouLeft')
    : window.i18n('groupMemberLeft', {
        name: getConversationController().getContactProfileNameOrShortenedPubKey(others[0]),
      });
}

export function getJoinedGroupUpdateChangeStr(
  joined: Array<string>,
  _groupName: string,
  stripTags: boolean
) {
  const { others, us } = usAndXOthers(joined);
  const othersNames = others.map(
    getConversationController().getContactProfileNameOrShortenedPubKey
  );
  if (us) {
    switch (others.length) {
      case 0:
        return window.i18n('groupMemberNew', { name: window.i18n('you') });
      case 1:
        return window.i18n('groupMemberYouAndOtherNew', { other_name: othersNames[0] });
      default:
        return window.i18n('groupMemberYouAndMoreNew', { count: othersNames.length });
    }
  }
  switch (others.length) {
    case 0:
      throw new Error('joined without anyone in it.');
    case 1:
      return window.i18n('groupMemberNew', { name: othersNames[0] });
    case 2:
      return window.i18n('groupMemberTwoNew', {
        name: othersNames[0],
        other_name: othersNames[1],
      });
    default:
      return window.i18n('groupMemberMoreNew', {
        name: others[0],
        count: othersNames.length - 1,
      });
  }
}
