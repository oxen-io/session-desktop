import { useCallback, useEffect, useState } from 'react';

import {
  getAlreadyDecryptedMediaUrl,
  getDecryptedMediaUrl,
} from '../session/crypto/DecryptedAttachmentsManager';
import { perfEnd, perfStart } from '../session/utils/Performance';

export const useEncryptedFileFetch = (
  /** undefined if the message is not visible yet, url is '' if something is broken */
  url: string | undefined,
  contentType: string,
  isAvatar: boolean,
  timestamp?: number
) => {
  /** undefined if the attachment is not decrypted yet, '' if the attachment fails to decrypt */
  const [urlToLoad, setUrlToLoad] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const alreadyDecrypted = url ? getAlreadyDecryptedMediaUrl(url) : '';

  const fetchUrl = useCallback(
    async (mediaUrl: string | undefined) => {
      if (alreadyDecrypted || !mediaUrl) {
        if (alreadyDecrypted) {
          setUrlToLoad(alreadyDecrypted);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        perfStart(`getDecryptedMediaUrl-${mediaUrl}-${timestamp}`);
        const decryptedUrl = await getDecryptedMediaUrl(mediaUrl, contentType, isAvatar);
        perfEnd(
          `getDecryptedMediaUrl-${mediaUrl}-${timestamp}`,
          `getDecryptedMediaUrl-${mediaUrl}-${timestamp}`
        );
        setUrlToLoad(decryptedUrl);
      } catch (error) {
        setUrlToLoad('');
      } finally {
        setLoading(false);
      }
    },
    [alreadyDecrypted, contentType, isAvatar, timestamp]
  );

  useEffect(() => {
    void fetchUrl(url);
  }, [fetchUrl, url]);

  return { urlToLoad, loading };
};
