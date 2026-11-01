import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import LoginPage from './LoginPage.vue';
import { authSession, signIn, type SignedInUser } from '../session';
import { ApiError } from '../../../lib/api-client';

vi.mock('../session', async (original) => {
  const actual = await original<typeof import('../session')>();
  const { reactive } = await import('vue');
  return { ...actual, authSession: reactive({ user: null, loading: false }), signIn: vi.fn() };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const login = vi.mocked(signIn);
const user: SignedInUser = { id: 'test-organiser', email: 'organiser@example.test', displayName: 'Test Organiser', role: 'EVENT_ORGANISER' };

async function open() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/login', component: LoginPage },
    { path: '/', component: { template: '<h1>Overview destination</h1>' } },
  ] });
  await router.push('/login');
  render(LoginPage, { global: { plugins: [router] } });
  return router;
}
async function enterCredentials() {
  await fireEvent.update(screen.getByLabelText('Email address'), ' organiser@example.test ');
  await fireEvent.update(screen.getByLabelText('Password'), ' synthetic password ');
}
beforeEach(() => { session.user = null; session.loading = false; login.mockReset(); });

describe('KAN-25 sign-in form', () => {
  it('trims the email, preserves the password, and navigates only after sign-in succeeds', async () => {
    let complete!: (value: SignedInUser) => void;
    login.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const router = await open();
    await enterCredentials();
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(login).toHaveBeenCalledExactlyOnceWith('organiser@example.test', ' synthetic password ');
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    expect(screen.getByLabelText('Email address')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();
    expect(router.currentRoute.value.path).toBe('/login');
    complete(user);
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/'));
  });

  it.each([
    [new ApiError('Account is not linked', 403, 'ACCOUNT_NOT_LINKED'), 'Account is not linked'],
    [new Error('Identity provider unavailable'), 'Identity provider unavailable'],
    ['unexpected rejection', 'Unable to sign in. Please try again.'],
  ])('keeps the form retryable and stays on sign-in after failure %s', async (failure, message) => {
    login.mockRejectedValue(failure);
    const router = await open();
    await enterCredentials();
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message as string);
    expect(router.currentRoute.value.path).toBe('/login');
    expect(screen.getByLabelText('Email address')).toHaveValue('organiser@example.test');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(session.user).toBeNull();
  });

  it('clears the previous error while a fresh attempt is pending', async () => {
    login.mockRejectedValueOnce(new Error('First attempt failed')).mockResolvedValueOnce(user);
    const router = await open();
    await enterCredentials();
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(login).toHaveBeenCalledTimes(2);
  });

  it('shows the verified account and overview route instead of another credential form', async () => {
    session.user = { ...user, role: 'SAFETY_OFFICER' };
    await open();
    expect(screen.getByRole('heading', { name: 'Test Organiser' })).toBeInTheDocument();
    expect(screen.getByText('Safety Officer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});
