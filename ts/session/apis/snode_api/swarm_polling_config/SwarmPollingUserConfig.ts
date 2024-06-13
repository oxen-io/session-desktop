import { ConfigMessageHandler } from '../../../../receiver/configMessage';
import { RetrieveMessageItemWithNamespace } from '../types';

async function handleUserSharedConfigMessages(
  userConfigMessagesMerged: Array<RetrieveMessageItemWithNamespace>
) {
  try {
    if (userConfigMessagesMerged.length) {
      window.log.info(
        `received userConfigMessagesMerged count: ${userConfigMessagesMerged.length}`
      );

      try {
        window.log.info(
          `handleConfigMessagesViaLibSession of "${userConfigMessagesMerged.length}" messages with libsession`
        );
        await ConfigMessageHandler.handleUserConfigMessagesViaLibSession(userConfigMessagesMerged);
      } catch (e) {
        const allMessageHases = userConfigMessagesMerged.map(m => m.hash).join(',');
        window.log.warn(
          `failed to handle messages hashes "${allMessageHases}" with libsession. Error: "${e.message}"`
        );
      }
    }
  } catch (e) {
    window.log.warn(
      `handleSharedConfigMessages of ${userConfigMessagesMerged.length} failed with ${e.message}`
    );
    // not rethrowing
  }
}

export const SwarmPollingUserConfig = { handleUserSharedConfigMessages };
