import { logError } from '@/common/utils/error-utils';
import { isUint128 } from '@/common/utils/number-utils';
import { validateStacksAddress } from '@/common/utils/utils';
import {
  Cl,
  FungibleComparator,
  NonFungibleComparator,
  Pc,
  PostCondition,
  PoxComparator,
  StacksTransaction,
} from '@jannik-stacks/kit';

import { FunctionFormikState } from './FunctionCallForm';

export type PostConditionConditionCode = FungibleComparator | NonFungibleComparator | PoxComparator;

export function isFungibleConditionCode(
  code: PostConditionConditionCode
): code is FungibleComparator {
  return ['eq', 'gt', 'gte', 'lt', 'lte'].includes(code as FungibleComparator);
}

export function isNonFungibleConditionCode(
  code: PostConditionConditionCode
): code is NonFungibleComparator {
  return ['sent', 'not-sent', 'maybe-sent'].includes(code as NonFungibleComparator);
}

export function isPoxConditionCode(code: PostConditionConditionCode): code is PoxComparator {
  return ['will-not-perform', 'may-perform', 'will-perform'].includes(code as PoxComparator);
}

export function isConditionCodeValidForType(
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

export interface PostConditionParameters {
  postConditionMode: NonNullable<StacksTransaction['postConditionMode']>;
  postConditionType?: PostCondition['type'];
  postConditionAddress?: string;
  postConditionConditionCode?: PostConditionConditionCode;
  postConditionAmount?: bigint;
  postConditionAssetAddress?: string;
  postConditionAssetContractName?: string;
  postConditionAssetName?: string;
}

// Map a post condition type to the keys of the post condition parameters needed to create it
export const postConditionParameterMap: Record<
  PostCondition['type'],
  (keyof PostConditionParameters)[]
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

export type PostConditionBuilderParameters = Omit<PostConditionParameters, 'postConditionMode'>;

export const postConditionParametersThatUseSelect: (keyof PostConditionParameters)[] = [
  'postConditionMode',
  'postConditionType',
  'postConditionConditionCode',
];

// Checks if a key is a post condition parameter
export function isPostConditionParameter(key: string): key is keyof PostConditionParameters {
  const postConditionKeys = [
    'postConditionMode',
    'postConditionType',
    'postConditionAddress',
    'postConditionConditionCode',
    'postConditionAmount',
    'postConditionAssetAddress',
    'postConditionAssetContractName',
    'postConditionAssetName',
  ] as const satisfies readonly (keyof PostConditionParameters)[];
  return postConditionKeys.includes(key as keyof PostConditionParameters);
}

// Map a post condition parameter key to a label
// Doesn't include postConditionMode and postConditionType because they are handled by the Select component
export const postConditionParameterLabels: Record<string, string> = {
  postConditionAddress: 'Address',
  postConditionConditionCode: 'Condition Code',
  postConditionAmount: 'Amount',
  postConditionAssetAddress: 'Asset Address',
  postConditionAssetContractName: 'Asset Contract Name',
  postConditionAssetName: 'Asset Name',
};

// Validation functions for each post condition type
function validateStxPostConditionParams(params: PostConditionBuilderParameters): boolean {
  const {
    postConditionType,
    postConditionAddress,
    postConditionConditionCode,
    postConditionAmount,
  } = params;

  return (
    postConditionType === 'stx-postcondition' &&
    !!postConditionAddress &&
    !!postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  );
}

function validateFungiblePostConditionParams(params: PostConditionBuilderParameters): boolean {
  const {
    postConditionType,
    postConditionAddress,
    postConditionAssetAddress,
    postConditionAssetContractName,
    postConditionAssetName,
    postConditionConditionCode,
    postConditionAmount,
  } = params;

  return (
    postConditionType === 'ft-postcondition' &&
    !!postConditionAddress &&
    !!postConditionAssetAddress &&
    !!postConditionAssetContractName &&
    !!postConditionAssetName &&
    !!postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  );
}

function validateNonFungiblePostConditionParams(params: PostConditionBuilderParameters): boolean {
  const {
    postConditionType,
    postConditionAddress,
    postConditionAssetAddress,
    postConditionAssetContractName,
    postConditionAssetName,
    postConditionConditionCode,
  } = params;

  return (
    postConditionType === 'nft-postcondition' &&
    !!postConditionAddress &&
    !!postConditionAssetAddress &&
    !!postConditionAssetContractName &&
    !!postConditionAssetName &&
    !!postConditionConditionCode &&
    isNonFungibleConditionCode(postConditionConditionCode)
  );
}

function validateStakingPostConditionParams(params: PostConditionBuilderParameters): boolean {
  const {
    postConditionType,
    postConditionAddress,
    postConditionConditionCode,
    postConditionAmount,
  } = params;

  return (
    postConditionType === 'staking-postcondition' &&
    !!postConditionAddress &&
    !!postConditionConditionCode &&
    postConditionAmount != null &&
    isUint128(postConditionAmount) &&
    isFungibleConditionCode(postConditionConditionCode)
  );
}

function validatePoxPostConditionParams(params: PostConditionBuilderParameters): boolean {
  const { postConditionType, postConditionAddress, postConditionConditionCode } = params;

  return (
    postConditionType === 'pox-postcondition' &&
    !!postConditionAddress &&
    !!postConditionConditionCode &&
    isPoxConditionCode(postConditionConditionCode)
  );
}

function createStxPostCondition(params: PostConditionBuilderParameters): PostCondition {
  return fungibleFormCondition(params).ustx();
}

function fungibleFormCondition(params: PostConditionBuilderParameters) {
  const principal = Pc.principal(params.postConditionAddress!);
  const amount = params.postConditionAmount!;
  switch (params.postConditionConditionCode) {
    case 'gt':
      return principal.willSendGt(amount);
    case 'gte':
      return principal.willSendGte(amount);
    case 'lt':
      return principal.willSendLt(amount);
    case 'lte':
      return principal.willSendLte(amount);
    default:
      return principal.willSendEq(amount);
  }
}

function createFungiblePostCondition(params: PostConditionBuilderParameters): PostCondition {
  return fungibleFormCondition(params).ft(
    `${params.postConditionAssetAddress}.${params.postConditionAssetContractName}::${params.postConditionAssetName}`
  );
}

function createNonFungiblePostCondition(params: PostConditionBuilderParameters): PostCondition {
  const principal = Pc.principal(params.postConditionAddress!);
  const condition =
    params.postConditionConditionCode === 'not-sent'
      ? principal.willNotSendAsset()
      : params.postConditionConditionCode === 'maybe-sent'
        ? principal.willMaybeSendAsset()
        : principal.willSendAsset();
  return condition.nft(
    `${params.postConditionAssetAddress}.${params.postConditionAssetContractName}::${params.postConditionAssetName}`,
    Cl.utf8(params.postConditionAssetName!)
  );
}

function createStakingPostCondition(params: PostConditionBuilderParameters): PostCondition {
  return fungibleFormCondition(params).staking();
}

function createPoxPostCondition(params: PostConditionBuilderParameters): PostCondition {
  const principal = Pc.principal(params.postConditionAddress!);
  return params.postConditionConditionCode === 'will-not-perform'
    ? principal.willNotPerformPox()
    : params.postConditionConditionCode === 'may-perform'
      ? principal.mayPerformPox()
      : principal.willPerformPox();
}

export function getPostCondition(
  postConditionParameters: PostConditionBuilderParameters
): PostCondition | undefined {
  // STX Post Condition
  if (validateStxPostConditionParams(postConditionParameters)) {
    return createStxPostCondition(postConditionParameters);
  }

  // Fungible Token Post Condition
  if (validateFungiblePostConditionParams(postConditionParameters)) {
    return createFungiblePostCondition(postConditionParameters);
  }

  // Non-Fungible Token Post Condition
  if (validateNonFungiblePostConditionParams(postConditionParameters)) {
    return createNonFungiblePostCondition(postConditionParameters);
  }

  if (validateStakingPostConditionParams(postConditionParameters)) {
    return createStakingPostCondition(postConditionParameters);
  }

  if (validatePoxPostConditionParams(postConditionParameters)) {
    return createPoxPostCondition(postConditionParameters);
  }

  // Handle error case
  logError(
    new Error(
      `Error creating post condition for post condition type ${postConditionParameters.postConditionType}`
    ),
    'getPostCondition',
    postConditionParameters
  );
  return undefined;
}

// Validates the post condition parameters
export const checkPostConditionParameters = (
  formikState: PostConditionParameters
): Record<string, string> => {
  const errors: Record<string, string> = {};
  // If the post condition mode is allow, there are no post condition parameters to validate
  if (formikState.postConditionMode === 'allow') return errors;

  if (formikState.postConditionType == null) {
    errors.postConditionType = 'Post condition type is required';
  }
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
      if (typeof formikState[key] !== 'bigint' || !isUint128(formikState[key])) {
        errors[key] = 'Invalid amount';
        return;
      }
    }
  });
  return errors;
};

