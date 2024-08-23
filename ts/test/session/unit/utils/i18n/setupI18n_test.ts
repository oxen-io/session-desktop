import { expect } from 'chai';
import { initI18n } from './util';
import { resetTranslationDictionary } from '../../../../../util/i18n/translationDictionaries';

describe('setupI18n', () => {
  afterEach(() => {
    resetTranslationDictionary();
  });
  it('returns setupI18n with all methods defined', () => {
    const setupI18nReturn = initI18n();
    expect(setupI18nReturn).to.be.a('function');
    expect(setupI18nReturn.getRawMessage).to.be.a('function');
    expect(setupI18nReturn.formatMessageWithArgs).to.be.a('function');
    expect(setupI18nReturn.stripped).to.be.a('function');
    expect(setupI18nReturn.inEnglish).to.be.a('function');
  });
});
