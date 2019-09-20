/* global module */

// markdown detection functions

// our HTML security depends on the accuracy of these functions

// find closing array in a row
// can't start on a closing
const findClosing = (text, closing, nextCantBe) => {
  'use strict';

  // console.log('findClosing', text)
  const len = text.length;
  let state = 0;
  for (let p = 0; p < len; p += 1) {
    const c = text[p];
    if (!p) {
      if (c === nextCantBe) {
        return false;
      }
    }
    switch (state) {
      case 0:
        if (c === '\\') {
          state = 1;
        } else if (closing === c) {
          return true;
        }
        break;
      case 1: // skip next character
        // we ignore this character for parsing
        state = 0;
        break;
      default:
        break;
    }
  }
  return false;
};

const hasMarkdown = text => {
  'use strict';

  const len = text.length;
  for (let p = 0; p < len; p += 1) {
    const c = text[p];
    // console.log(p, '/', len, 'c', c);
    switch (c) {
      case '\\':
        // just process next char now right into the buffer
        p += 1;
        break;
      case '*':
        if (findClosing(text.substring(p + 1), '*', ' ')) {
          return true;
        }
        break;
      case '_':
        if (findClosing(text.substring(p + 1), '_', ' ')) {
          return true;
        }
        break;
      case '`':
        if (findClosing(text.substring(p + 1), '`')) {
          return true;
        }
        break;
      case '>': {
        const next = text.substr(p + 1, 1);
        if (next === ' ') {
          return true;
        }
        break;
      }
      case '-':
        // only activate if first char
        if (p === 0) {
          const next = text.substr(p + 1, 1);
          if (next === ' ') {
            return true;
          }
        }
        break;
      case ' ':
        // only activate if first char
        if (p === 0) {
          const next3 = text.substr(p + 1, 3);
          // console.log('next3 ['+next3+']')
          if (next3 === '   ') {
            // enables code
            return true;
          }
        }
        break;
      default:
        break;
    }
  }
  return false;
};

const markdownToText = markdownStr => {
  'use strict';

  const len = markdownStr.length;
  let state = 0;
  let buffer = '';
  const bucket = [];
  for (let p = 0; p < len; p += 1) {
    const c = markdownStr[p];
    switch (state) {
      case 0:
        switch (c) {
          case '\\':
            state = 1;
            break;
          case '*':
            // flush anything pending
            if (buffer) {
              bucket.push(buffer);
              buffer = '';
            }
            if (findClosing(markdownStr.substring(p), '*')) {
              state = 2;
            }
            break;
          case '_':
            // flush anything pending
            if (buffer) {
              bucket.push(buffer);
              buffer = '';
            }
            state = 3;
            break;
          case '`':
            // flush anything pending
            if (buffer) {
              bucket.push(buffer);
              buffer = '';
            }
            state = 4;
            break;
          case '>': {
            // can be done anywhere (comparison (4>5) and faces (:>) shouldn't
            // have spaces?))
            const next = markdownStr.substr(p + 1, 1);
            if (next === ' ') {
              // flush anything pending
              if (buffer) {
                bucket.push(buffer);
                buffer = '';
              }
              p += 1;
              state = 5;
            }
            break;
          }
          case '-':
            // only activate if first char
            if (p === 0) {
              const next = markdownStr.substr(p + 1, 1);
              if (next === ' ') {
                buffer += c; // just keep as is
                state = 6;
              }
            } else {
              // if non of the case, accumulate into buffer
              buffer += c;
            }
            break;
          case ' ':
            // only activate if first char
            if (p === 0) {
              const next3 = markdownStr.substr(p + 1, 3);
              if (next3 === '   ') {
                p += 3;
                state = 7;
              }
            } else {
              // if non of the case, accumulate into buffer
              buffer += c;
            }
            break;
          default:
            // if non of the case, accumulate into buffer
            buffer += c;
            break;
        }
        break;
      case 1: // skip next character
        // we ignore this character for parsing
        buffer += c;
        state = 0;
        break;
      case 2: // italics
        if (c === '\\') {
          p += 1; // skip next character
        }
        if (c === '*') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 3: // bold
        if (c === '\\') {
          p += 1; // skip next character
        }
        if (c === '_') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 4: // code
        if (c === '\\') {
          p += 1; // skip next character
        }
        if (c === '`') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 5: // blockquote
        if (c === '\n') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 6: // list
        if (c === '\n') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 7: // 4space code
        if (c === '\n') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      default:
        break;
    }
  }
  // finish these states
  if (state === 5 || state === 6 || state === 7) {
    // flush buffer
    bucket.push(buffer);
    buffer = '';
    state = 0;
  } else if (!state && buffer) {
    // flush any remaining plain text
    bucket.push(buffer);
    buffer = '';
  }
  if (state) {
    // console.log('ending state', state, `buffer [${buffer}]`);
  }
  return bucket.join(' ');
};

// node and browser compatibility
(ref => {
  'use strict';

  if (ref.constructor.name === 'Module') {
    // node
    module.exports = {
      hasMarkdown,
      markdownToText,
    };
  } else {
    // browser
    // should be already set
    // module['hasMarkdown'] = hasMarkdown
    // module['markdownToText'] = markdownToText
  }
})(typeof module === 'undefined' ? this : module);
