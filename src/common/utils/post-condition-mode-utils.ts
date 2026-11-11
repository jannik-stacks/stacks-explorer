import { StacksTransaction } from '@jannik-stacks/kit';

export function postConditionModeFromName(
  name: string | undefined
): NonNullable<StacksTransaction['postConditionMode']> | undefined {
  return name === 'allow' || name === 'deny' || name === 'originator' ? name : undefined;
}

export const postConditionModeOptions: {
  value: NonNullable<StacksTransaction['postConditionMode']>;
  label: string;
}[] = [
  { value: 'allow', label: 'Allow mode' },
  { value: 'originator', label: 'Originator mode' },
  { value: 'deny', label: 'Deny mode' },
];

export const postConditionModeDescriptions: Record<
  NonNullable<StacksTransaction['postConditionMode']>,
  string
> = {
  ['allow']:
    'The post-conditions listed below are still enforced, but transfers they do not cover are permitted too. It is the least restrictive mode.',
  ['originator']:
    'Originator mode requires every asset transfer out of your account to be covered by a post-condition listed below. Transfers between other accounts, such as contracts, are unrestricted.',
  ['deny']:
    'Deny mode only permits the asset transfers explicitly listed in the post-conditions below. Any transfer that is not listed will cause the transaction to fail.',
};
