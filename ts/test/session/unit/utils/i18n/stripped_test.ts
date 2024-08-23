// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - TODO: add generic type to setupI18n to fix this

import { expect } from 'chai';
import { initI18n, testDictionary } from './util';
import { resetTranslationDictionary } from '../../../../../util/i18n/translationDictionaries';

describe('stripped', () => {
  let i18n;
  beforeEach(() => {
    i18n = initI18n(testDictionary);
  });
  afterEach(() => {
    resetTranslationDictionary();
  });

  it('returns the stripped message for a token', () => {
    const message = i18n.stripped('greeting', { name: 'Alice' });
    expect(message).to.equal('Hello, Alice!');
  });

  it('returns the stripped message for a plural token', () => {
    const message = i18n.stripped('search', { count: 1, found_count: 2 });
    expect(message).to.equal('2 of 1 match');
  });

  it('returns the stripped message for a token with no args', () => {
    const message = i18n.stripped('noArgs');
    expect(message).to.equal('No args');
  });

  it('returns the stripped message for a token with args', () => {
    const message = i18n.stripped('args', { name: 'Alice' });
    expect(message).to.equal('Hello, Alice!');
  });

  it('returns the stripped message for a token with the tags stripped', () => {
    const message = i18n.stripped('tag', { name: 'Alice' });
    expect(message).to.equal('Hello, Alice! Welcome!');
  });

  it('returns the stripped message for a token with the tags stripped', () => {
    const message = i18n.stripped('argInTag', { name: 'Alice', arg: 'Bob' });
    expect(message).to.equal('Hello, Alice! Welcome, Bob!');
  });
});
