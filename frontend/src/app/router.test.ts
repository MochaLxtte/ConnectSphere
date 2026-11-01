import { render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router } from './router';
import { authSession, type SignedInUser } from '../features/auth/session';

vi.mock('../features/auth/session', async (original) => {
  const actual = await original<typeof import('../features/auth/session')>();
  const { reactive } = await import('vue');
  return { ...actual, authSession: reactive({ user: null, loading: false }) };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
beforeEach(() => {
  session.user = null; session.loading = false;
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('KAN-25 / KAN-79 protected route wiring', () => {
  it.each(['/reviews/request-one', '/lead/oversight/request-one', '/equipment/availability/request-one', '/attend/request-one'])(
    'does not mount the protected child for a signed-out deep link %s', async (path) => {
      const navigation = createRouter({ history: createMemoryHistory(), routes: router.options.routes });
      await navigation.push(path);
      render(RouterView, { global: { plugins: [navigation] } });
      expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
      expect(fetch).not.toHaveBeenCalled();
    });

  it.each([
    ['/reviews/request-one', 'Coordinator access only'],
    ['/lead/oversight/request-one', 'Lead access only'],
    ['/equipment/stock', 'Technical support access only'],
    ['/attend/request-one', 'Attendee access only'],
  ])('keeps an organiser outside the protected route %s', async (path, heading) => {
    session.user = { id: 'organiser-one', role: 'EVENT_ORGANISER', displayName: 'Organiser', email: 'o@example.test' };
    const navigation = createRouter({ history: createMemoryHistory(), routes: router.options.routes });
    await navigation.push(path);
    render(RouterView, { global: { plugins: [navigation] } });
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('redirects the historical unassigned route to the Lead gate instead of an event ID', async () => {
    const navigation = createRouter({ history: createMemoryHistory(), routes: router.options.routes });
    await navigation.push('/reviews/unassigned');
    render(RouterView, { global: { plugins: [navigation] } });
    expect(navigation.currentRoute.value.path).toBe('/lead');
    expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses specific editor routes and keeps the event ID in the route params', () => {
    for (const [path, title] of [['/events/new', 'New event request'], ['/events/event-one/edit', 'Edit draft'], ['/reviews/event-one/venue-suitability', 'Venue suitability']]) {
      const resolved = router.resolve(path);
      expect(resolved.meta.title).toBe(title);
      if (path.includes('event-one')) expect(resolved.params.id).toBe('event-one');
    }
  });

  it('navigates an unknown URL to a recoverable not-found page', async () => {
    const navigation = createRouter({ history: createMemoryHistory(), routes: router.options.routes });
    await navigation.push('/does-not-exist');
    render(RouterView, { global: { plugins: [navigation] } });
    expect(await screen.findByRole('heading', { name: 'This page isn’t here.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('updates document titles through the actual router and supplies a fallback for untitled routes', async () => {
    await router.push('/login');
    expect(document.title).toBe('Sign in · ConnectSphere');
    const remove = router.addRoute({ path: '/untitled-test-route', component: { template: '<div />' } });
    try {
      await router.push('/untitled-test-route');
      expect(document.title).toBe('Workspace · ConnectSphere');
    } finally { remove(); }
    expect(router.options.scrollBehavior?.(router.currentRoute.value, router.currentRoute.value, null)).toEqual({ top: 0 });
  });
});
