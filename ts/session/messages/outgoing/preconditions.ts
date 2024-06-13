import { isEmpty } from 'lodash';
import { PubKey } from '../../types';
import { PreConditionFailed } from '../../utils/errors';

function checkUin8tArrayOrThrow({
  context,
  data,
  expectedLength,
  varName,
}: {
  data: Uint8Array;
  expectedLength: number;
  varName: string;
  context: string;
}) {
  if (isEmpty(data) || data.length !== expectedLength) {
    throw new PreConditionFailed(
      `${varName} length should be ${expectedLength} for ctx:"${context}"`
    );
  }
}

function checkArrayHaveOnly05Pubkeys({
  context,
  arr,
  varName,
}: {
  arr: Array<string>;
  varName: string;
  context: string;
}) {
  if (arr.some(v => !PubKey.is05Pubkey(v))) {
    throw new PreConditionFailed(`${varName} did not contain only 05 pubkeys for ctx:"${context}"`);
  }
}

export const Preconditions = { checkUin8tArrayOrThrow, checkArrayHaveOnly05Pubkeys };
