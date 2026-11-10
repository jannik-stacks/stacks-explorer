import { Address, Codec, Cl as KitCl, STACKS_MAINNET, STACKS_TESTNET } from '@jannik-stacks/kit';
import type {
  ClarityAbiType,
  ClarityValue,
  PostCondition as KitPostCondition,
} from '@jannik-stacks/kit';

export type {
  ClarityAbiFunction,
  ClarityAbiType,
  ClarityValue,
  FungibleComparator,
  NonFungibleComparator,
  PoxComparator,
} from '@jannik-stacks/kit';
export { STACKS_MAINNET, STACKS_TESTNET };
export const ChainId = { Mainnet: STACKS_MAINNET.chainId, Testnet: STACKS_TESTNET.chainId };
export type ChainId = number;
export type StacksNetworkName = 'mainnet' | 'testnet' | 'devnet' | 'mocknet';
export type ClarityAbiTypeTuple = Extract<ClarityAbiType, { tuple: unknown }>;
export type ClarityAbiTypeList = Extract<ClarityAbiType, { list: unknown }>;
export type ClarityAbiVariable = {
  name: string;
  type: ClarityAbiType;
  access: 'variable' | 'constant';
};
export type PostConditionModeName = 'allow' | 'deny' | 'originator';
type FormPostCondition<T> = T extends { amount: bigint }
  ? Omit<T, 'amount'> & { amount: string | number | bigint }
  : T;
export type PostCondition = FormPostCondition<KitPostCondition>;
export type StxPostCondition = Extract<PostCondition, { type: 'stx-postcondition' }>;
export type FungiblePostCondition = Extract<PostCondition, { type: 'ft-postcondition' }>;
export type NonFungiblePostCondition = Extract<PostCondition, { type: 'nft-postcondition' }>;
export type StakingPostCondition = Extract<PostCondition, { type: 'staking-postcondition' }>;
export type PoxPostCondition = Extract<PostCondition, { type: 'pox-postcondition' }>;

export enum PostConditionMode {
  Allow = 1,
  Deny = 2,
  Originator = 3,
}

export enum PostConditionType {
  STX = 0,
  Fungible = 1,
  NonFungible = 2,
  Staking = 3,
  PoX = 4,
}

export enum FungibleConditionCode {
  Equal = 1,
  Greater = 2,
  GreaterEqual = 3,
  Less = 4,
  LessEqual = 5,
}

export enum NonFungibleConditionCode {
  Sends = 16,
  DoesNotSend = 17,
  MaybeSent = 18,
}

export enum PoxConditionCode {
  WillNotPerform = 48,
  MayPerform = 49,
  WillPerform = 50,
}

export const ClarityType = { ResponseOk: 'ok', ResponseErr: 'err' } as const;
export const uintCV = KitCl.uint;
export const noneCV = KitCl.none;
export const someCV = KitCl.some;
export const trueCV = KitCl.true;
export const tupleCV = KitCl.tuple;
export const listCV = KitCl.list;
export const responseOkCV = KitCl.ok;
export const responseErrorCV = KitCl.err;
export const bufferCVFromString = (value: string) => KitCl.buffer(new TextEncoder().encode(value));
export const cvToHex = (value: ClarityValue) => '0x' + KitCl.serialize(value);
export const hexToCV = KitCl.deserialize;
export const deserializeCV = (value: string | Uint8Array) =>
  KitCl.deserialize(typeof value === 'string' ? value : bytesToHex(value));
export const deserialize = hexToCV;
export const asciiToBytes = (value: string) => Uint8Array.from(value, char => char.charCodeAt(0));
export const bytesToHex = (value: Uint8Array) =>
  Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');

export const isClarityAbiPrimitive = (
  type: ClarityAbiType
): type is Extract<ClarityAbiType, string> => typeof type === 'string';
export const isClarityAbiOptional = (
  type: ClarityAbiType
): type is Extract<ClarityAbiType, { optional: unknown }> =>
  typeof type === 'object' && 'optional' in type;
export const isClarityAbiTuple = (type: ClarityAbiType): type is ClarityAbiTypeTuple =>
  typeof type === 'object' && 'tuple' in type;
export const isClarityAbiList = (type: ClarityAbiType): type is ClarityAbiTypeList =>
  typeof type === 'object' && 'list' in type;

export function validateStacksAddress(address: string): boolean {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}

export function encodeAbiClarityValue(value: string, type: ClarityAbiType): ClarityValue {
  if (isClarityAbiOptional(type)) return KitCl.some(encodeAbiClarityValue(value, type.optional));
  if (type === 'uint128') {
    const number = BigInt(value);
    if (number < BigInt(0) || number >= BigInt('340282366920938463463374607431768211456'))
      throw new Error('Invalid uint128 value');
    return KitCl.uint(number);
  }
  if (type === 'int128') {
    const number = value.toLowerCase().startsWith('0x')
      ? BigInt.asIntN(Math.ceil((value.length - 2) / 2) * 8, BigInt(value))
      : BigInt(value);
    if (
      number < BigInt('-170141183460469231731687303715884105728') ||
      number > BigInt('170141183460469231731687303715884105727')
    )
      throw new Error('Invalid int128 value');
    return KitCl.int(number);
  }
  if (type === 'bool') {
    if (!['true', 'false', '0', '1'].includes(value))
      throw new Error('Unexpected Clarity bool value: ' + JSON.stringify(value));
    return KitCl.bool(value === 'true' || value === '1');
  }
  if (type === 'principal' || type === 'trait_reference') {
    if (!validateStacksAddress(value.split('.')[0])) throw new Error('Invalid Stacks address');
    return KitCl.principal(value);
  }
  if (type === 'none') return KitCl.none();
  if (typeof type === 'object') {
    if ('buffer' in type) return KitCl.buffer(value);
    if ('string-ascii' in type) return KitCl.ascii(value);
    if ('string-utf8' in type) return KitCl.utf8(value);
  }
  throw new Error('Unsupported encoding for Clarity type');
}

