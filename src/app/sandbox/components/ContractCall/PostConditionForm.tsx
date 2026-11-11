import { getPostCondition as buildFormPostCondition } from '@/app/txid/[txId]/redesign/function-called/function-call-post-condition-params-utils';
import { validateStacksAddress } from '@/common/utils/utils';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import {
  Cl,
  ClarityAbiFunction,
  FungibleComparator,
  NonFungibleComparator,
  PostCondition,
  PoxComparator,
  StacksTransaction,
} from '@jannik-stacks/kit';
import { CaretDown } from '@phosphor-icons/react';
import { Field, FormikErrors } from 'formik';
import { useState } from 'react';

import { isUint128 } from '../../../../common/utils/number-utils';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../../../../components/ui/menu';
import { Input } from '../../../../ui/Input';
import { Text } from '../../../../ui/Text';
import { Caption } from '../../../../ui/typography';
import { NonTupleValueType } from '../../types/values';
import { FormikSetFieldValueFunction, FunctionFormikState } from './FunctionView';

type PostConditionConditionCode = FungibleComparator | NonFungibleComparator | PoxComparator;

function isFungibleConditionCode(code: PostConditionConditionCode): code is FungibleComparator {
  return ['eq', 'gt', 'gte', 'lt', 'lte'].includes(code as FungibleComparator);
}

function isNonFungibleConditionCode(
  code: PostConditionConditionCode
): code is NonFungibleComparator {
  return ['sent', 'not-sent', 'maybe-sent'].includes(code as NonFungibleComparator);
}

function isConditionCodeValidForType(
  postConditionType: PostCondition['type'],
  code: PostConditionConditionCode
): boolean {
  if (postConditionType === 'nft-postcondition') {
    return isNonFungibleConditionCode(code);
  }
  if (postConditionType === 'pox-postcondition') {
    return isPoxConditionCode(code);
  }
  return isFungibleConditionCode(code);
}

function isPoxConditionCode(code: PostConditionConditionCode): code is PoxComparator {
  return ['will-not-perform', 'may-perform', 'will-perform'].includes(code as PoxComparator);
}

export interface PostConditionParameters {
  postConditionMode?: NonNullable<StacksTransaction['postConditionMode']>;
  postConditionType?: PostCondition['type'];
  postConditionAddress?: string;
  postConditionConditionCode?: PostConditionConditionCode;
  postConditionAmount?: number;
  postConditionAssetAddress?: string;
  postConditionAssetContractName?: string;
  postConditionAssetName?: string;
}

export type PostConditionParameterKeys = keyof PostConditionParameters;

export const postConditionParameterMap: Record<
  PostCondition['type'],
  PostConditionParameterKeys[]
> = {
  ['stx-postcondition']: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
  ],
  ['ft-postcondition']: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
    'postConditionAssetAddress',
    'postConditionAssetContractName',
    'postConditionAssetName',
  ],
  ['nft-postcondition']: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAssetAddress',
    'postConditionAssetContractName',
    'postConditionAssetName',
  ],
  ['staking-postcondition']: [
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
  ],
  ['pox-postcondition']: ['postConditionAddress', 'postConditionConditionCode'],
};

export function isPostConditionParameter(key: string): key is keyof PostConditionParameters {
  const postConditionKeys: Array<keyof PostConditionParameters> = [
    'postConditionMode',
    'postConditionType',
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
    'postConditionAssetAddress',
    'postConditionAssetContractName',
    'postConditionAssetName',
  ];
  return postConditionKeys.includes(key as keyof PostConditionParameters);
}

export const postConditionParameterLabels: Record<string, string> = {
  postConditionAddress: 'Address',
  postConditionConditionCode: 'Condition Code',
  postConditionAmount: 'Amount',
  postConditionAssetAddress: 'Asset Address',
  postConditionAssetContractName: 'Asset Contract Name',
  postConditionAssetName: 'Asset Name',
};

export const PostConditionOptions: { label: string; value: PostCondition['type'] }[] = [
  { label: 'STX Post Condition', value: 'stx-postcondition' },
  { label: 'Fungible Post Condition', value: 'ft-postcondition' },
  { label: 'Non-Fungible Post Condition', value: 'nft-postcondition' },
  { label: 'Staking Post Condition', value: 'staking-postcondition' },
  { label: 'PoX Post Condition', value: 'pox-postcondition' },
];

