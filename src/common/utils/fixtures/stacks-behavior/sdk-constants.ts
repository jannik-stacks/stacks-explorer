export const FungibleConditionCode = {
  '1': 'Equal',
  '2': 'Greater',
  '3': 'GreaterEqual',
  '4': 'Less',
  '5': 'LessEqual',
  Equal: 1,
  Greater: 2,
  GreaterEqual: 3,
  Less: 4,
  LessEqual: 5,
} as const;
export type FungibleConditionCode =
  (typeof FungibleConditionCode)[keyof typeof FungibleConditionCode] & number;
export const NonFungibleConditionCode = {
  '16': 'Sends',
  '17': 'DoesNotSend',
  '18': 'MaybeSent',
  Sends: 16,
  DoesNotSend: 17,
  MaybeSent: 18,
} as const;
export type NonFungibleConditionCode =
  (typeof NonFungibleConditionCode)[keyof typeof NonFungibleConditionCode] & number;
export const PostConditionMode = {
  '1': 'Allow',
  '2': 'Deny',
  '3': 'Originator',
  Allow: 1,
  Deny: 2,
  Originator: 3,
} as const;
export type PostConditionMode = (typeof PostConditionMode)[keyof typeof PostConditionMode] & number;
export const PostConditionType = {
  '0': 'STX',
  '1': 'Fungible',
  '2': 'NonFungible',
  '3': 'Staking',
  '4': 'PoX',
  STX: 0,
  Fungible: 1,
  NonFungible: 2,
  Staking: 3,
  PoX: 4,
} as const;
export type PostConditionType = (typeof PostConditionType)[keyof typeof PostConditionType] & number;
export const PoxConditionCode = {
  '48': 'WillNotPerform',
  '49': 'MayPerform',
  '50': 'WillPerform',
  WillNotPerform: 48,
  MayPerform: 49,
  WillPerform: 50,
} as const;
export type PoxConditionCode = (typeof PoxConditionCode)[keyof typeof PoxConditionCode] & number;
