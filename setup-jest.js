import { TextDecoder, TextEncoder } from 'util';
import 'whatwg-fetch';

process.env.TZ = 'UTC';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
