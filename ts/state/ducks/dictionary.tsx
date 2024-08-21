import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Dictionary, en } from '../../localization/locales';
import { loadDictionary, Locale } from '../../util/i18n';

export type DictionaryState = {
  dictionary: Dictionary;
  locale: string;
};

export const initialDictionaryState = {
  dictionary: en,
  locale: 'en',
};

const dictionarySlice = createSlice({
  name: 'dictionary',
  initialState: initialDictionaryState,
  reducers: {
    updateLocale(state: DictionaryState, action: PayloadAction<Locale>) {
      // eslint-disable-next-line more/no-then
      loadDictionary(action.payload)
        .then(dictionary => {
          state.dictionary = dictionary;
          state.locale = action.payload;
          window.locale = action.payload;
        })
        .catch(e => {
          window.log.error('Failed to load dictionary', e);
        });
    },
  },
});

// destructures
const { actions, reducer } = dictionarySlice;
export const { updateLocale } = actions;
export const defaultDictionaryReducer = reducer;
