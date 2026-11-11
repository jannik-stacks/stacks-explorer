import { PostConditionMode } from '@/common/utils/fixtures/stacks-behavior/sdk-constants';

import { postConditionModeFromName, postConditionModeNames } from '../post-condition-mode-utils';

describe('post condition mode names', () => {
  test('round-trips every mode, including originator', () => {
    Object.values(PostConditionMode)
      .filter((mode): mode is PostConditionMode => typeof mode === 'number')
      .forEach(mode => {
        expect(postConditionModeFromName(postConditionModeNames[mode])).toBe(mode);
      });
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

it('pins the wire mode numbers and wallet names', () => {
  expect(postConditionModeNames).toEqual({ 1: 'allow', 2: 'deny', 3: 'originator' });
  expect(['allow', 'deny', 'originator'].map(postConditionModeFromName)).toEqual([1, 2, 3]);
});
