import * as crypto from 'crypto';
import { isString } from 'lodash';
import { PASSWORD_LENGTH } from '../session/constants';

const ERRORS = {
  TYPE: 'Password must be a string',
  LENGTH: 'Password must be between 6 and 64 characters long',
  CHARACTER: 'Password must only contain letters, numbers and symbols',
};

const sha512 = (text: string) => {
  const hash = crypto.createHash('sha512');
  hash.update(text.trim());
  return hash.digest('hex');
};

export const generateHash = (phrase: string) => phrase && sha512(phrase);
export const matchesHash = (phrase: string | null, hash: string) =>
  phrase && sha512(phrase) === hash;

export const validatePassword = (phrase: string) => {
  if (!isString(phrase)) {
    return window?.i18n ? window.i18n('passwordError') : ERRORS.TYPE;
  }

  if (phrase.length === 0) {
    return window?.i18n ? window?.i18n('passwordErrorLength') : ERRORS.LENGTH;
  }

  if (
    phrase.length < PASSWORD_LENGTH.MIN_PASSWORD_LEN ||
    phrase.length > PASSWORD_LENGTH.MAX_PASSWORD_LEN
  ) {
    return window?.i18n ? window?.i18n('passwordErrorLength') : ERRORS.LENGTH;
  }

  // Restrict characters to letters, numbers and symbols
  const characterRegex = /^[a-zA-Z0-9-!?/\\()._`~@#$%^&*+=[\]{}|<>,;: ]+$/;
  if (!characterRegex.test(phrase)) {
    return window?.i18n ? window.i18n('passwordError') : ERRORS.CHARACTER;
  }

  return null;
};