export interface Option<V extends string, L extends string> {
  label: L;
  value: V;
}

export type PostConditionTypeLabel =
  | 'STX Post Condition'
  | 'Fungible Post Condition'
  | 'Non-Fungible Post Condition'
  | 'Staking Post Condition'
  | 'PoX Post Condition';

export const PostConditionTypeLabelMap: Record<PostCondition['type'], PostConditionTypeLabel> = {
  ['stx-postcondition']: 'STX Post Condition',
  ['ft-postcondition']: 'Fungible Post Condition',
  ['nft-postcondition']: 'Non-Fungible Post Condition',
  ['staking-postcondition']: 'Staking Post Condition',
  ['pox-postcondition']: 'PoX Post Condition',
};

export type PostConditionTypeValue =
  | 'stx-post-condition'
  | 'fungible-post-condition'
  | 'non-fungible-post-condition'
  | 'staking-post-condition'
  | 'pox-post-condition';

export const PostConditionTypeValueMap: Record<PostCondition['type'], PostConditionTypeValue> = {
  ['stx-postcondition']: 'stx-post-condition',
  ['ft-postcondition']: 'fungible-post-condition',
  ['nft-postcondition']: 'non-fungible-post-condition',
  ['staking-postcondition']: 'staking-post-condition',
  ['pox-postcondition']: 'pox-post-condition',
};

