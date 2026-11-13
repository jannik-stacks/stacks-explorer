import { Argument as RedesignArgument } from '@/app/txid/[txId]/redesign/function-called/Argument';
import { FunctionCallForm } from '@/app/txid/[txId]/redesign/function-called/FunctionCallForm';
import { createBehaviorWrapper } from '@/common/queries/test-utils/BehaviorProvider';
import { serializeClarityValues } from '@/common/queries/test-utils/serializeClarityValues';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik } from 'formik';

import { request } from '@stacks/connect';

import { Argument as SandboxArgument } from '../components/Argument';
import { FunctionView } from '../components/ContractCall/FunctionView';

jest.mock('@stacks/connect', () => ({
  ...jest.requireActual('@stacks/connect'),
  request: jest.fn(),
}));
const requestMock = jest.mocked(request);
afterEach(() => {
  cleanup();
  requestMock.mockReset();
});
const types = [
  'uint128',
  'int128',
  'bool',
  'principal',
  { buffer: { length: 3 } },
  { 'string-ascii': { length: 5 } },
  { 'string-utf8': { length: 5 } },
  { optional: 'uint128' },
] as const;
for (const [style, Argument] of [
  ['sandbox', SandboxArgument],
  ['redesign', RedesignArgument],
] as const) {
  it.each(types)(`${style} ABI primitive shown attributes %#`, type => {
    const { wrapper } = createBehaviorWrapper();
    const { container } = render(
      <Argument
        name="value"
        type={type as any}
        value=""
        handleChange={() => {}}
        error={undefined}
      />,
      { wrapper }
    );
    const input = container.querySelector('input')!;
    expect({
      label: container.textContent,
      type: input.type,
      placeholder: input.placeholder,
      name: input.name,
    }).toMatchSnapshot();
  });
  it(`${style} ABI tuple, optional tuple and list shown attributes`, () => {
    const { wrapper } = createBehaviorWrapper();
    const tuple = [
      { name: 'amount', type: 'uint128' },
      { name: 'memo', type: { buffer: { length: 3 } } },
    ];
    for (const type of [
      { tuple },
      { optional: { tuple } },
      { list: { length: 2, type: 'uint128' } },
    ]) {
      const value = 'list' in type ? ['1'] : { amount: '', memo: '' };
      const { container, unmount } = render(
        <Formik initialValues={{ value }} onSubmit={() => {}}>
          <Argument
            name="value"
            type={type as any}
            value={value as any}
            handleChange={() => {}}
            error={undefined}
          />
        </Formik>,
        { wrapper }
      );
      expect({
        label: container.textContent,
        inputs: Array.from(container.querySelectorAll('input')).map(input => ({
          name: input.name,
          type: input.type,
          placeholder: input.placeholder,
        })),
      }).toMatchSnapshot();
      unmount();
    }
  });
}

const formCases = [
  ['uint128', '42'],
  ['int128', '-1'],
  ['bool', 'false'],
  ['principal', 'SP000000000000000000002Q6VF78'],
  [{ buffer: { length: 3 } }, '00ff80'],
  [{ 'string-ascii': { length: 5 } }, 'hello'],
  [{ 'string-utf8': { length: 5 } }, 'hé'],
  [{ optional: { buffer: { length: 34 } } }, 'hi'],
  [{ optional: 'uint128' }, ''],
  [{ tuple: [{ name: 'x', type: 'uint128' }] }, '7'],
  [{ optional: { tuple: [{ name: 'x', type: 'uint128' }] } }, '8'],
  [{ list: { length: 2, type: 'uint128' } }, '9'],
  [{ list: { length: 2, type: { optional: 'uint128' } } }, '10'],
  [{ list: { length: 2, type: { tuple: [{ name: 'x', type: 'uint128' }] } } }, '11'],
] as const;
for (const style of ['sandbox', 'redesign']) {
  it.each(formCases)(
    `${style} real form produces wallet argument bytes %#`,
    async (type, value) => {
      requestMock.mockResolvedValue({ txid: 'vector' } as any);
      const { wrapper } = createBehaviorWrapper();
      const fn = {
        name: 'exercise',
        access: 'public',
        outputs: { type: 'bool' },
        args: [{ name: 'memo', type }],
      } as any;
      const { container } = render(
        style === 'sandbox' ? (
          <FunctionView
            fn={fn}
            contractId="SP000000000000000000002Q6VF78.vectors"
            cancelButton={null}
          />
        ) : (
          <FunctionCallForm fnAbi={fn} contractId="SP000000000000000000002Q6VF78.vectors" />
        ),
        { wrapper }
      );
      if (typeof type === 'object' && 'list' in type)
        fireEvent.click(screen.getByRole('button', { name: /Add list item/ }));
      const input = container.querySelector('input')!;
      if (value !== '') fireEvent.change(input, { target: { value } });
      fireEvent.click(screen.getByRole('button', { name: /Call function/ }));
      await waitFor(() => expect(requestMock).toHaveBeenCalled());
      const [method, rawParams] = requestMock.mock.calls[0];
      const params = rawParams as unknown as {
        functionArgs: Parameters<typeof serializeClarityValues>[0];
      };
      expect({
        method,
        ...params,
        functionArgs: await serializeClarityValues(params.functionArgs),
      }).toMatchSnapshot();
    }
  );
}

