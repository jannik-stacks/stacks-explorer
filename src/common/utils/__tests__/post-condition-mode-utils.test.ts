/** @jest-environment node */
import { Tx } from '@jannik-stacks/kit';

import { postConditionModeFromName } from '../post-condition-mode-utils';

describe('post condition mode names', () => {
  test.each([
    ['allow', '01'],
    ['deny', '02'],
    ['originator', '03'],
  ] as const)('pins the wire mode numbers and wallet names: %s', (mode, wire) => {
    const postConditionMode = postConditionModeFromName(mode);
    expect(postConditionMode).toBe(mode);
    const hex = Tx.from({
      type: 'transfer',
      network: 'mainnet',
      recipient: 'SP000000000000000000002Q6VF78',
      amount: BigInt(1),
      fee: BigInt(0),
      nonce: BigInt(0),
      postConditionMode,
    }).toHex();
    expect(hex.slice(220, 222)).toBe(wire);
  });

  test('returns undefined for a name that is not a mode', () => {
    expect(postConditionModeFromName('bogus')).toBeUndefined();
    expect(postConditionModeFromName(undefined)).toBeUndefined();
  });

  test('does not resolve inherited object members', () => {
    expect(postConditionModeFromName('constructor')).toBeUndefined();
    expect(postConditionModeFromName('toString')).toBeUndefined();
    expect(postConditionModeFromName('__proto__')).toBeUndefined();
  });
});

it('post-condition mode descriptions and UI options remain stable', () => {
  const {
    postConditionModeOptions,
    postConditionModeDescriptions,
  } = require('../post-condition-mode-utils');
  expect({
    options: postConditionModeOptions,
    descriptions: postConditionModeDescriptions,
  }).toMatchSnapshot();
});