export function getTypeString(type: ClarityAbiType): string {
  if (typeof type === 'string')
    return type === 'uint128' ? 'uint' : type === 'int128' ? 'int' : type;
  if ('buffer' in type) return '(buff ' + type.buffer.length + ')';
  if ('string-ascii' in type) return '(string-ascii ' + type['string-ascii'].length + ')';
  if ('string-utf8' in type) return '(string-utf8 ' + type['string-utf8'].length + ')';
  if ('optional' in type) return '(optional ' + getTypeString(type.optional) + ')';
  if ('response' in type)
    return (
      '(response ' +
      getTypeString(type.response.ok) +
      ' ' +
      getTypeString(type.response.error) +
      ')'
    );
  if ('list' in type)
    return '(list ' + type.list.length + ' ' + getTypeString(type.list.type) + ')';
  return (
    '(tuple ' +
    type.tuple.map(entry => '(' + entry.name + ' ' + getTypeString(entry.type) + ')').join(' ') +
    ')'
  );
}

function valueType(value: ClarityValue): string {
  switch (value.type) {
    case 'true':
    case 'false':
      return 'bool';
    case 'address':
    case 'contract':
      return 'principal';
    case 'buffer':
      return '(buff ' + Math.ceil(value.value.length / 2) + ')';
    case 'ascii':
      return '(string-ascii ' + value.value.length + ')';
    case 'utf8':
      return '(string-utf8 ' + new TextEncoder().encode(value.value).length + ')';
    case 'none':
      return '(optional none)';
    case 'some':
      return '(optional ' + valueType(value.value) + ')';
    case 'ok':
      return '(response ' + valueType(value.value) + ' UnknownType)';
    case 'err':
      return '(response UnknownType ' + valueType(value.value) + ')';
    case 'list':
      return (
        '(list ' +
        value.value.length +
        ' ' +
        (value.value.length ? valueType(value.value[0]) : 'UnknownType') +
        ')'
      );
    case 'tuple':
      return (
        '(tuple ' +
        Object.entries(value.value)
          .map(([key, entry]) => '(' + key + ' ' + valueType(entry) + ')')
          .join(' ') +
        ')'
      );
    default:
      return value.type;
  }
}

export function cvToJSON(cv: ClarityValue): any {
  let value: any;
  switch (cv.type) {
    case 'true':
      value = true;
      break;
    case 'false':
      value = false;
      break;
    case 'none':
      value = null;
      break;
    case 'int':
    case 'uint':
      value = cv.value.toString();
      break;
    case 'buffer':
      value = '0x' + cv.value;
      break;
    case 'ok':
    case 'err':
    case 'some':
      value = cvToJSON(cv.value);
      break;
    case 'list':
      value = cv.value.map(cvToJSON);
      break;
    case 'tuple':
      value = Object.fromEntries(
        Object.entries(cv.value).map(([key, entry]) => [key, cvToJSON(entry)])
      );
      break;
    default:
      value = cv.value;
  }
  return {
    type: valueType(cv),
    value,
    ...(cv.type === 'ok' || cv.type === 'err' ? { success: cv.type === 'ok' } : {}),
  };
}

export function cvToString(cv: ClarityValue): string {
  switch (cv.type) {
    case 'address':
    case 'contract':
      return cv.value;
    case 'ascii':
      return '"' + cv.value + '"';
    case 'utf8':
      return 'u"' + cv.value + '"';
    case 'some':
    case 'ok':
    case 'err':
      return '(' + cv.type + ' ' + cvToString(cv.value) + ')';
    case 'list':
      return '(list ' + cv.value.map(cvToString).join(' ') + ')';
    case 'tuple':
      return (
        '(tuple ' +
        Object.entries(cv.value)
          .map(([key, entry]) => '(' + key + ' ' + cvToString(entry) + ')')
          .join(' ') +
        ')'
      );
    default:
      return KitCl.stringify(cv);
  }
}

export function prettyPrint(cv: ClarityValue, space = 0, depth = 0): string {
  const gap = (end = false) => (space ? '\n' + ' '.repeat(space * (depth + (end ? 0 : 1))) : ' ');
  switch (cv.type) {
    case 'some':
    case 'ok':
    case 'err':
      return '(' + cv.type + ' ' + prettyPrint(cv.value, space, depth) + ')';
    case 'list':
      return cv.value.length
        ? '(list' +
            gap() +
            cv.value.map(entry => prettyPrint(entry, space, depth + 1)).join(gap()) +
            (space ? gap(true) : '') +
            ')'
        : '(list)';
    case 'tuple':
      return Object.keys(cv.value).length
        ? '{' +
            gap() +
            Object.entries(cv.value)
              .map(([key, entry]) => key + ': ' + prettyPrint(entry, space, depth + 1))
              .sort()
              .join(',' + gap()) +
            gap(true) +
            '}'
        : '{}';
    default:
      return KitCl.stringify(cv);
  }
}

export const Cl = {
  ...KitCl,
  stringAscii: KitCl.ascii,
  stringUtf8: KitCl.utf8,
  stringify: prettyPrint,
};

export function postConditionToHex(condition: PostCondition): string {
  const value =
    'amount' in condition ? { ...condition, amount: BigInt(condition.amount) } : condition;
  return Codec.Raw.PostCondition.encode(value as KitPostCondition);
}