it('data variables show ABI type labels and fetched display output', async () => {
  const { DataVariablesView } = require('../components/ContractCall/DataVariablesView');
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ data: '0x010000000000000000000000000000002a' }), {
      status: 200,
    })
  );
  const { wrapper } = createBehaviorWrapper();
  const { container } = render(
    <DataVariablesView
      contract={{ abi: { variables: [{ name: 'counter', access: 'variable', type: 'uint128' }] } }}
      contractId="SP000000000000000000002Q6VF78.vectors"
    />,
    { wrapper }
  );
  expect(container.textContent).toContain('uint');
  fireEvent.click(screen.getByRole('button', { name: /counter/ }));
  await waitFor(() => expect(screen.getByRole('region')).toHaveTextContent('u42'));
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://vectors.example/v2/data_var/SP000000000000000000002Q6VF78/vectors/counter?proof=0'
  );
  fetchMock.mockRestore();
});

it('pins every condition code and sandbox/redesign builder on standard and contract principals', async () => {
  const sandbox = require('../components/ContractCall/PostConditionForm');
  const {
    getPostCondition,
  } = require('@/app/txid/[txId]/redesign/function-called/function-call-post-condition-params-utils');
  const { callContract } = require('../utils/walletTransactions');
  const address = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
  const calls = [];
  for (const principal of [address, `${address}.vault`]) {
    for (const [type, codes] of [
      [0, [1, 2, 3, 4, 5]],
      [1, [1, 2, 3, 4, 5]],
      [2, [16, 17, 18]],
      [3, [1, 2, 3, 4, 5]],
      [4, [48, 49, 50]],
    ] as const) {
      for (const code of codes) {
        const params = {
          postConditionType: type,
          postConditionConditionCode: code,
          postConditionAddress: principal,
          postConditionAmount: 1100000,
          postConditionAssetAddress: address,
          postConditionAssetContractName: 'asset',
          postConditionAssetName: 'token',
        };
        for (const pc of [getPostCondition(params), sandbox.getPostCondition(params)[0]]) {
          requestMock.mockResolvedValue({ txid: 'tx' } as any);
          await callContract({
            contract: `${address}.vectors`,
            functionName: 'call',
            functionArgs: [],
            postConditions: [pc!],
            postConditionMode: 'deny',
          });
          const [, raw] = requestMock.mock.calls.at(-1)!;
          const wire = raw as unknown as { postConditions: string[] };
          calls.push({ principal, type, code, bytes: wire.postConditions });
        }
      }
    }
  }
  expect(calls).toMatchSnapshot();
});

it.each([1, 2, 3])('post-condition mode %s controls shown fields in both forms', mode => {
  const Sandbox = require('../components/ContractCall/PostConditionForm').PostConditionForm;
  const Redesign =
    require('@/app/txid/[txId]/redesign/function-called/PostConditionForm').PostConditionForm;
  const { wrapper } = createBehaviorWrapper();
  const values = {
    postConditionMode: mode,
    postConditionType: 0,
    postConditionConditionCode: 1,
    postConditionAddress: 'SP000000000000000000002Q6VF78',
    postConditionAmount: 42,
  };
  for (const Component of [Sandbox, Redesign]) {
    const { container, unmount } = render(
      <Formik initialValues={values} onSubmit={() => {}}>
        <Component
          values={values}
          errors={{}}
          formikSetFieldValue={() => {}}
          handleChange={() => {}}
        />
      </Formik>,
      { wrapper }
    );
    expect({
      text: container.textContent,
      inputs: Array.from(container.querySelectorAll('input')).map(input => ({
        name: input.name,
        value: input.value,
        type: input.type,
      })),
    }).toMatchSnapshot();
    unmount();
  }
});

for (const [style, Argument] of [
  ['sandbox', SandboxArgument],
  ['redesign', RedesignArgument],
] as const) {
  it(`${style} shared ABI fixture labels and widget selection`, () => {
    const fixture = require('@/common/utils/fixtures/stacks-behavior/abi-form.json');
    const { wrapper } = createBehaviorWrapper();
    for (const arg of fixture.abi.args) {
      const value = fixture.values[arg.name];
      const { container, unmount } = render(
        <Formik initialValues={fixture.values} onSubmit={() => {}}>
          <Argument
            name={arg.name}
            type={arg.type}
            value={value}
            error={undefined}
            handleChange={() => {}}
          />
        </Formik>,
        { wrapper }
      );
      expect({
        name: arg.name,
        text: container.textContent,
        inputs: Array.from(container.querySelectorAll('input')).map(input => ({
          name: input.name,
          type: input.type,
          placeholder: input.placeholder,
          value: input.value,
        })),
      }).toMatchSnapshot();
      unmount();
    }
  });
}
