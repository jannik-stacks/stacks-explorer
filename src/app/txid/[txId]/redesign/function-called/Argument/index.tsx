'use client';

import { ListValueType, TupleValueType } from '@/app/sandbox/types/values';
import { getTuple } from '@/app/sandbox/utils';
import { ClarityAbiType } from '@jannik-stacks/kit';
import { FC } from 'react';

import { ListArgumentInput } from './ListArgumentInput';
import { PrimitiveArgumentInput } from './PrimitiveArgumentInput';
import { TupleArgumentInput } from './TupleArgumentInput';
import { ArgumentInputProps, CommonArgumentInputProps } from './types';

export const Argument: FC<CommonArgumentInputProps & ArgumentInputProps> = ({
  name,
  type,
  handleChange,
  error,
  value,
}) => {
  const tuple = getTuple(type);
  const isList = typeof type === 'object' && 'list' in type;
  if (isList) {
    return (
      <ListArgumentInput
        name={name}
        type={type}
        handleChange={handleChange}
        error={error}
        value={value as ListValueType}
      />
    );
  }
  if (!!tuple) {
    return (
      <TupleArgumentInput
        name={name}
        type={type as Extract<ClarityAbiType, { tuple: unknown }>}
        handleChange={handleChange}
        error={error}
        value={value as TupleValueType}
        tuple={tuple}
      />
    );
  }
  return (
    <PrimitiveArgumentInput
      name={name}
      type={type}
      handleChange={handleChange}
      error={error}
      value={value as string}
    />
  );
};
