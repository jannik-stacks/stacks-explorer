import { cvToHex, responseErrorCV, responseOkCV, uintCV } from '@/common/utils/stacks-kit';

import { prettyFunctionResult } from '../utils';

describe('prettyFunctionResult', () => {
  it('returns the pretty-printed clarity value on success', () => {
    expect(prettyFunctionResult(cvToHex(uintCV(42)))).toEqual({
      display: 'u42',
      decoded: true,
      success: undefined,
    });
  });

  it('reports response-ok status', () => {
    const result = prettyFunctionResult(cvToHex(responseOkCV(uintCV(1))));
    expect(result.decoded).toBe(true);
    expect(result.success).toBe(true);
  });

  it('reports response-err status', () => {
    const result = prettyFunctionResult(cvToHex(responseErrorCV(uintCV(1))));
    expect(result.decoded).toBe(true);
    expect(result.success).toBe(false);
  });

  it('returns the full raw hex in the fallback on malformed input', () => {
    const result = prettyFunctionResult('not-hex');
    expect(result.decoded).toBe(false);
    expect(result.display).toBe('Unable to decode value:\nnot-hex');
  });
});

describe('stacks.js pretty-print vectors', () => {
  test.each([
    ['0x010000000000000000000000000000002a', 'u42', null],
    ['0x00ffffffffffffffffffffffffffffffd6', '-42', null],
    ['0x03', 'true', null],
    ['0x04', 'false', null],
    ['0x09', 'none', null],
    ['0x0a0100000000000000000000000000000007', '(some u7)', null],
    ['0x070100000000000000000000000000000001', '(ok u1)', true],
    ['0x080100000000000000000000000000000002', '(err u2)', false],
    ['0x020000000568656c6c6f', '0x68656c6c6f', null],
    ['0x0d0000000568656c6c6f', '"hello"', null],
    ['0x0e00000002c3a9', 'u"é"', null],
    ['0x05160000000000000000000000000000000000000000', "'SP000000000000000000002Q6VF78", null],
    [
      '0x0616000000000000000000000000000000000000000003706f78',
      "'SP000000000000000000002Q6VF78.pox",
      null,
    ],
    [
      '0x0b0000000201000000000000000000000000000000010100000000000000000000000000000002',
      '(list\n  u1\n  u2\n)',
      null,
    ],
    ['0x0b00000000', '(list)', null],
    [
      '0x0c000000020161010000000000000000000000000000002a017a09',
      '{\n  a: u42,\n  z: none\n}',
      null,
    ],
  ])('formats %s', (hex, display, success) => {
    expect(prettyFunctionResult(hex as string)).toEqual({
      display,
      decoded: true,
      success: success ?? undefined,
    });
  });
});
