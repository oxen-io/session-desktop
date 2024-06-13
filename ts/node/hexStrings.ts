/**
 * Checks if a string is hex string. A hex string is a string like "0512ab".
 * @param maybeHex the string to test
 * @returns true if this string is a hex string.
 */
const isHexString = (maybeHex: string) =>
  maybeHex.length !== 0 && maybeHex.length % 2 === 0 && !/[^a-fA-F0-9]/u.test(maybeHex);

/**
 * Returns the Uint8Array corresponding to the given string.
 * Note: this is different than the libsodium.from_hex().
 * This takes a string like "0102" and converts it to an UIin8Array like [1, 2] whereare
 * the libsodium one returns [0, 1, 0, 2]
 *
 * Throws an error if this string is not a hex string.
 * @param hexString the string to convert from
 * @returns the Uint8Arrat
 */
const fromHexString = (hexString: string): Uint8Array => {
  if (!isHexString(hexString)) {
    throw new Error('Not a hex string');
  }
  const matches = hexString.match(/.{1,2}/g);
  if (!matches) {
    return new Uint8Array();
  }
  return Uint8Array.from(matches.map(byte => parseInt(byte, 16)));
};

/**
 * Returns the Uint8Array corresponding to the given string, without a 03/05 prefix when there is a prefix
 * Note: this is different than the libsodium.from_hex().
 */
const fromHexStringNoPrefix = (hexString: string): Uint8Array => {
  const asHex = fromHexString(hexString);
  if (asHex.length === 33) {
    return asHex.slice(1);
  }
  return asHex;
};

const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export const HexString = {
  toHexString,
  fromHexString,
  fromHexStringNoPrefix,
  isHexString,
};
