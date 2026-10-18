import { render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppShell from './AppShell.vue';
import DashboardPage from '../features/system/pages/DashboardPage.vue';
import { authSession, roleLabel, type SignedInUser, type UserRole } from '../features/auth/session';

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
