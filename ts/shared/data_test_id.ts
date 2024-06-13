/**
 * Returns a string with all spaces replaced to '-'.
 * A datatestid cannot have spaces on desktop, so we use this to format them accross the app.
 *
 */
export function strToDataTestId(input: string) {
  return input.replaceAll(' ', '-');
}
