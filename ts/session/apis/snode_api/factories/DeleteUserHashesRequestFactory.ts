import { DeleteHashesFromUserNodeSubRequest } from '../SnodeRequestTypes';

function makeUserHashesToDeleteSubRequest({ messagesHashes }: { messagesHashes: Set<string> }) {
  const messagesHashesArr = [...messagesHashes];
  if (messagesHashesArr.length) {
    return new DeleteHashesFromUserNodeSubRequest({
      messagesHashes: messagesHashesArr,
    });
  }
  return undefined;
}

export const DeleteUserHashesFactory = { makeUserHashesToDeleteSubRequest };
