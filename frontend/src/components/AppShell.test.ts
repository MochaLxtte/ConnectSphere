import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppShell from './AppShell.vue';
import DashboardPage from '../features/system/pages/DashboardPage.vue';
import { authSession, restoreSession, roleLabel, signOut, type SignedInUser, type UserRole } from '../features/auth/session';

vi.mock('../features/auth/session', async (original) => {
  const actual = await original<typeof import('../features/auth/session')>();
  const { reactive } = await import('vue');
  return { ...actual, authSession: reactive({ user: null, loading: false }), restoreSession: vi.fn(async () => undefined), signOut: vi.fn(async () => undefined) };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
function open(role: UserRole, dashboard = false) {
  session.user = { id: 'viewer', role, email: 'viewer@example.test', displayName: 'Viewer' };
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: AppShell }] });
  return render(dashboard ? DashboardPage : AppShell, { global: { plugins: [router] } });
}
beforeEach(() => { session.loading = false; vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'ok' })))); });

describe('KAN-25 shared account navigation', () => {
  it('restores a session when mounted and retains a sign-in entry when restoration fails', async () => {
    session.user = null;
    vi.mocked(restoreSession).mockRejectedValueOnce(new Error('API offline'));
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: AppShell }] });
    render(AppShell, { global: { plugins: [router] } });
    await waitFor(() => expect(restoreSession).toHaveBeenCalledOnce());
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Review queue' })).not.toBeInTheDocument();
  });

  it('retains account controls after a failed logout so the user can retry', async () => {
    vi.mocked(signOut).mockRejectedValueOnce(new Error('API offline')).mockImplementationOnce(async () => { session.user = null; });
    open('EVENT_ORGANISER');
    await fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(screen.getByText('Viewer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('switches staff navigation when the verified account changes', async () => {
    open('VENUE_STAFF');
    expect(screen.getByRole('link', { name: 'Venue catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Venue blocks' })).toBeInTheDocument();
    session.user = { ...session.user!, role: 'SAFETY_OFFICER' };
    expect(await screen.findByRole('link', { name: 'Safety reviews' })).toHaveAttribute('href', '/safety-reviews');
    expect(screen.queryByRole('link', { name: 'Venue catalogue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Venue blocks' })).not.toBeInTheDocument();
  });
});

describe('KAN-9 equipment navigation', () => {
  it('shows equipment checks to technical support without coordinator controls', () => {
    open('TECHNICAL_SUPPORT_STAFF');
    expect(screen.getByRole('link', { name: 'Equipment availability' })).toHaveAttribute('href', '/equipment/availability');
    expect(screen.queryByRole('link', { name: 'Review queue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Event requests' })).not.toBeInTheDocument();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'hides equipment navigation for %s', (role) => {
      open(role); expect(screen.queryByRole('link', { name: 'Equipment availability' })).not.toBeInTheDocument();
    });
  it('hides equipment navigation until the session is restored', () => {
    session.loading = true; open('TECHNICAL_SUPPORT_STAFF');
    expect(screen.queryByRole('link', { name: 'Equipment availability' })).not.toBeInTheDocument();
  });
});
describe('KAN-79 Lead navigation and role presentation', () => {
  it('shows the Lead workspace without coordinator review links', () => {
    open('EVENT_COORDINATOR_LEAD');
    expect(roleLabel('EVENT_COORDINATOR_LEAD')).toBe('Event coordinator Lead');
    expect(screen.getByRole('link', { name: 'Assignment queue' })).toHaveAttribute('href', '/lead');
    expect(screen.getByRole('link', { name: 'Event oversight' })).toHaveAttribute('href', '/lead/oversight');
    expect(screen.queryByRole('link', { name: 'Review queue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Venue bookings' })).not.toBeInTheDocument();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'does not show Lead navigation for %s', (role) => {
      open(role);
      expect(screen.queryByRole('link', { name: 'Assignment queue' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Event oversight' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Unassigned requests' })).not.toBeInTheDocument();
    });
  it('waits for a restored identity before showing Lead navigation', () => {
    session.loading = true;
    open('EVENT_COORDINATOR_LEAD');
    expect(screen.queryByRole('link', { name: 'Assignment queue' })).not.toBeInTheDocument();
  });
  it('provides a Lead dashboard entry point', async () => {
    open('EVENT_COORDINATOR_LEAD', true);
    expect(screen.getByRole('link', { name: /Assign event coordinators/ })).toHaveAttribute('href', '/lead');
    expect(screen.queryByRole('link', { name: /Review event requests/ })).not.toBeInTheDocument();
    await screen.findByRole('button', { name: 'Check again' });
  });
});
