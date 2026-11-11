'use client';

import { logError } from '@/common/utils/error-utils';
import { Cl, ClarityValue, Codec, PostCondition, StacksTransaction } from '@jannik-stacks/kit';

import { request } from '@stacks/connect';
import { NetworkString } from '@stacks/connect/dist/types/methods';

const formatClarityArgs = (args: (number | string | boolean | ClarityValue)[]): ClarityValue[] => {
  return args.map(arg => {
    if (typeof arg === 'number') {
      return Cl.uint(arg);
    }
    if (typeof arg === 'string') {
      return Cl.ascii(arg);
    }
    if (typeof arg === 'boolean') {
      return Cl.bool(arg);
    }
    return arg;
  });
};

const handleUserRejection = (error: any, operation: string) => {
  if (error?.message?.includes('User rejected') || error?.message?.includes('rejected')) {
    return null;
  }
  logError(error, `Sandbox ${operation}`, { operation }, 'error');
  throw error;
};

export const transferStx = async (params: {
  recipient: string;
  amount: string;
  memo?: string;
  network?: string;
}) => {
  try {
    const response = await request('stx_transferStx', {
      recipient: params.recipient,
      amount: params.amount,
      memo: params.memo || '',
      network: params.network || 'mainnet',
    });

    return response;
  } catch (error: any) {
    return handleUserRejection(error, 'STX transfer');
  }
};

export const deployContract = async (params: {
  name: string;
  clarityCode: string;
  clarityVersion?: number;
  network?: string;
}) => {
  try {
    const response = await request('stx_deployContract', {
      name: params.name,
      clarityCode: params.clarityCode,
      clarityVersion: params.clarityVersion || 4,
      network: params.network || 'mainnet',
      postConditionMode: 'allow',
    });

    return response;
  } catch (error: any) {
    return handleUserRejection(error, 'contract deployment');
  }
};

export const callContract = async (params: {
  contract: string;
  functionName: string;
  functionArgs: (number | string | boolean | ClarityValue)[];
  network?: string | NetworkString;
  postConditions?: string[] | PostCondition[];
  postConditionMode?: NonNullable<StacksTransaction['postConditionMode']>;
}) => {
  try {
    const clarityArgs = formatClarityArgs(params.functionArgs);

    const response = await request('stx_callContract', {
      contract: params.contract as `${string}.${string}`,
      functionName: params.functionName,
      functionArgs: clarityArgs.map(arg => `0x${Cl.serialize(arg)}`),
      network: params.network || 'mainnet',
      postConditions: params.postConditions?.map(postCondition =>
        typeof postCondition === 'string'
          ? postCondition
          : Codec.Raw.PostCondition.encode(postCondition)
      ),
      postConditionMode: params.postConditionMode,
    });

    return response;
  } catch (error: any) {
    return handleUserRejection(error, 'contract call');
  }
};

export const signMessage = async (params: { message: string }) => {
  try {
    const response = await request('stx_signMessage', {
      message: params.message,
    });

    return response;
  } catch (error: any) {
    return handleUserRejection(error, 'message signing');
  }
};

export const getAddresses = async () => {
  try {
    const response = await request('getAddresses');
    return response.addresses;
  } catch (error: any) {
    return handleUserRejection(error, 'get addresses');
  }
};

export const parseClarityValue = (clarityValue: any) => {
  if (typeof clarityValue === 'object' && clarityValue !== null) {
    return {
      type: clarityValue.type,
      value: clarityValue.value,
    };
  }
  return clarityValue;
};
