import React from 'react';
import styled from 'styled-components';
import { SessionSettingsItemWrapper } from './SessionSettingListItem';

const StyledSessionSelectContainer = styled.div`
  position: relative;
`;

const StyledSessionSelect = styled.select`
  padding: 0.5em;
  margin: 0.5em 0;
  font-size: 1em;
  border: 1px solid var(--input-border-color);
  border-radius: 5px;
  padding: 8px 16px;
  transition: var(--default-duration);
  color: var(--settings-tab-text-color);
  background-image: none !important;
`;

const StyledSelectArrow = styled.span`
  position: absolute;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--input-border-color);
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 16px;
  z-index: 10;
  pointer-events: none;
`;

export const SettingsSessionUiLanguage = () => {
  const [uiLanguage, setUiLanguage] = React.useState(window.getUiLanguage());

  return (
    <SessionSettingsItemWrapper
      inline
      title={window.i18n('uiLanguage')}
      description={window.i18n('uiLanguageDescription')}
    >
      <StyledSessionSelectContainer>
        <StyledSessionSelect
          value={uiLanguage}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setUiLanguage(e.target.value);
            window.setUiLanguage(e.target.value);
          }}
        >
          <option value="ar">العربية</option>
          <option value="be">Беларуская</option>
          <option value="bg">Български</option>
          <option value="ca">Català</option>
          <option value="cs">Čeština</option>
          <option value="da">Dansk</option>
          <option value="de">Deutsch</option>
          <option value="el">Ελληνικά</option>
          <option value="en">English</option>
          <option value="eo">Esperanto</option>
          <option value="es">Español</option>
          <option value="es_419">Español (Latinoamérica)</option>
          <option value="et">Eesti</option>
          <option value="fa">فارسی</option>
          <option value="fi">Suomi</option>
          <option value="fil">Filipino</option>
          <option value="fr">Français</option>
          <option value="he">עברית</option>
          <option value="hi">हिन्दी</option>
          <option value="hr">Hrvatski</option>
          <option value="hu">Magyar</option>
          <option value="hy-AM">Հայերեն</option>
          <option value="id">Bahasa Indonesia</option>
          <option value="it">Italiano</option>
          <option value="ja">日本語</option>
          <option value="ka">ქართული</option>
          <option value="km">ភាសាខ្មែរ</option>
          <option value="kmr">Kurmancî</option>
          <option value="kn">ಕನ್ನಡ</option>
          <option value="ko">한국어</option>
          <option value="lt">Lietuvių</option>
          <option value="lv">Latviešu</option>
          <option value="mk">Македонски</option>
          <option value="nb">Norsk Bokmål</option>
          <option value="nl">Nederlands</option>
          <option value="no">Norsk</option>
          <option value="pa">ਪੰਜਾਬੀ</option>
          <option value="pl">Polski</option>
          <option value="pt_BR">Português (Brasil)</option>
          <option value="pt_PT">Português (Portugal)</option>
          <option value="ro">Română</option>
          <option value="ru">Русский</option>
          <option value="si">සිංහල</option>
          <option value="sk">Slovenčina</option>
          <option value="sl">Slovenščina</option>
          <option value="sq">Shqip</option>
          <option value="sr">Српски</option>
          <option value="sv">Svenska</option>
          <option value="ta">தமிழ்</option>
          <option value="th">ไทย</option>
          <option value="tl">Tagalog</option>
          <option value="tr">Türkçe</option>
          <option value="uk">Українська</option>
          <option value="uz">O‘zbek</option>
          <option value="vi">Tiếng Việt</option>
          <option value="zh_CN">中文 (简体)</option>
          <option value="zh_TW">中文 (繁體)</option>
        </StyledSessionSelect>
        <StyledSelectArrow />
      </StyledSessionSelectContainer>
    </SessionSettingsItemWrapper>
  );
};