export const PostConditionTypeValueMapReversed: Record<
  PostConditionTypeValue,
  PostCondition['type']
> = {
  'stx-post-condition': 'stx-postcondition',
  'fungible-post-condition': 'ft-postcondition',
  'non-fungible-post-condition': 'nft-postcondition',
  'staking-post-condition': 'staking-postcondition',
  'pox-post-condition': 'pox-postcondition',
};

export const PostConditionTypeOptions = [
  {
    label: PostConditionTypeLabelMap['stx-postcondition'],
    value: PostConditionTypeValueMap['stx-postcondition'],
  },
  {
    label: PostConditionTypeLabelMap['ft-postcondition'],
    value: PostConditionTypeValueMap['ft-postcondition'],
  },
  {
    label: PostConditionTypeLabelMap['nft-postcondition'],
    value: PostConditionTypeValueMap['nft-postcondition'],
  },
  {
    label: PostConditionTypeLabelMap['staking-postcondition'],
    value: PostConditionTypeValueMap['staking-postcondition'],
  },
  {
    label: PostConditionTypeLabelMap['pox-postcondition'],
    value: PostConditionTypeValueMap['pox-postcondition'],
  },
];

export type PostConditionConditionCodeLabel =
  | 'Does not send'
  | 'Sends'
  | 'May send'
  | 'Equal'
  | 'Greater'
  | 'GreaterEqual'
  | 'Less'
  | 'LessEqual'
  | 'Will not perform'
  | 'May perform'
  | 'Will perform';

export const PostConditionConditionCodeLabelMap: Record<
  PostConditionConditionCode,
  PostConditionConditionCodeLabel
> = {
  ['not-sent']: 'Does not send',
  ['sent']: 'Sends',
  ['maybe-sent']: 'May send',
  ['eq']: 'Equal',
  ['gt']: 'Greater',
  ['gte']: 'GreaterEqual',
  ['lt']: 'Less',
  ['lte']: 'LessEqual',
  ['will-not-perform']: 'Will not perform',
  ['may-perform']: 'May perform',
  ['will-perform']: 'Will perform',
};

export type PostConditionConditionCodeValue =
  | 'does-not-send'
  | 'sends'
  | 'may-send'
  | 'equal'
  | 'greater'
  | 'greater-equal'
  | 'less'
  | 'less-equal'
  | 'will-not-perform'
  | 'may-perform'
  | 'will-perform';

