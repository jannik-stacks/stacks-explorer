import { TupleValueType } from '@/app/sandbox/types/values';
import { formatAbiType } from '@/common/utils/clarity-display';
import { Input } from '@/ui/Input';
import { Field, HStack, Stack } from '@chakra-ui/react';
import { ClarityAbiType } from '@jannik-stacks/kit';
import { FC } from 'react';

import { CommonArgumentInputProps } from './types';

export const TupleArgumentInput: FC<
  CommonArgumentInputProps & {
    type: Extract<ClarityAbiType, { tuple: unknown }>;
    value: TupleValueType;
    tuple: Extract<ClarityAbiType, { tuple: unknown }>['tuple'];
  }
> = ({ name, type, handleChange, error, value, tuple }) => {
  const isOptional = typeof type === 'object' && 'optional' in type;
  const tupleType = isOptional
    ? (type.optional as Extract<ClarityAbiType, { tuple: unknown }>)
    : type;
  return (
    <Field.Root w="full" invalid={!!error}>
      <HStack id={name} gap={4} width="100%">
        {tuple.map((tupleEntry, i) => (
          <Stack gap={2} w="full">
            <Field.Label textStyle="text-regular-sm" color={error ? 'textError' : 'textSecondary'}>
              {`${name}: ${tupleEntry.name}${isOptional ? ' (optional)' : ''}`}
            </Field.Label>
            <Input
              variant="redesignPrimary"
              width="full"
              type="text"
              name={`${name}.${tupleEntry.name}`}
              id={`${name}.${tupleEntry.name}`}
              onChange={handleChange}
              value={value[tupleEntry.name]}
              placeholder={`${formatAbiType(tupleType.tuple[i].type)}`}
            />
          </Stack>
        ))}
      </HStack>
      <Field.ErrorText color={'textError'} textStyle="text-medium-xs">
        {error}
      </Field.ErrorText>
    </Field.Root>
  );
};
