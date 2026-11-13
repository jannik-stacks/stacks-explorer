import { postConditionModeFromName } from '../post-condition-mode-utils';

describe('post condition mode names', () => {
  test('round-trips every mode, including originator', () => {
    ['allow', 'deny', 'originator'].forEach(mode => {
      expect(postConditionModeFromName(mode)).toBe(mode);
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