export const PostConditionConditionCodeValueMap: Record<
  PostConditionConditionCode,
  PostConditionConditionCodeValue
> = {
  ['not-sent']: 'does-not-send',
  ['sent']: 'sends',
  ['maybe-sent']: 'may-send',
  ['eq']: 'equal',
  ['gt']: 'greater',
  ['gte']: 'greater-equal',
  ['lt']: 'less',
  ['lte']: 'less-equal',
  ['will-not-perform']: 'will-not-perform',
  ['may-perform']: 'may-perform',
  ['will-perform']: 'will-perform',
};

export const PostConditionConditionCodeValueMapReversed: Record<
  PostConditionConditionCodeValue,
  PostConditionConditionCode
> = {
  'does-not-send': 'not-sent',
  sends: 'sent',
  'may-send': 'maybe-sent',
  equal: 'eq',
  greater: 'gt',
  'greater-equal': 'gte',
  less: 'lt',
  'less-equal': 'lte',
  'will-not-perform': 'will-not-perform',
  'may-perform': 'may-perform',
  'will-perform': 'will-perform',
};

export function getPostConditionConditionCodeOptions(
  postConditionType: PostCondition['type']
): Option<PostConditionConditionCodeValue, PostConditionConditionCodeLabel>[] {
  if (postConditionType === 'nft-postcondition') {
    return [
      {
        label: PostConditionConditionCodeLabelMap['not-sent'],
        value: PostConditionConditionCodeValueMap['not-sent'],
      },
      {
        label: PostConditionConditionCodeLabelMap['sent'],
        value: PostConditionConditionCodeValueMap['sent'],
      },
      {
        label: PostConditionConditionCodeLabelMap['maybe-sent'],
        value: PostConditionConditionCodeValueMap['maybe-sent'],
      },
    ];
  }
  if (postConditionType === 'pox-postcondition') {
    return [
      {
        label: PostConditionConditionCodeLabelMap['will-not-perform'],
        value: PostConditionConditionCodeValueMap['will-not-perform'],
      },
      {
        label: PostConditionConditionCodeLabelMap['may-perform'],
        value: PostConditionConditionCodeValueMap['may-perform'],
      },
      {
        label: PostConditionConditionCodeLabelMap['will-perform'],
        value: PostConditionConditionCodeValueMap['will-perform'],
      },
    ];
  }
  return [
    {
      label: PostConditionConditionCodeLabelMap['eq'],
      value: PostConditionConditionCodeValueMap['eq'],
    },
    {
      label: PostConditionConditionCodeLabelMap['gt'],
      value: PostConditionConditionCodeValueMap['gt'],
    },
    {
      label: PostConditionConditionCodeLabelMap['gte'],
      value: PostConditionConditionCodeValueMap['gte'],
    },
    {
      label: PostConditionConditionCodeLabelMap['lt'],
      value: PostConditionConditionCodeValueMap['lt'],
    },
    {
      label: PostConditionConditionCodeLabelMap['lte'],
      value: PostConditionConditionCodeValueMap['lte'],
    },
  ];
}

// Sets the initial values for the post condition parameters
// By default, allow mode is enabled, which means the function is allowed to be called with no post conditions
export const initialPostConditionParameterValues: PostConditionParameters = {
  postConditionMode: 'allow',
  postConditionType: undefined,
  postConditionAddress: undefined,
  postConditionAmount: undefined,
  postConditionConditionCode: undefined,
  postConditionAssetName: undefined,
  postConditionAssetAddress: undefined,
  postConditionAssetContractName: undefined,
};

export function extractPostConditionParams(values: FunctionFormikState): PostConditionParameters {
  const {
    postConditionMode,
    postConditionType,
    postConditionAddress,
    postConditionConditionCode,
    postConditionAmount,
    postConditionAssetAddress,
    postConditionAssetContractName,
    postConditionAssetName,
  } = values;

  return {
    postConditionMode: postConditionMode != null ? postConditionMode : 'deny',
    postConditionType: postConditionType != null ? postConditionType : undefined,
    postConditionAddress,
    postConditionConditionCode:
      postConditionConditionCode != null ? postConditionConditionCode : undefined,
    postConditionAmount,
    postConditionAssetAddress,
    postConditionAssetContractName,
    postConditionAssetName,
  };
}
