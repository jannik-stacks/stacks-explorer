import { TextDecoder, TextEncoder } from 'util';
import 'whatwg-fetch';

if (typeof window !== 'undefined') {
  Object.assign(global, {
    TextEncoder,
    TextDecoder,
    Uint8Array: Object.getPrototypeOf(Buffer.prototype).constructor,
  });
}

process.env.TZ = 'UTC';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
