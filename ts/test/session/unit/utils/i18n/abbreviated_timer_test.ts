import { expect } from 'chai';
import { formatAbbreviatedExpireDoubleTimer } from '../../../../../util/i18n/formater/expirationTimer';

describe('formatAbbreviatedExpireDoubleTimer', () => {
  it('<= 0 returns 0s', () => {
    expect(formatAbbreviatedExpireDoubleTimer(0)).to.be.deep.eq(['0s']);
    expect(formatAbbreviatedExpireDoubleTimer(-1)).to.be.deep.eq(['0s']);
    expect(formatAbbreviatedExpireDoubleTimer(-3600)).to.be.deep.eq(['0s']);
    expect(formatAbbreviatedExpireDoubleTimer(Number.MIN_SAFE_INTEGER)).to.be.deep.eq(['0s']);
  });
  it('single units', () => {
    expect(formatAbbreviatedExpireDoubleTimer(1)).to.be.deep.eq(['1s']);
    expect(formatAbbreviatedExpireDoubleTimer(60 - 1)).to.be.deep.eq(['59s']);
    expect(formatAbbreviatedExpireDoubleTimer(60)).to.be.deep.eq(['1m']);
    expect(formatAbbreviatedExpireDoubleTimer(60 * 2)).to.be.deep.eq(['2m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 - 60)).to.be.deep.eq(['59m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600)).to.be.deep.eq(['1h']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 - 3600)).to.be.deep.eq(['23h']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24)).to.be.deep.eq(['1d']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 - 3600 * 24)).to.be.deep.eq(['6d']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7)).to.be.deep.eq(['1w']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 * 2)).to.be.deep.eq(['2w']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 * 4)).to.be.deep.eq(['4w']);
  });
  it('double units', () => {
    expect(formatAbbreviatedExpireDoubleTimer(60 + 1)).to.be.deep.eq(['1m', '1s']);
    expect(formatAbbreviatedExpireDoubleTimer(60 + 59)).to.be.deep.eq(['1m', '59s']);
    expect(formatAbbreviatedExpireDoubleTimer(60 + 60 + 59)).to.be.deep.eq(['2m', '59s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 - 60 + 1)).to.be.deep.eq(['59m', '1s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 - 1)).to.be.deep.eq(['59m', '59s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 + 1)).to.be.deep.eq(['1h', '1s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 + 59)).to.be.deep.eq(['1h', '59s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 + 60 + 1)).to.be.deep.eq(['1h', '1m']); // even if we have an extra 1s to display','we crop at 2 units display
    expect(formatAbbreviatedExpireDoubleTimer(3600 + 1)).to.be.deep.eq(['1h', '1s']); // we don't have minutes to display so we show h+s
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 23 + 1)).to.be.deep.eq(['23h', '1s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 23 + 60 + 1)).to.be.deep.eq(['23h', '1m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 1)).to.be.deep.eq(['1d', '1s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 60)).to.be.deep.eq(['1d', '1m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 60 + 1)).to.be.deep.eq(['1d', '1m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 60 + 59)).to.be.deep.eq(['1d', '1m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 60 * 2)).to.be.deep.eq(['1d', '2m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 60 * 2)).to.be.deep.eq(['1d', '2m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 60 * 59)).to.be.deep.eq(['1d', '59m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 + 60 * 59 + 6)).to.be.deep.eq([
      '1d',
      '59m',
    ]);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 + 6)).to.be.deep.eq(['1w', '6s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 + 60)).to.be.deep.eq(['1w', '1m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 + 60 * 59)).to.be.deep.eq([
      '1w',
      '59m',
    ]);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 + 3600)).to.be.deep.eq(['1w', '1h']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 + 3600 + 1)).to.be.deep.eq([
      '1w',
      '1h',
    ]);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 + 3600 * 24 * 6)).to.be.deep.eq([
      '1w',
      '6d',
    ]);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 14 + 1)).to.be.deep.eq(['2w', '1s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 14 + 59)).to.be.deep.eq(['2w', '59s']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 14 + 60)).to.be.deep.eq(['2w', '1m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 14 + 60 + 1)).to.be.deep.eq(['2w', '1m']);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 14 + 60 * 59)).to.be.deep.eq([
      '2w',
      '59m',
    ]);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 14 + 3600 * 24)).to.be.deep.eq([
      '2w',
      '1d',
    ]);
    expect(formatAbbreviatedExpireDoubleTimer(3600 * 24 * 14 + 3600 * 24 * 6)).to.be.deep.eq([
      '2w',
      '6d',
    ]);
  });

  it('throws if invalid', () => {
    expect(() => {
      formatAbbreviatedExpireDoubleTimer(Number.MAX_VALUE);
    }).to.throw();
    expect(() => {
      formatAbbreviatedExpireDoubleTimer(3600 * 24 * 7 * 4 + 1); // 1s more than 4 weeks
    }).to.throw();
  });
});
