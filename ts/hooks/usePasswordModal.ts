import { useState } from 'react';
import { useDispatch } from 'react-redux';
import useMount from 'react-use/lib/useMount';
import { updateEnterPasswordModal } from '../state/ducks/modalDialog';
import { getPasswordHash } from '../util/storage';

/**
 * Password protection for a component if a password has been set
 * @param onSuccess - Callback when password is correct
 * @param onClose - Callback when modal is cancelled or closed. Definitely use this if your component returns null until a password is entered
 * @returns An object with two properties - hasPassword which is true if a password has been set, passwordValid which is true if the password entered is correct
 */
export function usePasswordModal({
  onSuccess,
  onClose,
}: {
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  const dispatch = useDispatch();

  const hashFromStorage = getPasswordHash();
  const [hasPassword] = useState(!!hashFromStorage);

  const [passwordValid, setPasswordValid] = useState(!hasPassword);

  useMount(() => {
    // if no hash is set, the user didn't set a password.
    // we can just show whatever was password protected
    if (!hashFromStorage || passwordValid) {
      return;
    }

    dispatch(
      updateEnterPasswordModal({
        setPasswordValid,
        onClickOk: onSuccess,
        onClickClose: onClose,
      })
    );
  });

  return { hasPassword, passwordValid };
}
