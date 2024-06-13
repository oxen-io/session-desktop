import { useEffect, useRef, useState } from 'react';

import { DecryptedAttachmentsManager } from '../session/crypto/DecryptedAttachmentsManager';
import { perfEnd, perfStart } from '../session/utils/Performance';

export const useEncryptedFileFetch = (url: string, contentType: string, isAvatar: boolean) => {
  const [urlToLoad, setUrlToLoad] = useState('');
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  const alreadyDecrypted = DecryptedAttachmentsManager.getAlreadyDecryptedMediaUrl(url);

  useEffect(() => {
    async function fetchUrl() {
      perfStart(`getDecryptedMediaUrl-${url}`);
      const decryptedUrl = await DecryptedAttachmentsManager.getDecryptedMediaUrl(
        url,
        contentType,
        isAvatar
      );
      perfEnd(`getDecryptedMediaUrl-${url}`, `getDecryptedMediaUrl-${url}`);

      if (mountedRef.current) {
        setUrlToLoad(decryptedUrl);
        setLoading(false);
      }
    }
    if (alreadyDecrypted) {
      return;
    }
    setLoading(true);
    mountedRef.current = true;
    void fetchUrl();

    // eslint-disable-next-line consistent-return
    return () => {
      mountedRef.current = false;
    };
  }, [url, alreadyDecrypted, contentType, isAvatar]);

  if (alreadyDecrypted) {
    return { urlToLoad: alreadyDecrypted, loading: false };
  }
  return { urlToLoad, loading };
};
