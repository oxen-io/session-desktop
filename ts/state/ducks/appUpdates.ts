import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export const initialAppUpdatesState: AppUpdatesState = {
  status: 'NO_UPDATE_AVAILABLE',
  progress: 0,
};

export type AppUpdatesState = {
  status: 'NO_UPDATE_AVAILABLE' | 'UPDATE_AVAILABLE' | 'UPDATE_DOWNLOADING' | 'UPDATE_DOWNLOADED';
  progress: number;
};

const appUpdatesSlice = createSlice({
  name: 'appUpdates',
  initialState: initialAppUpdatesState,
  reducers: {
    updateAvailable(state) {
      state.status = 'UPDATE_AVAILABLE';
    },
    updateDownloading(state) {
      state.status = 'UPDATE_DOWNLOADING';
    },
    updateDownloadProgress(state, action: PayloadAction<{ progress: number }>) {
      state.status = 'UPDATE_DOWNLOADING';
      state.progress = action.payload.progress;
    },
    updateDownloaded(state) {
      state.status = 'UPDATE_DOWNLOADED';
    },
  },
});

export const { actions, reducer } = appUpdatesSlice;
export const { updateAvailable, updateDownloading, updateDownloadProgress, updateDownloaded } =
  actions;
