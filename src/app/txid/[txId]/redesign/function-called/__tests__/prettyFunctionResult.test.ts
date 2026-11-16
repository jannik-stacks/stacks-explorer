/** @jest-environment node */
import clarityVectors from '@/common/utils/fixtures/stacks-behavior/clarity.json';

import { prettyFunctionResult } from '../utils';

describe('prettyFunctionResult', () => {
  it('returns the pretty-printed clarity value on success', () => {
    expect(prettyFunctionResult('0x010000000000000000000000000000002a')).toEqual({
      display: 'u42',
      decoded: true,
      success: undefined,
    });
  });

  it('reports response-ok status', () => {
    const result = prettyFunctionResult('0x070100000000000000000000000000000001');
    expect(result.decoded).toBe(true);
    expect(result.success).toBe(true);
  });

  it('reports response-err status', () => {
    const result = prettyFunctionResult('0x080100000000000000000000000000000001');
    expect(result.decoded).toBe(true);
    expect(result.success).toBe(false);
  });

  it('returns the full raw hex in the fallback on malformed input', () => {
    const result = prettyFunctionResult('not-hex');
    expect(result.decoded).toBe(false);
    expect(result.display).toBe('Unable to decode value:\nnot-hex');
  });
});

it.each(clarityVectors)('pretty prints captured $name', ({ hex }) => {
  expect(prettyFunctionResult(hex)).toMatchSnapshot();
  expect(prettyFunctionResult(hex.slice(2))).toEqual(prettyFunctionResult(hex));
});
