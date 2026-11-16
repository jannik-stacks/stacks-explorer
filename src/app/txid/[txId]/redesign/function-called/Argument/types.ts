import { ListValueType, ValueType } from '@/app/sandbox/types/values';
import { ClarityAbiType } from '@jannik-stacks/kit';
import React from 'react';

export interface ArgumentInputProps {
  type: ClarityAbiType;
  value: ValueType | ListValueType;
}

export interface CommonArgumentInputProps {
  name: string;
  handleChange: (e: React.FormEvent<HTMLInputElement>) => void;
  error: string | undefined;
}
