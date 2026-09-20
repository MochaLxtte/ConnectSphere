import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { authSession } from '../../auth/session.js';
import { apiError, equipmentType, jsonResponse, stubApi } from '../test-helpers';
import EquipmentFormPage from './EquipmentFormPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null };
const user = (role: string) => ({ id: 'user-1', email: 'u@example.com', displayName: 'Test user', role });

async function renderForm(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/equipment', component: { render: () => h('p', 'Catalogue') } },
      { path: '/equipment/new', component: EquipmentFormPage },
      { path: '/equipment/:id/edit', component: EquipmentFormPage },
      { path: '/login', component: { render: () => h('p', 'Login') } },
    ],
  });
  await router.push(path);
  await router.isReady();
  const view = render({ render: () => h(RouterView) }, { global: { plugins: [router] } });
  return { router, ...view };
}

beforeEach(() => { session.user = user('TECHNICAL_SUPPORT_STAFF'); });

describe('equipment form page', () => {
  it('creates an equipment type and returns to the catalogue', async () => {
    const api = stubApi({ 'POST /api/equipment': jsonResponse(equipmentType(), 201) });
    const { router } = await renderForm('/equipment/new');
    expect(screen.getByRole('heading', { level: 1, name: 'Add equipment' })).toBeInTheDocument();

    await fireEvent.update(screen.getByLabelText('Name'), '  Projector ');
    await fireEvent.update(screen.getByLabelText(/Category/), 'AV');
    await fireEvent.update(screen.getByLabelText('Total quantity'), '4');
    await fireEvent.click(screen.getByRole('button', { name: 'Add equipment' }));

    await waitFor(() => expect(router.currentRoute.value.path).toBe('/equipment'));
    expect(api.requests('POST', '/api/equipment')[0]!.body).toEqual({
      name: 'Projector', category: 'AV', description: null, totalQuantity: 4, isActive: true,
    });
  });

  it('validates before saving', async () => {
    const api = stubApi({});
    await renderForm('/equipment/new');
    await fireEvent.update(screen.getByLabelText('Total quantity'), '-2');
    await fireEvent.click(screen.getByRole('button', { name: 'Add equipment' }));
    const alerts = screen.getAllByRole('alert').map((alert) => alert.textContent);
    expect(alerts).toEqual(['Enter a name.', 'Enter a whole number of 0 or more.']);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(api.calls).toHaveLength(0);
  });

  it('loads an existing type, saves changes and reports conflicts beside the field', async () => {
    const api = stubApi({
      'GET /api/equipment/type-1': jsonResponse(equipmentType({ isActive: false })),
      'PATCH /api/equipment/type-1': [
        apiError('EQUIPMENT_QUANTITY_IN_USE', 'Current and upcoming reservations need 3 at once, so the total cannot go below 3.', 409),
        apiError('EQUIPMENT_NAME_TAKEN', 'Another equipment type already uses this name.', 409),
        jsonResponse(equipmentType({ totalQuantity: 3 })),
      ],
    });
    const { router } = await renderForm('/equipment/type-1/edit');
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit equipment' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Projector'));
    expect(screen.getByLabelText('Total quantity')).toHaveValue(4);
    expect(screen.getByLabelText(/Active/)).not.toBeChecked();

    await fireEvent.update(screen.getByLabelText('Total quantity'), '1');
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot go below 3');

    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('already uses this name'));

    await fireEvent.update(screen.getByLabelText('Total quantity'), '3');
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/equipment'));
    expect(api.requests('PATCH', '/api/equipment/type-1').at(-1)!.body).toMatchObject({ totalQuantity: 3, isActive: false });
  });

  it('blocks other roles without calling the API', async () => {
    session.user = user('EVENT_ORGANISER');
    const api = stubApi({});
    await renderForm('/equipment/new');
    expect(screen.getByRole('alert')).toHaveTextContent('Only technical support staff can manage equipment.');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it('shows unavailable and sign-in states when loading fails', async () => {
    stubApi({ 'GET /api/equipment/missing': apiError('EQUIPMENT_NOT_FOUND', 'The equipment type was not found.', 404) });
    const first = await renderForm('/equipment/missing/edit');
    expect(await screen.findByRole('alert')).toHaveTextContent('This equipment type is unavailable.');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    first.unmount();

    stubApi({ 'GET /api/equipment/type-1': apiError('AUTHENTICATION_REQUIRED', 'Sign in.', 401) });
    await renderForm('/equipment/type-1/edit');
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
  });
});
