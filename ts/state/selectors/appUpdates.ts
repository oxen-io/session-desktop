import { AppUpdatesState } from '../ducks/appUpdates';
import { StateType } from '../reducer';

export const getAppUpdatesState = (state: StateType): AppUpdatesState => state.appUpdates;

export const getAppUpdatesStatus = (state: StateType): AppUpdatesState['status'] =>
  state.appUpdates.status;

export const getAppUpdateDownloadProgress = (state: StateType): AppUpdatesState['progress'] =>
  state.appUpdates.progress;
