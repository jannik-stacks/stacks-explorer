import { TxDetailsOf } from '@/common/types/tx-v3';
import {
  describeClarityType,
  displayClarityValue,
  formatAbiType,
  prettyClarityValue,
} from '@/common/utils/clarity-display';
import { Cl, ClarityAbiFunction, ClarityValue as KitValue } from '@jannik-stacks/kit';

export interface PrettyFunctionResult {
  display: string;
  decoded: boolean;
  success?: boolean;
}

export function prettyFunctionResult(hex: string): PrettyFunctionResult {
  try {
    const cv = Cl.deserialize(hex);
    const display = prettyClarityValue(cv, 2);
    let success: boolean | undefined;
    if (cv.type === 'ok') success = true;
    else if (cv.type === 'err') success = false;
    return { display, decoded: true, success };
  } catch {
    return { display: `Unable to decode value:\n${hex}`, decoded: false };
  }
}

/**
 * Returns true if the type string is a tuple type ('tuple' or '(tuple ...)').
 * Returns false for list, response, and optional types that wrap tuples.
 */
export function isTupleType(type: string | undefined): boolean {
  if (!type) return false;
  return type === 'tuple' || type.startsWith('(tuple');
}

const formatClarityValueType = (type: string) => {
  if (type === 'bool' || type === 'int' || type === 'principal' || type === 'uint') {
    switch (type) {
      case 'bool':
        return 'Boolean';
      case 'int':
        return 'Integer';
      case 'principal':
        return 'Principal';
      case 'uint':
        return 'Unsigned Integer';
    }
  }

  if (isTupleType(type)) {
    return 'Tuple';
  }
  return type;
};

const tupleToArr = (
  tuple: string // TODO: add tests for this
) => {
  return tuple
    .replace('(tuple (', '')
    .replace('))', '')
    .split(') (')
    .map(item => item.split(' '));
};

function formatTupleResult(tuple: string) {
  // TODO: add tests for this
  const tupleArr = tupleToArr(tuple);
  let result = '';
  tupleArr.forEach((entry: any, index: number) => {
    if (entry && entry.length) {
      const key = entry?.[0]?.replace(/\(/g, '');
      const value = entry?.[1]?.replace(/\)/g, '');
      result += `${key}: ${value}`;

      if (index !== tuple.length - 1) {
        result += ', ';
      }
    }
  });

  return result;
}

export function formatFunctionArg(arg: ContractCallTxFunctionArg) {
  return formatClarityValue(arg);
}

type ClarityValue = {
  // TODO: This invented type does not seem well typed
  type: string;
  repr: string | number;
  name?: string;
  hex?: string;
};

// TODO: add tests for this
// I extracted this monstrosity from the old logic in FunctionSummaryClarityValue, which didn't have any type safety checks
// wrap this function in a try catch
export function formatClarityValue(cv: ClarityValue): FormattedClarityValue {
  let value: string | number = cv.repr;
  if (cv.type === 'principal') {
    const principal: string = cv.hex
      ? (Cl.deserialize(cv.hex) as Extract<KitValue, { type: 'address' | 'contract' }>).value
      : '';
    const isContract = principal.includes('.');
    // remove the extra single quote from repr
    value = isContract ? principal : principal || cv.repr.toString().replace(/^'/, '');
  }
  if (cv.type === 'uint' && typeof cv.repr === 'string') {
    value = Number(cv.repr.replace('u', '')).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
  }
  if (isTupleType(cv.type) && typeof cv.repr === 'string') {
    value = formatTupleResult(cv.repr);
  }

  return {
    name: cv.name || '',
    value: value.toString(),
    type: formatClarityValueType(cv.type),
  };
}

type ContractCallTxFunctionArg = ClarityValue;

/** A Clarity value as the API encodes it: hex plus its Clarity representation. */
type ContractCallTxResult = { hex: string; repr: string };

export interface FormattedClarityValue {
  name: string;
  value: string;
  type: string;
}

export interface FormattedFunctionResult {
  success: boolean;
  type: string;
  value: string;
}

export function formatFunctionResult(result: ContractCallTxResult): FormattedClarityValue[] {
  const cv = Cl.deserialize(result.hex);
  const inner = cv.type === 'ok' || cv.type === 'err' || cv.type === 'some' ? cv.value : undefined;
  if (inner?.type === 'tuple') {
    return Object.entries(inner.value).map(([name, entry]) =>
      formatClarityValue({
        name,
        type: describeClarityType(entry),
        repr: resultEntryDisplay(entry),
      })
    );
  }
  return [
    formatClarityValue({
      type: describeClarityType(cv).replace('UnknownType', '').trim(),
      repr: result.repr,
    }),
  ];
}

function resultEntryDisplay(cv: KitValue): string {
  if (
    cv.type === 'int' ||
    cv.type === 'uint' ||
    cv.type === 'address' ||
    cv.type === 'contract' ||
    cv.type === 'ascii' ||
    cv.type === 'utf8'
  )
    return cv.value.toString();
  if (cv.type === 'buffer') return `0x${cv.value}`;
  if (cv.type === 'true' || cv.type === 'false') return cv.type;
  if (cv.type === 'none') return 'none';
  if (cv.type === 'list') return cv.value.map(value => resultEntryDisplay(value)).join(', ');
  if (cv.type === 'tuple') {
    const displayField = (value: KitValue): unknown => ({
      type: describeClarityType(value),
      value:
        value.type === 'none'
          ? null
          : value.type === 'tuple'
            ? Object.fromEntries(
                Object.entries(value.value).map(([key, field]) => [key, displayField(field)])
              )
            : value.type === 'some' || value.type === 'ok' || value.type === 'err'
              ? displayField(value.value)
              : value.type === 'list'
                ? value.value.map(displayField)
                : value.type === 'true'
                  ? true
                  : value.type === 'false'
                    ? false
                    : value.type === 'buffer'
                      ? `0x${value.value}`
                      : value.value.toString(),
    });
    return JSON.stringify(
      Object.fromEntries(Object.entries(cv.value).map(([key, value]) => [key, displayField(value)]))
    );
  }
  return displayClarityValue(cv);
}

/**
 * The v3 API encodes contract call arguments without their names or types, so those come from the
 * called function's ABI, matched by position.
 */
export function getContractCallTxFunctionArgs(
  tx: TxDetailsOf<'contract_call'>,
  functionAbi?: ClarityAbiFunction
): ContractCallTxFunctionArg[] {
  const args = (tx?.contract_call?.function_args || []).filter(arg => !!arg);
  return args.map((arg, index) => {
    const abiArg = functionAbi?.args?.[index];
    return {
      hex: arg.hex,
      repr: arg.repr,
      name: abiArg?.name ?? '',
      type: abiArg ? formatAbiType(abiArg.type) : '',
    };
  });
}

export function getFunctionResultSuccessStatus(result: ContractCallTxResult) {
  const cv = Cl.deserialize(result.hex);
  return cv.type === 'ok' ? true : cv.type === 'err' ? false : undefined;
}
