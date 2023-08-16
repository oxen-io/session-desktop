/* eslint-disable max-len */
/*

When doing libsession migrations we cannot share useful functions between migration versions because the typings for libsession have probably changed between them.

To fix this, we now have a file that contains any helper functions related to a specific migration number that can be trusted to have the correct typings and values for that version of libsession.

In order for this to work, any properties on an object type exported from libsession need to be optional. This is because we cannot guarantee that the value will exist on the object in the version of libsession that we are migrating from.

*/
/* eslint-enable max-len */

import { V31 } from './v31';
import { V33 } from './v33';

const MIGRATION_HELPERS = {
  V31,
  V33,
};

export default MIGRATION_HELPERS;
