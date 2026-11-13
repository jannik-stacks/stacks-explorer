import {
  ListValueType,
  NonTupleValueType,
  TupleValueType,
  isListValueType,
  isNonTupleValueType,
  isTupleValueType,
} from '@/app/sandbox/types/values';
import { encodeFormValue, encodeMemoInput } from '@/app/sandbox/utils';
import { encodeOptional, encodeOptionalTuple, encodeTuple, getTuple } from '@/app/sandbox/utils';
import { callContract } from '@/app/sandbox/utils/walletTransactions';
import { PRINCIPAL_MEMPOOL_TX_SUMMARIES_INFINITE_KEY } from '@/common/queries/useMempoolTxSummaries';
import { isUint128 } from '@/common/utils/number-utils';
import { validateStacksAddress, validateStacksContractId } from '@/common/utils/utils';
import {
  Cl,
  ClarityAbiFunction,
  ClarityAbiType,
  ClarityValue,
  StacksTransaction,
} from '@jannik-stacks/kit';
import { QueryClient } from '@tanstack/react-query';

import { NetworkString } from '@stacks/connect/dist/types/methods';

import { FunctionFormikState, FunctionParameters } from './FunctionCallForm';
import {
  PostConditionParameters,
  getPostCondition,
  isPostConditionParameter,
} from './function-call-post-condition-params-utils';

export function processFunctionParameters(
  functionParameters: FunctionParameters,
  fnAbi: ClarityAbiFunction
): Record<string, ClarityValue> {
  const final: Record<string, ClarityValue> = {};

  Object.keys(functionParameters).forEach(arg => {
    const type = fnAbi.args.find(({ name }) => name === arg)?.type;
    if (!type) return;

    const tuple = getTuple(type);
    const isList = typeof type === 'object' && 'list' in type;
    const optionalType =
      typeof type === 'object' && 'optional' in type ? type?.optional : undefined;

    if (tuple && isTupleValueType(functionParameters[arg])) {
      final[arg] = optionalType
        ? encodeOptionalTuple(tuple, functionParameters[arg])
        : encodeTuple(tuple, functionParameters[arg]);
    } else if (isList && isListValueType(functionParameters[arg])) {
      final[arg] = processListValue(functionParameters[arg], type);
    } else if (optionalType && isNonTupleValueType(functionParameters[arg])) {
      final[arg] = processOptionalValue(arg, functionParameters[arg], optionalType);
    } else {
      final[arg] = encodeFormValue(functionParameters[arg].toString(), type);
    }
  });

  return final;
}

export function processListValue(
  listValues: ListValueType,
  type: Extract<ClarityAbiType, { list: unknown }>
): ClarityValue {
  const listType = type.list.type;
  const optionalListType =
    typeof listType === 'object' && 'optional' in listType ? listType?.optional : undefined;
  const listTuple = getTuple(listType);

  const listData = listValues.map(listValue =>
    listTuple
      ? encodeTuple(listTuple, listValue as TupleValueType)
      : encodeFormValue((listValue as NonTupleValueType).toString(), optionalListType || listType)
  );

  return Cl.list(listData);
}

export function processOptionalValue(
  arg: string,
  value: NonTupleValueType,
  optionalType: ClarityAbiType
): ClarityValue {
  const val = arg === 'memo' ? encodeMemoInput(value.toString()) : value;
  return encodeOptional(optionalType, val.toString());
}

export const isPublicFunction = (fnAbi: ClarityAbiFunction) => fnAbi.access === 'public';
export const shouldUsePostConditions = (
  mode: NonNullable<StacksTransaction['postConditionMode']>
) => mode !== 'allow';

export function extractFunctionParams(values: FunctionFormikState): FunctionParameters {
  const functionParams: FunctionParameters = {};

  Object.keys(values).forEach(key => {
    if (!isPostConditionParameter(key)) {
      functionParams[key] = values[key];
    }
  });

  return functionParams;
}

export interface ContractCallDependencies {
  contractId: string;
  fnAbi: ClarityAbiFunction;
  network: string | NetworkString;
  queryClient: QueryClient;
}

export async function handlePublicFunctionCall(
  final: Record<string, ClarityValue>,
  postConditionParams: PostConditionParameters,
  { contractId, fnAbi, network, queryClient }: ContractCallDependencies
): Promise<void> {
  const postCondition = shouldUsePostConditions(postConditionParams.postConditionMode)
    ? getPostCondition(postConditionParams)
    : undefined;
  const functionArgs = Object.values(final);

  await callContract({
    contract: contractId,
    functionName: fnAbi.name,
    functionArgs,
    network: network,
    postConditions: postCondition ? [postCondition] : undefined,
    postConditionMode: postConditionParams.postConditionMode,
  }).then(() => {
    void queryClient.invalidateQueries({ queryKey: ['addressMempoolTxsInfinite'] });
    void queryClient.invalidateQueries({
      queryKey: [PRINCIPAL_MEMPOOL_TX_SUMMARIES_INFINITE_KEY],
      refetchType: 'all',
    });
  });
}

export function createInitialFunctionParameterValues(
  fnAbi: ClarityAbiFunction
): FunctionParameters {
  return fnAbi.args.reduce((argsAcc, arg) => {
    const tuple = getTuple(arg.type);
    const isList = typeof arg.type === 'object' && 'list' in arg.type;
    argsAcc[arg.name] = !!tuple
      ? tuple.reduce(
          (tupleAcc, tupleEntry) => {
            tupleAcc[tupleEntry.name] = '';
            return tupleAcc;
          },
          {} as Record<string, string | number>
        )
      : isList
        ? []
        : '';
    return argsAcc;
  }, {} as FunctionParameters);
}

// Validates the function parameters
export const checkFunctionParameters = (fn: ClarityAbiFunction, values: FunctionParameters) => {
  const errors: Record<string, string> = {};

  Object.keys(values).forEach(arg => {
    const type = fn.args.find(({ name }) => name === arg)?.type;
    const isOptional = type && typeof type === 'object' && 'optional' in type;
    const optionalTypeIsPrincipal =
      isOptional && typeof type.optional === 'string' && type.optional === 'principal';

    // If the argument is not optional and is not provided, add an error
    if (!isOptional && (values[arg] == null || values[arg] === '')) {
      errors[arg] = `${arg} is required`;
      return;
    }

    // Validate principal arguments
    if (type === 'principal' || (optionalTypeIsPrincipal && !!values[arg])) {
      const validPrincipal = validateStacksAddress(
        (values[arg] as NonTupleValueType).toString().split('.')[0]
      );
      if (!validPrincipal) {
        errors[arg] = 'Invalid Stacks address';
        return;
      }
    }

    if (
      (type === 'trait_reference' || (isOptional && type.optional === 'trait_reference')) &&
      values[arg] &&
      !validateStacksContractId(values[arg].toString())
    ) {
      errors[arg] = 'Trait reference must include a valid contract address and name';
      return;
    }

    // Validate uint128 arguments
    if (type === 'uint128' && !isUint128(values[arg] as number)) {
      errors[arg] = 'Invalid uint128 value';
      return;
    }
  });

  return errors;
};
