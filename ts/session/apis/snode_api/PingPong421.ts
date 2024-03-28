/**
 * This file is about an issue on the storage server side that we are badly trying to fix client side.
 * Essentially, every once in awheil
 *
 */

import { groupBy } from 'lodash';
import { Snode } from '../../../data/data';
import { RingBuffer } from '../../utils/RingBuffer';

type Event421 = { snodes: Array<Snode>; snodeEd25519: string; associatedWith: string };
type TrackedEvent421 = Omit<Event421, 'snodes'> & { snodesEd25519: Array<string> };

// we keep the last 100 events of type 421 in memory to guess who is right.
const latest421: RingBuffer<TrackedEvent421> = new RingBuffer(100);

export function track421s({ snodes, snodeEd25519, associatedWith }: Event421) {
  const snodesEd25519 = snodes.map(m => m.pubkey_ed25519);

  latest421.insert({ snodesEd25519, snodeEd25519, associatedWith });
  console.warn(`after insert state: ${snodeEd25519}:${associatedWith}   => `, latest421.toArray());
}

function doWeHaveASwarmFight({ associatedWith }: { associatedWith: string }) {
  const previous421WithRightDestination = latest421.toArray().filter(m => {
    return m.associatedWith === associatedWith;
  });

  groupBy(previous421WithRightDestination, (a) => {
    return a.
  })

  const countOfOthersSayingHeIsOnTheRightSwarm = previous421WithRightDestination.filter(m => {
    return m.snodesEd25519.includes(snodeEd25519);
  }).length;

  const countOfHimSayingEveryoneElseIsWrong = previous421WithRightDestination.filter(m => {
    return m.snodeEd25519 === snodeEd25519 && !m.snodesEd25519.includes(snodeEd25519);
  }).length;

  console.warn(
    `hasBeenReportingInvalid421: snodeEd25519:${snodeEd25519}  ,  associatedWith:${associatedWith}   countOfHimSayingEveryoneElseIsWrong:${countOfHimSayingEveryoneElseIsWrong},  countOfOthersSayingHeIsOnTheRightSwarm:${countOfOthersSayingHeIsOnTheRightSwarm} `,
    latest421.toArray()
  );

  return countOfHimSayingEveryoneElseIsWrong > 2 && countOfOthersSayingHeIsOnTheRightSwarm > 2;
}

/**
 * For testing only
 */
function resetTracked421s() {
  latest421.clear();
}

export const PingPong421 = { doWeHaveASwarmFight, track421s, resetTracked421s };
