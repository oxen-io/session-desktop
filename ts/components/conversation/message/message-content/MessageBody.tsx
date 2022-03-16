import React from 'react';
import { RenderTextCallbackType } from '../../../../types/Util';
import { getEmojiSizeClass, SizeClassType } from '../../../../util/emoji';
import { AddMentions } from '../../AddMentions';
import { AddNewLines } from '../../AddNewLines';
import { Emojify } from '../../Emojify';
import { Linkify } from '../../Linkify';

type Props = {
  text: string;
  /** If set, all emoji will be the same size. Otherwise, just one emoji will be large. */
  disableJumbomoji: boolean;
  /** If set, links will be left alone instead of turned into clickable `<a>` tags. */
  disableLinks: boolean;
  isGroup: boolean;
};

const renderMentions: RenderTextCallbackType = ({ text, key, isGroup }) => (
  <AddMentions key={key} text={text} isGroup={isGroup} />
);

export const renderTextDefault: RenderTextCallbackType = ({ text }) => <>{text}</>;

const renderNewLines: RenderTextCallbackType = ({ text: textWithNewLines, key, isGroup }) => {
  const renderOther = isGroup ? renderMentions : renderTextDefault;

  return (
    <AddNewLines
      key={key}
      text={textWithNewLines}
      renderNonNewLine={renderOther}
      isGroup={isGroup}
    />
  );
};

const renderEmoji = ({
  text,
  key,
  sizeClass,
  renderNonEmoji,
  isGroup,
}: {
  text: string;
  key: number;
  sizeClass: SizeClassType;
  renderNonEmoji: RenderTextCallbackType;
  isGroup: boolean;
}) => (
  <Emojify
    key={key}
    text={text}
    sizeClass={sizeClass}
    renderNonEmoji={renderNonEmoji}
    isGroup={isGroup}
  />
);

/**
 * This component makes it very easy to use all three of our message formatting
 * components: `Emojify`, `Linkify`, and `AddNewLines`. Because each of them is fully
 * configurable with their `renderXXX` props, this component will assemble all three of
 * them for you.
 */

const JsxSelectable = (jsx: JSX.Element): JSX.Element => {
  return (
    <span
      className="text-selectable"
      onDragStart={(e: any) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
    >
      {jsx}
    </span>
  );
};

export const MessageBody = (props: Props) => {
  const { text, disableJumbomoji, disableLinks, isGroup } = props;
  const sizeClass: SizeClassType = disableJumbomoji ? 'default' : getEmojiSizeClass(text);

  if (disableLinks) {
    return JsxSelectable(
      renderEmoji({
        text,
        sizeClass,
        key: 0,
        renderNonEmoji: renderNewLines,
        isGroup,
      })
    );
  }

  if (text && text.startsWith('```') && text.endsWith('```')) {
    return <pre className="text-selectable">{text.substring(4, text.length - 3)}</pre>;
  }

  let muText = text;
  if (window.getSettingValue('message-formatting')) {
    const em = /__([\s\S]+?)__(?!_)/g;
    const strong = /\*\*([\s\S]+?)\*\*(?!\*)/g;
    const del = /~~([\s\S]+?)~~(?!~)/g;
    const u = /\^\^([\s\S]+?)\^\^(?!\^)/g;
    const pre = /(```\n?)([\s\S]*?[^`])\1(?!```)/gm;
    const code = /(`)([\s\S]*?[^`])\1(?!`)/g;

    let preformatted = false;
    (muText.match(strong) || []).forEach((s: string) => {
      muText = muText.replace(s, `<strong>${s.substring(2, s.length - 2)}</strong>`);
    });
    (muText.match(em) || []).forEach((s: string) => {
      muText = muText.replace(s, `<em>${s.substring(2, s.length - 2)}</em>`);
    });
    (muText.match(del) || []).forEach((s: string) => {
      muText = muText.replace(s, `<del>${s.substring(2, s.length - 2)}</del>`);
    });
    (muText.match(u) || []).forEach((s: string) => {
      muText = muText.replace(s, `<u>${s.substring(2, s.length - 2)}</u>`);
    });
    (muText.match(pre) || []).forEach((s: string) => {
      muText = muText.replace(s, `<pre>${s.substring(4, s.length - 4)}</pre>`);
      preformatted = true;
    });
    (muText.match(code) || []).forEach((s: string) => {
      muText = muText.replace(s, `<code>${s.substring(1, s.length - 1)}</code>`);
      preformatted = true;
    });

    if (!preformatted) {
      // SmartyPants rendering:
      //  https://daringfireball.net/projects/smartypants/
      muText = muText
        // em-dashes
        .replace(/---/g, '\u2014')
        // en-dashes
        .replace(/--/g, '\u2013')
        // opening single quotes
        .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
        // closing single quotes and apostrophes
        .replace(/'/g, '\u2019')
        // opening double quotes
        .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
        // closing double quotes
        .replace(/"/g, '\u201d')
        // ellipses
        .replace(/\.{3}/g, '\u2026');
    }
  }

  const formatting = muText !== text;
  if (formatting) {
    /* tslint:disable:react-no-dangerous-html */
    return (
      <div className="text-selectable"
	   dangerouslySetInnerHTML={{__html: `<span style="font-size: 1.1em;">${muText}</span>`}}
      />
    );
  }

  return JsxSelectable(
    <Linkify
      text={muText}
      isGroup={isGroup}
      renderNonLink={({ key, text: nonLinkText }) => {
        return renderEmoji({
          text: nonLinkText,
          sizeClass,
          key,
          renderNonEmoji: renderNewLines,
          isGroup,
        });
      }}
    />
  );
};
