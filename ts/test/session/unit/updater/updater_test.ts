import path from 'path';
import { readFileSync } from 'fs-extra';
import { isEmpty } from 'lodash';
import { expect } from 'chai';
import { enableLogRedirect } from '../../../test-utils/utils';

describe('Updater', () => {
  it.skip('isUpdateAvailable', () => {});

  it('package.json target are correct', () => {
    const content = readFileSync(
      path.join(__dirname, '..', '..', '..', '..', '..', 'package.json')
    );

    if (!content || isEmpty(content) || !content.includes('"target": ["deb", "rpm", "freebsd"],')) {
      throw new Error(
        'Content empty or does not contain the target on a single line. They have to be for the linux appImage build to pass.'
      );
    }
  });

  it('stubWindowLog is set to false before pushing', () => {
    expect(enableLogRedirect).to.be.eq(
      false,
      'If you see this message, just set `enableLogRedirect` to false in `ts/test/test-utils/utils/stubbing.ts'
    );
  });
});
