import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api-client';
import { submitRequest, SubmissionIncompleteError, SubmissionInvalidError } from './event-requests';

const json = (body: unknown, status = 400) => new Response(JSON.stringify(body), { status });
const failWith = (error: Record<string, unknown>) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error })));

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to be rejected.');
}

afterEach(() => vi.unstubAllGlobals());

describe('KAN-59 submit error parsing (S1-DEF-04, KAN-6-AC2)', () => {
  it('keeps SUBMISSION_INCOMPLETE as before, with only its string field names', async () => {
    failWith({ code: 'SUBMISSION_INCOMPLETE', message: 'Incomplete.', missingFields: ['purpose', 7, 'startsAt'] });
    const error = await rejection(submitRequest('draft-1'));
    expect(error).toBeInstanceOf(SubmissionIncompleteError);
    expect((error as SubmissionIncompleteError).missingFields).toEqual(['purpose', 'startsAt']);
  });

  it('turns SUBMISSION_INVALID into a typed error with missing fields and per-field messages', async () => {
    failWith({
      code: 'SUBMISSION_INVALID', message: 'The end must be after the start.',
      missingFields: ['name'], fieldErrors: { endsAt: 'The end must be after the start.' },
    });
    const error = await rejection(submitRequest('draft-1'));
    expect(error).toBeInstanceOf(SubmissionInvalidError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400, code: 'SUBMISSION_INVALID', message: 'The end must be after the start.',
      missingFields: ['name'], fieldErrors: { endsAt: 'The end must be after the start.' },
    });
  });

  it('ignores non-text messages and non-text field names, and tolerates absent detail', async () => {
    failWith({
      code: 'SUBMISSION_INVALID', message: 'Invalid.',
      missingFields: ['name', 3], fieldErrors: { endsAt: 'Fix this.', startsAt: 12, registrationClosesAt: null },
    });
    expect((await rejection(submitRequest('draft-1')) as SubmissionInvalidError).fieldErrors)
      .toEqual({ endsAt: 'Fix this.' });

    failWith({ code: 'SUBMISSION_INVALID', message: 'Invalid.' });
    expect(await rejection(submitRequest('draft-1'))).toMatchObject({ missingFields: [], fieldErrors: {} });

    failWith({ code: 'SUBMISSION_INVALID', message: 'Invalid.', fieldErrors: 'not an object', missingFields: 'name' });
    expect(await rejection(submitRequest('draft-1'))).toMatchObject({ missingFields: [], fieldErrors: {} });

    failWith({ code: 'SUBMISSION_INVALID', message: 'Invalid.', fieldErrors: null });
    expect(await rejection(submitRequest('draft-1'))).toMatchObject({ fieldErrors: {} });
  });

  it('leaves every other API error as a plain ApiError', async () => {
    failWith({ code: 'SUBMIT_FORBIDDEN', message: 'Not allowed.' });
    const error = await rejection(submitRequest('draft-1'));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(SubmissionInvalidError);
    expect(error).not.toBeInstanceOf(SubmissionIncompleteError);
    expect(error).toMatchObject({ code: 'SUBMIT_FORBIDDEN', status: 400 });
  });
});
