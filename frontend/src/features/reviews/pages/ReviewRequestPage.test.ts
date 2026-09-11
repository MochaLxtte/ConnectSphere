import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ReviewRequestPage from './ReviewRequestPage.vue';

const detail = {
  id: 'a', organiserId: 'org-1', coordinatorId: null, status: 'SUBMITTED',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair', startsAt: '2026-10-01T09:00:00Z',
  endsAt: '2026-10-01T17:00:00Z', expectedAttendance: 200, venueRequirements: 'Hall A',
  accessibilityNeeds: 'Wheelchair access', equipmentRequirements: 'Projector',
  registrationRequired: true, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function renderDetail(id = 'a') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/reviews/:id', component: ReviewRequestPage }],
  });
  await router.push(`/reviews/${id}`);
  await router.isReady();
  return render(ReviewRequestPage, { global: { plugins: [router] } });
}

describe('KAN-33 review request detail page', () => {
  it('displays the submitted request fields required for review', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)));
    await renderDetail();

    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
    expect(screen.getByText('Hiring')).toBeInTheDocument();
    expect(screen.getByText('Annual fair')).toBeInTheDocument();
    expect(screen.getByText('Hall A')).toBeInTheDocument();
    expect(screen.getByText('Wheelchair access')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    // The decision panel from KAN-36 is mounted for a SUBMITTED request.
    expect(screen.getByRole('heading', { name: 'Record a decision' })).toBeInTheDocument();
  });

  it('shows the masked not-found message without leaking that the request exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' } }, 404),
      ),
    );
    await renderDetail();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This event request is unavailable or you do not have permission to review it.',
    );
  });

  it('submits a decision through the mounted KAN-36 panel and shows the recorded outcome', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse({
          reviewId: 'r1', eventRequestId: 'a', reviewedBy: 'coordinator-1',
          decision: 'APPROVED', reason: null,
        }, 201);
      }
      return jsonResponse(detail);
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail();

    await screen.findByRole('heading', { name: 'Career fair' });
    await fireEvent.click(screen.getByRole('radio', { name: /^Approve request/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Request approved'),
    );
    const [, postCall] = fetchMock.mock.calls;
    expect(postCall[0]).toBe('/api/events/a/reviews');
    expect(JSON.parse((postCall[1] as RequestInit).body as string)).toEqual({
      decision: 'APPROVED', reason: null,
    });
  });
});
