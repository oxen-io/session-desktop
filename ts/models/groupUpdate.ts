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

export function getKickedGroupUpdateStr(kicked: Array<string>, groupName: string) {
  const { others, us } = usAndXOthers(kicked);
  const othersNames = others.map(
    getConversationController().getContactProfileNameOrShortenedPubKey
  );

  if (us) {
    switch (others.length) {
      case 0:
        return { token: 'groupRemovedYou', args: { group_name: groupName } };
      case 1:
        return { token: 'groupRemovedYouTwo', args: { other_name: othersNames[0] } };
      default:
        return { token: 'groupRemovedYouMultiple', args: { count: othersNames.length } };
    }
  }

  switch (others.length) {
    case 0:
      throw new Error('kicked without anyone in it.');
    case 1:
      return { token: 'groupRemoved', args: { name: othersNames[0] } };
    case 2:
      return {
        token: 'groupRemovedTwo',
        args: {
          name: othersNames[0],
          other_name: othersNames[1],
        },
      };
    default:
      return {
        token: 'groupRemovedMore',
        args: {
          name: others[0],
          count: othersNames.length - 1,
        },
      };
  }
}

export function getLeftGroupUpdateChangeStr(left: Array<string>, _groupName: string) {
  const { others, us } = usAndXOthers(left);

  if (left.length !== 1) {
    throw new Error('left.length should never be more than 1');
  }

  return us
    ? { token: 'groupMemberYouLeft' }
    : {
        token: 'groupMemberLeft',
        args: {
          name: getConversationController().getContactProfileNameOrShortenedPubKey(others[0]),
        },
      };
}

export function getJoinedGroupUpdateChangeStr(joined: Array<string>, _groupName: string) {
  const { others, us } = usAndXOthers(joined);
  const othersNames = others.map(
    getConversationController().getContactProfileNameOrShortenedPubKey
  );

  if (us) {
    switch (others.length) {
      case 0:
        return { token: 'legacyGroupMemberYouNew' };
      case 1:
        return { token: 'legacyGroupMemberNewYouOther', args: { other_name: othersNames[0] } };
      default:
        return { token: 'legacyGroupMemberNewYouMultiple', args: { count: othersNames.length } };
    }
  }
  switch (others.length) {
    case 0:
      throw new Error('joined without anyone in it.');
    case 1:
      return { token: 'legacyGroupMemberNew', args: { name: othersNames[0] } };
    case 2:
      return {
        token: 'legacyGroupMemberTwoNew',
        args: {
          name: othersNames[0],
          other_name: othersNames[1],
        },
      };
    default:
      return {
        token: 'legacyGroupMemberNewMultiple',
        args: {
          name: others[0],
          count: othersNames.length - 1,
        },
      };
  }
}
