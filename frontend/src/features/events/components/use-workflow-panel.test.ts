import { render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api-client';
import { usePanelAction, usePanelList } from './use-workflow-panel';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((success, failure) => { resolve = success; reject = failure; });
  return { promise, resolve, reject };
}

function mountList(fetcher: (id: string, signal: AbortSignal) => Promise<string[]>) {
  let panel!: ReturnType<typeof usePanelList<string>>;
  const Harness = defineComponent({
    props: { eventRequestId: { type: String, required: true } },
    setup(props) {
      panel = usePanelList(() => props.eventRequestId, fetcher);
      return () => null;
    },
  });
  const view = render(Harness, { props: { eventRequestId: 'event-a' } });
  return { panel, view };
}

describe('KAN-27/KAN-15 workflow list response ownership', () => {
  it('keeps saved content visible during a refresh and replaces it only with the refreshed list', async () => {
    const initial = deferred<string[]>();
    const refreshed = deferred<string[]>();
    const fetcher = vi.fn().mockReturnValueOnce(initial.promise).mockReturnValueOnce(refreshed.promise);
    const { panel } = mountList(fetcher);
    expect(panel.loading.value).toBe(true);
    expect(panel.items.value).toEqual([]);

    initial.resolve(['Saved clarification']);
    await flushPromises();
    expect(panel.loading.value).toBe(false);
    const pending = panel.load();
    expect(panel.loading.value).toBe(false);
    expect(panel.items.value).toEqual(['Saved clarification']);

    refreshed.resolve(['Saved clarification', 'Organiser response']);
    await pending;
    expect(panel.items.value).toEqual(['Saved clarification', 'Organiser response']);
    expect(panel.loadError.value).toBeNull();
    expect(fetcher.mock.calls.map(([id]) => id)).toEqual(['event-a', 'event-a']);
  });

  it.each(['success', 'failure'] as const)('ignores a superseded event read that settles with %s', async outcome => {
    const previous = deferred<string[]>();
    const current = deferred<string[]>();
    const fetcher = vi.fn().mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const { panel, view } = mountList(fetcher);
    const oldSignal = fetcher.mock.calls[0][1] as AbortSignal;

    await view.rerender({ eventRequestId: 'event-b' });
    expect(oldSignal.aborted).toBe(true);
    expect(fetcher.mock.calls[1][0]).toBe('event-b');
    expect(panel.items.value).toEqual([]);
    expect(panel.loading.value).toBe(true);

    if (outcome === 'success') previous.resolve(['Private event A information']);
    else previous.reject(new ApiError('Old event is unavailable', 404, 'EVENT_NOT_FOUND'));
    await flushPromises();
    // The old request must not stop event B's loading indicator or display an old error.
    expect(panel.loading.value).toBe(true);
    expect(panel.items.value).toEqual([]);
    expect(panel.loadError.value).toBeNull();

    current.resolve(['Event B information']);
    await flushPromises();
    expect(panel.loading.value).toBe(false);
    expect(panel.items.value).toEqual(['Event B information']);
    expect(panel.loadError.value).toBeNull();
  });

  it('aborts an unfinished read when its panel is unmounted', async () => {
    const pending = deferred<string[]>();
    const fetcher = vi.fn().mockReturnValue(pending.promise);
    const { panel, view } = mountList(fetcher);
    const signal = fetcher.mock.calls[0][1] as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);

    pending.resolve(['An abandoned response']);
    await flushPromises();
    expect(panel.items.value).toEqual([]);
  });

  it.each([
    { error: new ApiError('Expired', 401, 'AUTHENTICATION_REQUIRED'), expected: 'Sign in again to continue.' },
    { error: new ApiError('Missing', 404, 'EVENT_NOT_FOUND'), expected: 'This event request is unavailable or you no longer have access to it.' },
    { error: new ApiError('Refresh the request.', 409, 'STALE_REQUEST'), expected: 'Refresh the request.' },
    { error: new Error('Internal transport detail'), expected: 'This information could not be loaded. Please try again.' },
  ])('shows actionable read failure feedback and clears it after a successful retry: $expected', async ({ error, expected }) => {
    const fetcher = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(['Current information']);
    const { panel } = mountList(fetcher);
    await flushPromises();
    expect(panel.loading.value).toBe(false);
    expect(panel.loadError.value).toBe(expected);
    expect(panel.items.value).toEqual([]);

    const retried = panel.load();
    expect(panel.loading.value).toBe(true);
    await retried;
    expect(panel.items.value).toEqual(['Current information']);
    expect(panel.loadError.value).toBeNull();
    expect(panel.loading.value).toBe(false);
  });
});

describe('KAN-27/KAN-15 workflow action coordination', () => {
  it('ignores duplicate writes until both the first write and its refresh finish', async () => {
    const write = deferred<unknown>();
    const refresh = deferred<void>();
    const action = vi.fn().mockReturnValue(write.promise);
    const duplicate = vi.fn().mockResolvedValue(undefined);
    const onSaved = vi.fn().mockReturnValue(refresh.promise);
    const panel = usePanelAction(onSaved);

    const pending = panel.run(action, 'Question sent.');
    expect(panel.busy.value).toBe(true);
    await expect(panel.run(duplicate, 'Duplicate sent.')).resolves.toBe(false);
    expect(duplicate).not.toHaveBeenCalled();
    expect(panel.savedMessage.value).toBeNull();

    write.resolve(undefined);
    await flushPromises();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(panel.busy.value).toBe(true);
    await expect(panel.run(duplicate, 'Duplicate sent.')).resolves.toBe(false);
    expect(duplicate).not.toHaveBeenCalled();

    refresh.resolve(undefined);
    await expect(pending).resolves.toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(panel.busy.value).toBe(false);
    expect(panel.savedMessage.value).toBe('Question sent.');
    expect(panel.actionError.value).toBeNull();
  });

  it.each([
    { error: new ApiError('This request changed.', 409, 'STALE_REQUEST'), expected: 'This request changed.' },
    { error: new Error('Private low-level detail'), expected: 'The change could not be saved. Refresh the page before trying again.' },
  ])('does not refresh or claim success after a failed write: $expected', async ({ error, expected }) => {
    const onSaved = vi.fn();
    const panel = usePanelAction(onSaved);
    const action = vi.fn().mockRejectedValue(error);

    await expect(panel.run(action, 'Saved.')).resolves.toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
    expect(panel.busy.value).toBe(false);
    expect(panel.actionError.value).toBe(expected);
    expect(panel.savedMessage.value).toBeNull();

    panel.reset();
    expect(panel.actionError.value).toBeNull();
    await expect(panel.run(vi.fn().mockResolvedValue(undefined), 'Saved after refresh.')).resolves.toBe(true);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(panel.savedMessage.value).toBe('Saved after refresh.');
    panel.reset();
    expect(panel.savedMessage.value).toBeNull();
    expect(panel.actionError.value).toBeNull();
  });
});
