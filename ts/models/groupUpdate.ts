import { getConversationController } from '../session/conversations';
import { UserUtils } from '../session/utils';
import { getI18nFunction } from '../util/i18n';

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

  const getString = getI18nFunction(stripTags);

  if (us) {
    switch (others.length) {
      case 0:
        return getString('groupRemovedYou', { group_name: groupName });
      case 1:
        return getString('groupRemovedYouTwo', { other_name: othersNames[0] });
      default:
        return getString('groupRemovedYouMultiple', { count: othersNames.length });
    }
  }
  switch (others.length) {
    case 0:
      throw new Error('kicked without anyone in it.');
    case 1:
      return getString('groupRemoved', { name: othersNames[0] });
    case 2:
      return getString('groupRemovedTwo', {
        name: othersNames[0],
        other_name: othersNames[1],
      });
    default:
      return getString('groupRemovedMore', {
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

  const getString = getI18nFunction(stripTags);

  if (left.length !== 1) {
    throw new Error('left.length should never be more than 1');
  }

  return us
    ? getString('groupMemberYouLeft')
    : getString('groupMemberLeft', {
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

  const getString = getI18nFunction(stripTags);

  if (us) {
    switch (others.length) {
      case 0:
        return getString('groupMemberNew', { name: window.i18n('you') });
      case 1:
        return getString('groupMemberNewYouOther', { other_name: othersNames[0] });
      default:
        return getString('groupMemberNewYouMultiple', { count: othersNames.length });
    }
  }
  switch (others.length) {
    case 0:
      throw new Error('joined without anyone in it.');
    case 1:
      return getString('groupMemberNew', { name: othersNames[0] });
    case 2:
      return getString('groupMemberTwoNew', {
        name: othersNames[0],
        other_name: othersNames[1],
      });
    default:
      return getString('groupMemberMoreNew', {
        name: others[0],
        count: othersNames.length - 1,
      });
  }
}