export function getPostCondition(
  postConditionParameters: PostConditionParameters
): PostCondition[] {
  const {
    postConditionType,
    postConditionAddress,
    postConditionConditionCode,
    postConditionAmount,
    postConditionAssetAddress,
    postConditionAssetContractName,
    postConditionAssetName,
  } = postConditionParameters;
  let postCondition;

  if (
    postConditionType === 'stx-postcondition' &&
    postConditionAddress &&
    postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = buildFormPostCondition(postConditionParameters);
  } else if (
    postConditionType === 'ft-postcondition' &&
    postConditionAddress &&
    postConditionAssetAddress &&
    postConditionAssetContractName &&
    postConditionAssetName &&
    postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = buildFormPostCondition(postConditionParameters);
  } else if (
    postConditionType === 'nft-postcondition' &&
    postConditionAddress &&
    postConditionAssetAddress &&
    postConditionAssetContractName &&
    postConditionAssetName &&
    postConditionConditionCode &&
    isNonFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = buildFormPostCondition(postConditionParameters);
  } else if (
    postConditionType === 'staking-postcondition' &&
    postConditionAddress &&
    postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  ) {
    postCondition = buildFormPostCondition(postConditionParameters);
  } else if (
    postConditionType === 'pox-postcondition' &&
    postConditionAddress &&
    postConditionConditionCode &&
    isPoxConditionCode(postConditionConditionCode)
  ) {
    postCondition = buildFormPostCondition(postConditionParameters);
  } else if (
    postConditionType !== 'stx-postcondition' &&
    postConditionType !== 'ft-postcondition' &&
    postConditionType !== 'nft-postcondition' &&
    postConditionType !== 'staking-postcondition' &&
    postConditionType !== 'pox-postcondition'
  ) {
    throw new Error(`There is no post condition type that matches ${postConditionType}`);
  }

  return postCondition ? [postCondition as PostCondition] : [];
}

export const checkFunctionParameters = (fn: ClarityAbiFunction, values: FunctionFormikState) => {
  const errors: Record<string, string> = {};
  Object.keys(values).forEach(arg => {
    if (isPostConditionParameter(arg as PostConditionParameterKeys)) return;
    const type = fn.args.find(({ name }) => name === arg)?.type;
    const isOptional = type && typeof type === 'object' && 'optional' in type;
    const optionalTypeIsPrincipal =
      isOptional && typeof type.optional === 'string' && type.optional === 'principal';
    if (!isOptional && (values[arg] == null || values[arg] === '')) {
      errors[arg] = `${arg} is required`;
      return;
    }
    if (type === 'principal' || (optionalTypeIsPrincipal && !!values[arg])) {
      const validPrincipal = validateStacksAddress(
        (values[arg] as NonTupleValueType).toString().split('.')[0]
      );
      if (!validPrincipal) {
        errors[arg] = 'Invalid Stacks address';
        return;
      }
    }
    if (type === 'uint128' && !isUint128(values[arg] as number)) {
      errors[arg] = 'Invalid uint128 value';
      return;
    }
  });
  return errors;
};

export const checkPostConditionParameters = (
  formikState: FunctionFormikState
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (formikState.postConditionMode === 'allow') return errors;
  if (formikState.postConditionType == null) return errors;
  const postConditionParameters =
    postConditionParameterMap[formikState.postConditionType as PostCondition['type']];
  postConditionParameters?.forEach(key => {
    if (formikState[key] == null) {
      errors[key] = `${postConditionParameterLabels[key]} is required`;
      return;
    }
    if (
      (key === 'postConditionAddress' || key === 'postConditionAssetAddress') &&
      !validateStacksAddress(formikState[key].split('.')[0])
    ) {
      errors[key] = 'Invalid Stacks address';
      return;
    }
    if (
      key === 'postConditionConditionCode' &&
      !isConditionCodeValidForType(
        formikState.postConditionType as PostCondition['type'],
        formikState[key]
      )
    ) {
      errors[key] = 'Condition code does not match the selected post condition type';
      return;
    }
    if (key === 'postConditionAmount') {
      if (
        typeof formikState[key] !== 'number' ||
        !Number.isFinite(formikState[key]) ||
        (formikState[key] as number) < 0
      ) {
        errors[key] = 'Invalid amount';
        return;
      }
    }
  });
  return errors;
};

interface Option<T> {
  label: string;
  value: T;
}

