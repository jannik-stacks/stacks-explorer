'use client';

import { displayClarityValue } from '@/common/utils/clarity-display';
import { Cl, ClarityAbiType, ClarityValue, encodeClarityArg } from '@jannik-stacks/kit';

import { ReadOnlyResponse } from '../../common/types/ReadOnlyResponse';
import { TupleValueType } from './types/values';

export const parseReadOnlyResponse = ({ result }: ReadOnlyResponse) => {
  const clarityValue = Cl.deserialize(result);
  return displayClarityValue(clarityValue);
};

export interface ParsedHexClarityValue {
  display: string;
  parsed: boolean;
}

export const parseHexClarityValue = (hex: string): ParsedHexClarityValue => {
  try {
    return { display: displayClarityValue(Cl.deserialize(hex)), parsed: true };
  } catch {
    return { display: hex, parsed: false };
  }
};

export const getTuple = (
  type?: ClarityAbiType
): Extract<ClarityAbiType, { tuple: unknown }>['tuple'] | undefined => {
  if (!type) return;
  const isTuple = typeof type === 'object' && 'tuple' in type;
  if (isTuple) return type?.tuple;
  const isOptional = typeof type === 'object' && 'optional' in type;
  if (isOptional && typeof type?.optional === 'object' && 'tuple' in type?.optional)
    return type?.optional?.tuple;
};

export const encodeTuple = (
  tuple: Extract<ClarityAbiType, { tuple: unknown }>['tuple'],
  value: TupleValueType
): ClarityValue => {
  const tupleData = tuple.reduce(
    (acc, tupleEntry) => {
      const optionalType = typeof tupleEntry.type === 'object' && 'optional' in tupleEntry.type;
      const type = tupleEntry.type;
      acc[tupleEntry.name] = optionalType
        ? !!value[tupleEntry.name]
          ? encodeFormValue(value[tupleEntry.name].toString(), type)
          : Cl.none()
        : encodeFormValue(value[tupleEntry.name].toString(), type);
      return acc;
    },
    {} as Record<string, ClarityValue>
  );
  return Cl.tuple(tupleData);
};

export const encodeOptional = (optionalType: ClarityAbiType, value: string): ClarityValue => {
  if (value) {
    try {
      return Cl.some(encodeFormValue(value, optionalType));
    } catch (e) {
      return Cl.none();
    }
  } else {
    return Cl.none();
  }
};

const allValuesNotEmpty = (value: TupleValueType) => {
  return Object.values(value).reduce((previous, value) => previous && value !== '', true);
};

export const encodeOptionalTuple = (
  optionalType: Extract<ClarityAbiType, { tuple: unknown }>['tuple'],
  value: TupleValueType
): ClarityValue => {
  if (allValuesNotEmpty(value)) {
    return Cl.some(encodeTuple(optionalType, value));
  } else {
    return Cl.none();
  }
};

export function encodeFormValue(value: string, type: ClarityAbiType): ClarityValue {
  if (typeof type === 'object' && 'optional' in type)
    return Cl.some(encodeFormValue(value, type.optional));
  let input: unknown = value;
  if (type === 'trait_reference' || (type === 'principal' && value.includes('.'))) {
    const [address, name] = value.split('.');
    input = `${address}.${name}`;
  }
  if (type === 'bool') {
    if (!['true', 'false', '0', '1'].includes(value)) throw new Error('Invalid boolean');
    input = value === 'true' || value === '1';
  }
  if (type === 'none') input = null;
  const cv = encodeClarityArg(type, input, '');
  Cl.serialize(cv);
  return cv;
}

export function encodeMemoInput(value: string): string {
  return value
    .split('')
    .map(char => (char.charCodeAt(0) & 0xff).toString(16).padStart(2, '0'))
    .join('');
}
