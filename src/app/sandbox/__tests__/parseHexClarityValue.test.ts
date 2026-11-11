/** @jest-environment node */
import { serializeClarityValues } from '@/common/queries/test-utils/serializeClarityValues';
import clarityVectors from '@/common/utils/fixtures/stacks-behavior/clarity.json';

import {
  encodeOptional,
  encodeOptionalTuple,
  encodeTuple,
  getTuple,
  parseHexClarityValue,
} from '../utils';

describe('parseHexClarityValue', () => {
  it('parses a hex-prefixed clarity value', () => {
    expect(parseHexClarityValue('0x010000000000000000000000000000002a')).toEqual({
      display: 'u42',
      parsed: true,
    });
  });

  it('parses a hex string without 0x prefix', () => {
    const hex = '0x0100000000000000000000000000000007'.slice(2);
    expect(parseHexClarityValue(hex)).toEqual({ display: 'u7', parsed: true });
  });

  it('parses optional none', () => {
    expect(parseHexClarityValue('0x09')).toEqual({ display: 'none', parsed: true });
  });

  it('returns the raw input and parsed=false on malformed hex', () => {
    expect(parseHexClarityValue('not-hex')).toEqual({ display: 'not-hex', parsed: false });
  });
});

it.each(clarityVectors)('decodes captured $name with and without a prefix', ({ hex, repr }) => {
  expect(parseHexClarityValue(hex)).toEqual({ display: repr, parsed: true });
  expect(parseHexClarityValue(hex.slice(2))).toEqual({ display: repr, parsed: true });
});

it.each(['', '0x', 'ff', '0x01', '0x0c00000001', '0xzz', 'xyz'])(
  'preserves malformed input %s',
  hex => expect(parseHexClarityValue(hex)).toEqual({ display: hex, parsed: false })
);

describe('ABI form coercion', () => {
  it.each([
    ['uint128', '0'],
    ['uint128', '340282366920938463463374607431768211455'],
    ['int128', '-170141183460469231731687303715884105728'],
    ['bool', 'true'],
    ['bool', 'false'],
    [{ buffer: { length: 3 } }, '00ff80'],
    [{ 'string-ascii': { length: 10 } }, 'hello'],
    [{ 'string-utf8': { length: 10 } }, 'hé🙂'],
    ['principal', 'SP000000000000000000002Q6VF78.hello'],
  ])('coerces optional values %#', async (type, value) => {
    expect(
      await serializeClarityValues([encodeOptional(type as any, value as string)])
    ).toMatchSnapshot();
  });
  it.each(['', '-1', '340282366920938463463374607431768211456', 'not a number'])(
    'falls back to none for optional uint %s',
    async value => {
      expect(await serializeClarityValues([encodeOptional('uint128', value)])).toEqual(['0x09']);
    }
  );
  it('encodes tuples, optional tuples and optional fields', async () => {
    const tuple = [
      { name: 'amount', type: 'uint128' },
      { name: 'memo', type: { optional: { 'string-ascii': { length: 10 } } } },
    ] as any;
    expect(
      await serializeClarityValues([encodeTuple(tuple, { amount: 42, memo: '' })])
    ).toMatchSnapshot();
    expect(
      await serializeClarityValues([encodeTuple(tuple, { amount: '42', memo: 'hi' })])
    ).toMatchSnapshot();
    expect(
      await serializeClarityValues([encodeOptionalTuple(tuple, { amount: '', memo: 'hi' })])
    ).toEqual(['0x09']);
    expect(
      await serializeClarityValues([encodeOptionalTuple(tuple, { amount: '42', memo: 'hi' })])
    ).toMatchSnapshot();
    expect(() => encodeTuple(tuple, { amount: '-1', memo: '' })).toThrow();
    expect(getTuple({ tuple })).toEqual(tuple);
    expect(getTuple({ optional: { tuple } })).toEqual(tuple);
    expect(getTuple('uint128')).toBeUndefined();
    expect(getTuple()).toBeUndefined();
  });
});

it('retains trait-reference form coercion bytes for a bare address', async () => {
  const { Cl } = await import('@jannik-stacks/kit');
  expect(Cl.serialize(encodeOptional('trait_reference', 'SP000000000000000000002Q6VF78'))).toBe(
    '0a0616000000000000000000000000000000000000000009756e646566696e6564'
  );
});
