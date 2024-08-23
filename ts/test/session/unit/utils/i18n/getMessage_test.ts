// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - TODO: add generic type to setupI18n to fix this

import { expect } from 'chai';
import { initI18n, testDictionary } from './util';
import { resetTranslationDictionary } from '../../../../../util/i18n/translationDictionaries';

describe('getMessage', () => {
  let i18n;
  beforeEach(() => {
    i18n = initI18n(testDictionary);
  });

  afterEach(() => {
    resetTranslationDictionary();
  });

  it('returns the message for a token', () => {
    const message = i18n('greeting', { name: 'Alice' });
    expect(message).to.equal('Hello, Alice!');
  });

  it('returns the message for a plural token', () => {
    const message = i18n('search', { count: 1, found_count: 2 });
    expect(message).to.equal('2 of 1 match');
  });

  it('returns the message for a token with no args', () => {
    const message = i18n('noArgs');
    expect(message).to.equal('No args');
  });

  it('returns the message for a token with args', () => {
    const message = i18n('args', { name: 'Alice' });
    expect(message).to.equal('Hello, Alice!');
  });

  it('returns the message for a token with a tag', () => {
    const message = i18n('tag', { name: 'Alice' });
    expect(message).to.equal('Hello, Alice! <b>Welcome!</b>');
  });

  it('returns the message for a token with a tag and args', () => {
    const message = i18n('argInTag', { name: 'Alice', arg: 'Bob' });
    expect(message).to.equal('Hello, Alice! <b>Welcome, Bob!</b>');
  });
});
