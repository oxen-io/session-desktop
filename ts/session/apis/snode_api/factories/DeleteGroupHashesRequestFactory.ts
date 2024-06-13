import { UserGroupsGet } from 'libsession_util_nodejs';
import { isEmpty } from 'lodash';
import { ed25519Str } from '../../../utils/String';
import { DeleteHashesFromGroupNodeSubRequest } from '../SnodeRequestTypes';

function makeGroupHashesToDeleteSubRequest({
  messagesHashes,
  group,
}: {
  group: Pick<UserGroupsGet, 'secretKey' | 'pubkeyHex'>;
  messagesHashes: Set<string>;
}) {
  const groupPk = group.pubkeyHex;
  const messagesHashesArr = [...messagesHashes];
  if (messagesHashesArr.length) {
    if (!group.secretKey || isEmpty(group.secretKey)) {
      window.log.debug(
        `makeGroupHashesToDeleteSubRequest: ${ed25519Str(groupPk)}: messagesHashesArr not empty but we do not have the secretKey`
      );

      throw new Error(
        'makeGroupHashesToDeleteSubRequest: messagesHashesArr not empty but we do not have the secretKey'
      );
    }

    return new DeleteHashesFromGroupNodeSubRequest({
      messagesHashes: messagesHashesArr,
      groupPk,
      secretKey: group.secretKey,
    });
  }
  return undefined;
}

export const DeleteGroupHashesFactory = { makeGroupHashesToDeleteSubRequest };
