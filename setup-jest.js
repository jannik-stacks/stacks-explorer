import 'whatwg-fetch';

process.env.TZ = 'UTC';

const { TextDecoder, TextEncoder } = require('node:util');
global.TextEncoder = class extends TextEncoder {
  encode(value) {
    return Uint8Array.from(super.encode(value));
  }
};
global.TextDecoder = TextDecoder;
