import { expect } from 'chai';
import { PubKey } from '../../../../session/types';

const defaultErr = 'Invalid pubkey string passed';

describe('PubKey constructor', () => {
  it('does not throw with 05 prefix, right length and only hex chars', () => {
    expect(() => new PubKey(`05${'0'.repeat(64)}`)).to.not.throw();
  });

  it('does not throw with 15 prefix, right length and only hex chars', () => {
    expect(() => new PubKey(`15${'0'.repeat(64)}`)).to.not.throw();
  });
  it('does not throw with 03 prefix, right length and only hex chars', () => {
    expect(() => new PubKey(`03${'0'.repeat(64)}`)).to.not.throw();
  });
  it('does not throw with 25 prefix, right length and only hex chars', () => {
    expect(() => new PubKey(`25${'0'.repeat(64)}`)).to.not.throw();
  });
  it('does not throw with 05 and textsecure prefix, right length and only hex chars', () => {
    expect(() => new PubKey(`__textsecure_group__!05${'0'.repeat(64)}`)).to.not.throw();
  });

  it('throws with null', () => {
    expect(() => new PubKey(null as any)).to.throw(defaultErr);
  });

  it('throws with undefined', () => {
    expect(() => new PubKey(undefined as any)).to.throw(defaultErr);
  });

  it('throws with empty string', () => {
    expect(() => new PubKey('')).to.throw(defaultErr);
  });
  it('throws with incorrect prefix', () => {
    expect(() => new PubKey(`95${'0'.repeat(64)}`)).to.throw(defaultErr);
  });

  describe('05 prefix', () => {
    it('throws with non-hex chars', () => {
      expect(() => new PubKey(`05${'0'.repeat(63)}(`)).to.throw(defaultErr);
    });

    it('throws with incorrect length', () => {
      expect(() => new PubKey(`05${'0'.repeat(63)}`)).to.throw(defaultErr);
    });

    // Currently we allow pubkeys of length 52 if they have a length of
    // it('throws with incorrect length -2', () => {
    //   expect(() => new PubKey(`05${'0'.repeat(62)}`)).to.throw(defaultErr);
    // });
  });

  describe('25 prefix', () => {
    it('throws with non-hex chars', () => {
      expect(() => new PubKey(`25${'0'.repeat(63)}(`)).to.throw(defaultErr);
    });

    it('throws with incorrect length -1', () => {
      expect(() => new PubKey(`25${'0'.repeat(63)}`)).to.throw(defaultErr);
    });
  });

  describe('03 prefix', () => {
    it('throws with non-hex chars', () => {
      expect(() => new PubKey(`03${'0'.repeat(63)}(`)).to.throw(defaultErr);
    });

    it('throws with incorrect length -1', () => {
      expect(() => new PubKey(`03${'0'.repeat(63)}`)).to.throw(defaultErr);
    });
  });
});