function getPostConditionConditionCodeOptions(
  postConditionType: PostCondition['type']
): Option<PostConditionConditionCode>[] {
  if (postConditionType === 'nft-postcondition') {
    return [
      {
        label: 'Does not send',
        value: 'not-sent',
      },
      {
        label: 'Sends',
        value: 'sent',
      },
      {
        label: 'May send',
        value: 'maybe-sent',
      },
    ];
  }
  if (postConditionType === 'pox-postcondition') {
    return [
      {
        label: 'Will not perform',
        value: 'will-not-perform',
      },
      {
        label: 'May perform',
        value: 'may-perform',
      },
      {
        label: 'Will perform',
        value: 'will-perform',
      },
    ];
  }
  return [
    {
      label: 'Equal',
      value: 'eq',
    },
    {
      label: 'Greater',
      value: 'gt',
    },
    {
      label: 'GreaterEqual',
      value: 'gte',
    },
    { label: 'Less', value: 'lt' },
    {
      label: 'LessEqual',
      value: 'lte',
    },
  ];
}

export function PostConditionConditionCodeMenu({
  onChange,
  postConditionType,
}: {
  onChange: (option: any) => void;
  postConditionType: PostCondition['type'];
}) {
  const [selectedOption, setSelectedOption] = useState<
    Option<PostConditionConditionCode | undefined>
  >({
    label: 'Select a condition code',
    value: undefined,
  });
  const options = getPostConditionConditionCodeOptions(postConditionType);

  return (
    <MenuRoot>
      <MenuTrigger
        type="button"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <Flex gap={1}>
          <Text>{selectedOption.label}</Text>
          <Icon>
            <CaretDown />
          </Icon>
        </Flex>
      </MenuTrigger>
      <MenuContent>
        {options.map(option => (
          <MenuItem
            key={option.label}
            onClick={e => {
              e.stopPropagation();
              setSelectedOption(option);
              onChange(option);
            }}
            value={option.label}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}

export function PostConditionTypeMenu({ onChange }: { onChange: (option: any) => void }) {
  const [selectedOption, setSelectedOption] = useState<Option<PostCondition['type'] | undefined>>({
    label: 'Select a post condition',
    value: undefined,
  });
  return (
    <MenuRoot>
      <Flex gap={2} alignItems="center">
        <MenuTrigger
          type="button"
          onClick={e => {
            e.stopPropagation();
          }}
        >
          <Flex gap={1}>
            <Text>{selectedOption.label}</Text>
            <Icon>
              <CaretDown />
            </Icon>
          </Flex>
        </MenuTrigger>
      </Flex>
      <MenuContent>
        {PostConditionOptions.map(option => (
          <MenuItem
            key={option.label}
            onClick={e => {
              e.stopPropagation();
              setSelectedOption(option);
              onChange(option);
            }}
            value={option.label}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}

export function PostConditionForm({
  values,
  errors,
  formikSetFieldValue,
  handleChange,
}: {
  values: FunctionFormikState;
  errors: FormikErrors<FunctionFormikState>;
  formikSetFieldValue: FormikSetFieldValueFunction;
  handleChange: any;
}) {
  return (
    <>
      {values.postConditionMode !== 'allow' && (
        <Stack gap={4}>
          <Stack gap={2}>
            <PostConditionTypeMenu
              onChange={(option: Option<PostCondition['type']>) => {
                formikSetFieldValue('postConditionType', option.value);
              }}
            />
            {errors && <Caption color="error">{errors.postConditionType}</Caption>}
          </Stack>
          {values.postConditionType != null && (
            <Stack gap={4}>
              {postConditionParameterMap[values.postConditionType].map(parameter => (
                <Box key={parameter}>
                  {parameter !== 'postConditionMode' &&
                  parameter !== 'postConditionType' &&
                  parameter !== 'postConditionConditionCode' ? (
                    <Stack gap={2}>
                      <Text
                        fontSize="12px"
                        fontWeight="500"
                        display="block"
                        color="text"
                        mb="tight"
                      >
                        {postConditionParameterLabels[parameter]}
                      </Text>
                      <Box width="100%">
                        <Field
                          type={parameter === 'postConditionAmount' ? 'number' : 'text'}
                          name={parameter}
                          id={parameter}
                          component={Input}
                          onChange={handleChange}
                        />
                      </Box>
                      {errors[parameter] && <Caption color="error">{errors[parameter]}</Caption>}
                    </Stack>
                  ) : (
                    <Stack gap={2}>
                      <PostConditionConditionCodeMenu
                        onChange={(option: Option<PostConditionConditionCode>) => {
                          formikSetFieldValue('postConditionConditionCode', option.value);
                        }}
                        postConditionType={values.postConditionType as PostCondition['type']}
                      />
                      {errors.postConditionConditionCode && (
                        <Caption color="error">{errors.postConditionConditionCode}</Caption>
                      )}
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </>
  );
}
