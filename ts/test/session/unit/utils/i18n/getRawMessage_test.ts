// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - TODO: add generic type to setupI18n to fix this

import { expect } from 'chai';
import { initI18n, testDictionary } from './util';

describe('getRawMessage', () => {
  const i18n = initI18n(testDictionary);

  it('returns the raw message for a token', () => {
    const rawMessage = i18n.getRawMessage('greeting', { name: 'Alice' });
    expect(rawMessage).to.equal('Hello, {name}!');
  });

  it('returns the raw message for a plural token', () => {
    const rawMessage = i18n.getRawMessage('search', { count: 1, found_count: 2 });
    expect(rawMessage).to.equal('{found_count} of {count} match');
  });

  it('returns the raw message for a token with no args', () => {
    const rawMessage = i18n.getRawMessage('noArgs');
    expect(rawMessage).to.equal('No args');
  });

  it('returns the raw message for a token with args', () => {
    const rawMessage = i18n.getRawMessage('args', { name: 'Alice' });
    expect(rawMessage).to.equal('Hello, {name}!');
  });

  it('returns the raw message for a token with a tag', () => {
    const rawMessage = i18n.getRawMessage('tag', { name: 'Alice' });
    expect(rawMessage).to.equal('Hello, {name}! <b>Welcome!</b>');
  });

  it('returns the raw message for a token with a tag and args', () => {
    const rawMessage = i18n.getRawMessage('argInTag', { name: 'Alice', arg: 'Bob' });
    expect(rawMessage).to.equal('Hello, {name}! <b>Welcome, {arg}!</b>');
  });
});
