import { createSelector } from '@reduxjs/toolkit';

import { PubkeyType } from 'libsession_util_nodejs';
import { useSelector } from 'react-redux';
import { LocalizerType } from '../../types/Util';

import { UserStateType } from '../ducks/user';
import { StateType } from '../reducer';

export const getUser = (state: StateType): UserStateType => state.user;

export const getOurNumber = createSelector(
  getUser,
  (state: UserStateType): PubkeyType => state.ourNumber as PubkeyType
);

export const getOurDisplayNameInProfile = createSelector(
  getUser,
  (state: UserStateType): string => state.ourDisplayNameInProfile
);

export const getIntl = createSelector(getUser, (): LocalizerType => window.i18n);

export function useOurPkStr() {
  return useSelector((state: StateType) => getOurNumber(state));
}
