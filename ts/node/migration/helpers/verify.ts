// NOTE This function is kept in a separate file to prevent cyclic dependencies between different migration helpers

/**
 * Verify we are calling the correct helper function in the correct migration before running it.
 *
 * You don't need to call this on functions that aren't being exported as helper functions in a file
 * @param version
 * @param targetVersion
 */
export function verify(version: number, targetVersion: number) {
  if (version !== targetVersion) {
    throw new Error(`Migration version mismatch. Expected: ${targetVersion}, Found: ${version}`);
  }
}
