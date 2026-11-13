import { ReadOnlyField as Redesign } from '@/app/txid/[txId]/redesign/function-called/ReadOnlyField';
import { createBehaviorWrapper } from '@/common/queries/test-utils/BehaviorProvider';
import stored from '@/common/utils/fixtures/stacks-behavior/stored-wallet.json';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CookiesProvider } from 'react-cookie';

import { FunctionView } from '../components/ContractCall/FunctionView';
import { ReadOnlyField as Sandbox } from '../components/ContractCall/ReadOnlyField';

jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <pre>{value}</pre>,
}));
const fn = { name: 'read', access: 'read_only', outputs: { type: 'bool' }, args: [] } as any;
const contractId = 'SP000000000000000000002Q6VF78.vectors';
beforeEach(() => {
  localStorage.setItem(stored.key, stored.value);
  localStorage.setItem(stored.networkKey, stored.networkUrl);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  jest.restoreAllMocks();
});
for (const [style, Field] of [
  ['sandbox', Sandbox],
  ['redesign', Redesign],
] as const) {
  it.each([
    [true, '0x0703', '(ok true)'],
    [true, '0x080100000000000000000000000000000001', '(err u1)'],
    [
      false,
      '0x080100000000000000000000000000000001',
      style === 'sandbox' ? '(err u1)' : '0x080100000000000000000000000000000001',
    ],
  ])(`${style} read-only field shows stored-wire response %#`, async (okay, result, shown) => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(
        async input =>
          new Response(
            JSON.stringify(
              String(input instanceof Request ? input.url : input).includes('call-read')
                ? { okay, result }
                : { results: [], total: 0 }
            ),
            { status: 200 }
          )
      );
    const { wrapper } = createBehaviorWrapper();
    render(
      <CookiesProvider>
        <Field fn={fn} contractId={contractId} readOnlyValue={[]} cancelButton={null} />
      </CookiesProvider>,
      { wrapper }
    );
    await waitFor(() => expect(screen.getByText(shown as string)).toBeInTheDocument());
  });
}
it('sandbox read-only form uses the Allow path and sends argument bytes without wallet post conditions', async () => {
  const requests: { url: string; body: unknown }[] = [];
  jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes('call-read')) requests.push({ url, body: JSON.parse(String(init?.body)) });
    return new Response(
      JSON.stringify(
        url.includes('call-read') ? { okay: true, result: '0x0703' } : { results: [], total: 0 }
      ),
      { status: 200 }
    );
  });
  const { wrapper } = createBehaviorWrapper();
  const { container } = render(
    <FunctionView
      fn={{ ...fn, args: [{ name: 'amount', type: 'uint128' }] }}
      contractId={contractId}
      cancelButton={null}
    />,
    { wrapper }
  );
  fireEvent.change(container.querySelector('input')!, { target: { value: '42' } });
  fireEvent.click(screen.getByRole('button', { name: /Call function/ }));
  await waitFor(() => expect(screen.getByText('(ok true)')).toBeInTheDocument());
  expect(requests).toEqual([
    {
      url: 'https://vectors.example/v2/contracts/call-read/SP000000000000000000002Q6VF78/vectors/read',
      body: {
        sender: 'SP000000000000000000002Q6VF78',
        arguments: ['0x010000000000000000000000000000002a'],
      },
    },
  ]);
  expect(container.textContent).not.toContain('Post-conditions');
});
