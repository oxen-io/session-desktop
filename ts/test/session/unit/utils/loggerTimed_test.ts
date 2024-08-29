import { assert } from 'chai';
import { TimedLog } from '../../../../util/loggerTimed';

const second = 's';
const ms = 'ms';

type TimePair = { offset: number; output: string };
type TimePairs = Readonly<Array<TimePair>>;

function testPair({ offset, output }: TimePair) {
  const result = TimedLog.formatDistanceToNow(Date.now() - offset);
  assert.strictEqual(result, output);
}

function testPairFuzzy({ offset, output }: TimePair) {
  const result = TimedLog.formatDistanceToNow(Date.now() - offset);
  const resultNumber = parseInt(result.replaceAll(/[a-zA-Z]/g, ''), 10);
  const expectedNumber = parseInt(output.replaceAll(/[a-zA-Z]/g, ''), 10);
  assert.approximately(resultNumber, expectedNumber, 1);
}

describe('TimedLog', () => {
  describe('formatDistanceToNow', () => {
    it('should return exact milliseconds when the time difference is less than 1 second', () => {
      (
        [
          { offset: 0, output: `0${ms}` },
          { offset: 2, output: `2${ms}` },
          { offset: 10, output: `10${ms}` },
          { offset: 22, output: `22${ms}` },
          { offset: 257, output: `257${ms}` },
          { offset: 555, output: `555${ms}` },
          { offset: 900, output: `900${ms}` },
        ] satisfies TimePairs
      ).forEach(testPairFuzzy);
    });

    it('should not round milliseconds when the time difference is less than 1 second', () => {
      (
        [
          { offset: 1, output: `1${ms}` },
          { offset: 50, output: `50${ms}` },
          { offset: 500, output: `500${ms}` },
          { offset: 750, output: `750${ms}` },
          { offset: 998, output: `998${ms}` },
          { offset: 999, output: `999${ms}` },
        ] satisfies TimePairs
      ).forEach(testPairFuzzy);
    });

    it('should return exact seconds when the time difference is an exact second', () => {
      (
        [
          { offset: 1000, output: `1${second}` },
          { offset: 2000, output: `2${second}` },
          { offset: 10000, output: `10${second}` },
          { offset: 25000, output: `25${second}` },
          { offset: 59000, output: `59${second}` },
          { offset: 60000, output: `60${second}` },
          { offset: 127000, output: `127${second}` },
        ] satisfies TimePairs
      ).forEach(testPair);
    });

    it('should return seconds with milliseconds when the time difference is greater than or equal to 1 second', () => {
      (
        [
          { offset: 1001, output: `1.001${second}` },
          { offset: 1010, output: `1.01${second}` },
          { offset: 1100, output: `1.1${second}` },
          { offset: 2002, output: `2.002${second}` },
          { offset: 10010, output: `10.01${second}` },
          { offset: 25022, output: `25.022${second}` },
          { offset: 59057, output: `59.057${second}` },
          { offset: 60001, output: `60.001${second}` },
          { offset: 127123, output: `127.123${second}` },
        ] satisfies TimePairs
      ).forEach(testPair);
    });

    it('should return accurate seconds with milliseconds when the time offset is a float millisecond value', () => {
      // Millisecond values should be whole numbers but we should still handle non-regular values as its theoretically possible for the time to be a float
      (
        [
          { offset: 1.11112123213, output: `2${ms}` },
          { offset: 1.567, output: `2${ms}` },
          { offset: 1.867, output: `2${ms}` },
          { offset: 1001.567, output: `1.002${second}` },
          { offset: 2002.1, output: `2.003${second}` },
          { offset: 10000.0000001, output: `10${second}` },
        ] satisfies TimePairs
      ).forEach(testPair);
    });
  });
});
