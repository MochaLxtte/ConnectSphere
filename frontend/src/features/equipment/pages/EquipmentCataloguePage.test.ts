import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import { apiError, availabilityItem, equipmentType, jsonResponse, stubApi } from '../test-helpers';
import EquipmentCataloguePage from './EquipmentCataloguePage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null };
const user = (role: string) => ({ id: 'user-1', email: 'u@example.com', displayName: 'Test user', role });

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: EquipmentCataloguePage }],
  });
  await router.push('/equipment');
  await router.isReady();
  return render(EquipmentCataloguePage, { global: { plugins: [router] } });
}

beforeEach(() => { session.user = user('EVENT_ORGANISER'); });

describe('equipment catalogue page', () => {
  it('lists equipment for an organiser without management controls', async () => {
    stubApi({ 'GET /api/equipment': jsonResponse({ items: [equipmentType(), equipmentType({ id: 'type-2', name: 'Lectern', category: null, description: null })] }) });
    await renderPage();
    expect(screen.getByText('Loading equipment…')).toBeInTheDocument();

    const list = await screen.findByRole('list', { name: 'Equipment types' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole('heading', { name: 'Projector' })).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent('4 in total');
    expect(rows[1]).toHaveTextContent('Uncategorised');
    expect(screen.queryByRole('link', { name: /Add equipment/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit Projector' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deactivate/ })).not.toBeInTheDocument();
  });

  it('gives technical support add, edit, queue and activation controls', async () => {
    session.user = user('TECHNICAL_SUPPORT_STAFF');
    const api = stubApi({
      'GET /api/equipment': jsonResponse({ items: [equipmentType(), equipmentType({ id: 'type-2', name: 'Old mixer', isActive: false })] }),
      'PATCH /api/equipment/type-2': jsonResponse(equipmentType({ id: 'type-2', name: 'Old mixer', isActive: true })),
    });
    await renderPage();

    expect(await screen.findByRole('link', { name: /Add equipment/ })).toHaveAttribute('href', '/equipment/new');
    expect(screen.getByRole('link', { name: 'Request queue' })).toHaveAttribute('href', '/equipment/requests');
    expect(await screen.findByRole('link', { name: 'Edit Projector' })).toHaveAttribute('href', '/equipment/type-1/edit');
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Activate Old mixer' }));
    await waitFor(() => expect(screen.queryByText('Inactive')).not.toBeInTheDocument());
    expect(api.requests('PATCH', '/api/equipment/type-2')[0]!.body).toEqual({ isActive: true });
    expect(screen.getByRole('button', { name: 'Deactivate Old mixer' })).toBeInTheDocument();
  });

  it('checks availability for a Singapore-time period and labels each type', async () => {
    const api = stubApi({
      'GET /api/equipment': jsonResponse({ items: [equipmentType(), equipmentType({ id: 'type-2', name: 'Lectern', totalQuantity: 1 })] }),
      'GET /api/equipment/availability': jsonResponse({ items: [
        availabilityItem(), availabilityItem({ equipmentTypeId: 'type-2', name: 'Lectern', totalQuantity: 1, reservedPeak: 1, available: 0 }),
      ] }),
    });
    await renderPage();
    await screen.findByRole('list', { name: 'Equipment types' });

    await fireEvent.update(screen.getByLabelText('From'), '2026-10-01T09:00');
    await fireEvent.update(screen.getByLabelText('To'), '2026-10-01T17:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));

    expect(await screen.findByText('3 of 4 available')).toBeInTheDocument();
    expect(screen.getByText('0 of 1 available')).toBeInTheDocument();
    const url = api.requests('GET', '/api/equipment/availability')[0]!.url;
    expect(new URL(url, 'http://localhost').searchParams.get('from')).toBe('2026-10-01T01:00:00.000Z');
    expect(new URL(url, 'http://localhost').searchParams.get('to')).toBe('2026-10-01T09:00:00.000Z');

    await fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('3 of 4 available')).not.toBeInTheDocument();
  });

  it('validates the availability period before calling the API', async () => {
    const api = stubApi({ 'GET /api/equipment': jsonResponse({ items: [equipmentType()] }) });
    await renderPage();
    await screen.findByRole('list', { name: 'Equipment types' });

    await fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter both a start and an end.');
    await fireEvent.update(screen.getByLabelText('From'), '2026-10-01T17:00');
    await fireEvent.update(screen.getByLabelText('To'), '2026-10-01T09:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The end must be later than the start.');
    expect(api.requests('GET', '/api/equipment/availability')).toHaveLength(0);
  });

  it('sends search and category filters and explains an empty result', async () => {
    const api = stubApi({ 'GET /api/equipment': [jsonResponse({ items: [equipmentType()] }), jsonResponse({ items: [] })] });
    await renderPage();
    await screen.findByRole('list', { name: 'Equipment types' });

    await fireEvent.update(screen.getByLabelText('Search'), 'mixer');
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('No equipment matches these filters')).toBeInTheDocument();
    expect(api.requests('GET', '/api/equipment').at(-1)!.url).toBe('/api/equipment?q=mixer');
    expect(screen.getByRole('option', { name: 'AV' })).toBeInTheDocument();
  });

  it('shows a retryable error, then the empty catalogue', async () => {
    stubApi({ 'GET /api/equipment': [apiError('INTERNAL_ERROR', 'An unexpected error occurred.', 500), jsonResponse({ items: [] })] });
    await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No equipment has been added yet')).toBeInTheDocument();
  });

  it('clears the list and offers sign-in when the session has expired', async () => {
    stubApi({ 'GET /api/equipment': apiError('AUTHENTICATION_REQUIRED', 'Sign in to view equipment.', 401) });
    await renderPage();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
    expect(screen.queryByRole('list', { name: 'Equipment types' })).not.toBeInTheDocument();
  });
});
