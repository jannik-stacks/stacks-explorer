import * as clarity from '@/common/utils/stacks-kit';
import { cvToHex, noneCV, uintCV } from '@/common/utils/stacks-kit';

import { parseHexClarityValue } from '../utils';

describe('parseHexClarityValue', () => {
  it('parses a hex-prefixed clarity value', () => {
    expect(parseHexClarityValue(cvToHex(uintCV(42)))).toEqual({ display: 'u42', parsed: true });
  });

  it('parses a hex string without 0x prefix', () => {
    const hex = cvToHex(uintCV(7)).slice(2);
    expect(parseHexClarityValue(hex)).toEqual({ display: 'u7', parsed: true });
  });

  it('parses optional none', () => {
    expect(parseHexClarityValue(cvToHex(noneCV()))).toEqual({ display: 'none', parsed: true });
  });

  it('returns the raw input and parsed=false on malformed hex', () => {
    expect(parseHexClarityValue('not-hex')).toEqual({ display: 'not-hex', parsed: false });
  });
});

describe('stacks.js wire and display vectors', () => {
  test.each([
    ['0x010000000000000000000000000000002a', 'u42'],
    ['0x00ffffffffffffffffffffffffffffffd6', '-42'],
    ['0x03', 'true'],
    ['0x04', 'false'],
    ['0x09', 'none'],
    ['0x0a0100000000000000000000000000000007', '(some u7)'],
    ['0x070100000000000000000000000000000001', '(ok u1)'],
    ['0x080100000000000000000000000000000002', '(err u2)'],
    ['0x020000000568656c6c6f', '0x68656c6c6f'],
    ['0x0d0000000568656c6c6f', '"hello"'],
    ['0x0e00000002c3a9', 'u"é"'],
    ['0x05160000000000000000000000000000000000000000', 'SP000000000000000000002Q6VF78'],
    ['0x0616000000000000000000000000000000000000000003706f78', 'SP000000000000000000002Q6VF78.pox'],
    [
      '0x0b0000000201000000000000000000000000000000010100000000000000000000000000000002',
      '(list u1 u2)',
    ],
    ['0x0b00000000', '(list )'],
    ['0x0c000000020161010000000000000000000000000000002a017a09', '(tuple (a u42) (z none))'],
  ])('decodes %s', (hex, display) => {
    expect(parseHexClarityValue(hex)).toEqual({ display, parsed: true });
  });
});

describe('stacks.js ABI encoding vectors', () => {
  test.each([
    ['42', 'uint128', '0x010000000000000000000000000000002a'],
    ['-42', 'int128', '0x00ffffffffffffffffffffffffffffffd6'],
    ['true', 'bool', '0x03'],
    ['0', 'bool', '0x04'],
    [
      'abcd',
      {
        buffer: {
          length: 2,
        },
      },
      '0x0200000002abcd',
    ],
    [
      'hello',
      {
        'string-ascii': {
          length: 5,
        },
      },
      '0x0d0000000568656c6c6f',
    ],
    [
      'é',
      {
        'string-utf8': {
          length: 2,
        },
      },
      '0x0e00000002c3a9',
    ],
    [
      '7',
      {
        optional: 'uint128',
      },
      '0x0a0100000000000000000000000000000007',
    ],
    [
      'SP000000000000000000002Q6VF78',
      'principal',
      '0x05160000000000000000000000000000000000000000',
    ],
    [
      'SP000000000000000000002Q6VF78.pox',
      'trait_reference',
      '0x0616000000000000000000000000000000000000000003706f78',
    ],
  ])('encodes %s as %j', (value, type, hex) => {
    expect(
      clarity.cvToHex(
        clarity.encodeAbiClarityValue(value as string, type as clarity.ClarityAbiType)
      )
    ).toBe(hex);
  });
});

describe('stacks.js JSON vectors', () => {
  test.each([
    [
      '0x010000000000000000000000000000002a',
      {
        type: 'uint',
        value: '42',
      },
    ],
    [
      '0x03',
      {
        type: 'bool',
        value: true,
      },
    ],
    [
      '0x09',
      {
        type: '(optional none)',
        value: null,
      },
    ],
    [
      '0x0a0100000000000000000000000000000007',
      {
        type: '(optional uint)',
        value: {
          type: 'uint',
          value: '7',
        },
      },
    ],
    [
      '0x070c0000000205636f756e740100000000000000000000000000000001056974656d730b000000010100000000000000000000000000000002',
      {
        type: '(response (tuple (count uint) (items (list 1 uint))) UnknownType)',
        value: {
          type: '(tuple (count uint) (items (list 1 uint)))',
          value: {
            count: {
              type: 'uint',
              value: '1',
            },
            items: {
              type: '(list 1 uint)',
              value: [
                {
                  type: 'uint',
                  value: '2',
                },
              ],
            },
          },
        },
        success: true,
      },
    ],
    [
      '0x080100000000000000000000000000000002',
      {
        type: '(response UnknownType uint)',
        value: {
          type: 'uint',
          value: '2',
        },
        success: false,
      },
    ],
    [
      '0x0e00000002c3a9',
      {
        type: '(string-utf8 2)',
        value: 'é',
      },
    ],
    [
      '0x05160000000000000000000000000000000000000000',
      {
        type: 'principal',
        value: 'SP000000000000000000002Q6VF78',
      },
    ],
  ])('converts %s', (hex, expected) => {
    expect(clarity.cvToJSON(clarity.hexToCV(hex as string))).toEqual(expected);
  });
});

describe('stacks.js ABI display vectors', () => {
  test.each([
    ['int128', 'int'],
    ['uint128', 'uint'],
    ['bool', 'bool'],
    ['principal', 'principal'],
    ['trait_reference', 'trait_reference'],
    ['none', 'none'],
    [
      {
        buffer: {
          length: 8,
        },
      },
      '(buff 8)',
    ],
    [
      {
        'string-ascii': {
          length: 10,
        },
      },
      '(string-ascii 10)',
    ],
    [
      {
        'string-utf8': {
          length: 4,
        },
      },
      '(string-utf8 4)',
    ],
    [
      {
        optional: 'uint128',
      },
      '(optional uint)',
    ],
    [
      {
        response: {
          ok: 'uint128',
          error: 'bool',
        },
      },
      '(response uint bool)',
    ],
    [
      {
        tuple: [
          {
            name: 'count',
            type: 'uint128',
          },
        ],
      },
      '(tuple (count uint))',
    ],
    [
      {
        list: {
          length: 3,
          type: 'bool',
        },
      },
      '(list 3 bool)',
    ],
  ])('formats %j', (type, expected) => {
    expect(clarity.getTypeString(type as clarity.ClarityAbiType)).toBe(expected);
  });
});
