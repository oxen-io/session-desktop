import { createSelector } from '@reduxjs/toolkit';

import type { LocalizerType } from '../../types/Util';

import type { StateType } from '../reducer';
import type { UserStateType } from '../ducks/user';

export const getUser = (state: StateType): UserStateType => state.user;

export const getOurNumber = createSelector(
  getUser,
  (state: UserStateType): string => state.ourNumber
);

export const getOurDisplayNameInProfile = createSelector(
  getUser,
  (state: UserStateType): string => state.ourDisplayNameInProfile
);

export const getIntl = createSelector(getUser, (): LocalizerType => window.i18n);
