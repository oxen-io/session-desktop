// markdown detection functions

// find closing array in a row
// can't start on a closing
function findClosing(text, closing, nextCantBe) {
  //console.log('findClosing', text)
  const len = text.length;
  let state = 0;
  const matches = [];
  for (let p = 0; p < len; p++) {
    const c = text[p];
    if (!p) {
      if (c == nextCantBe) {
        return false;
      }
    }
    switch (state) {
      case 0:
        if (c == '\\') {
          idx = 0;
          state = 1;
        } else if (closing == c) {
          return true;
        }
        break;
      case 1: // skip next character
        // we ignore this character for parsing
        state = 0;
        break;
    }
  }
  return false;
}

function hasMarkdown(text) {
  const len = text.length;
  let state = 0;
  for (let p = 0; p < len; p++) {
    const c = text[p];
    //console.log(p, '/', len, 'c', c);
    switch (c) {
      case '\\':
        // just process next char now right into the buffer
        p++;
        buffer += text.substr(p, 1);
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
      case '>':
        next = text.substr(p + 1, 1);
        if (next == ' ') {
          return true;
        }
        break;
      case '-':
        // only activate if first char
        if (p == 0) {
          next = text.substr(p + 1, 1);
          if (next == ' ') {
            return true;
          }
        }
        break;
      case ' ':
        // only activate if first char
        if (p == 0) {
          next3 = text.substr(p + 1, 3);
          //console.log('next3 ['+next3+']')
          if (next3 == '   ') {
            // enables code
            return true;
          }
        }
        break;
    }
  }
  return false;
}

function markdownToText(markdownStr) {
  const len = markdownStr.length;
  let state = 0;
  let buffer = '';
  let bucket = [];
  for (let p = 0; p < len; p++) {
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
          case '>':
            // can be done anywhere (comparison (4>5) and faces (:>) shouldn't have spaces?))
            next = markdownStr.substr(p + 1, 1);
            if (next == ' ') {
              // flush anything pending
              if (buffer) {
                bucket.push(buffer);
                buffer = '';
              }
              p++;
              state = 5;
            }
            break;
          case '-':
            // only activate if first char
            if (p == 0) {
              next = markdownStr.substr(p + 1, 1);
              if (next == ' ') {
                //p++;
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
            if (p == 0) {
              next3 = markdownStr.substr(p + 1, 3);
              if (next3 == '   ') {
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
        if (c == '\\') {
          p++; // skip next character
        }
        if (c == '*') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 3: // bold
        if (c == '\\') {
          p++; // skip next character
        }
        if (c == '_') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 4: // code
        if (c == '\\') {
          p++; // skip next character
        }
        if (c == '`') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 5: // blockquote
        if (c == '\n') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 6: // list
        if (c == '\n') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
      case 7: // 4space code
        if (c == '\n') {
          // flush buffer
          bucket.push(buffer);
          buffer = '';
          state = 0;
        } else {
          buffer += c;
        }
        break;
    }
  }
  // finish these states
  if (state == 5 || state == 6 || state == 7) {
    // flush buffer
    bucket.push(buffer);
    buffer = '';
    state = 0;
  }
  // flush any remaining plain text
  else if (!state && buffer) {
    // flush buffer
    bucket.push(buffer);
    buffer = '';
  }
  if (state) {
    console.log('ending state', state, 'buffer [' + buffer + ']');
  }
  return bucket.join(' ');
}

// node and browser compatibility
(function(ref) {
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
