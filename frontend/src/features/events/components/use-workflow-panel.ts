import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { ApiError } from '../../../lib/api-client';

/** Every workflow panel receives these from its host detail page. */
export interface WorkflowPanelProps {
  eventRequestId: string;
  status: string;
  viewerRole: string;
  isOwner?: boolean;
}

function messageFor(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sign in again to continue.';
    if (error.status === 404) return 'This event request is unavailable or you no longer have access to it.';
    return error.message;
  }
  return fallback;
}

/** Load a panel's list, reloading when the event changes and ignoring superseded responses. */
export function usePanelList<T>(
  eventRequestId: () => string,
  fetcher: (eventRequestId: string, signal: AbortSignal) => Promise<T[]>,
) {
  const items = ref([]) as Ref<T[]>;
  const loading = ref(true);
  const loadError = ref<string | null>(null);
  let controller: AbortController | undefined;
  let loadedOnce = false;

  async function load(): Promise<void> {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    // A refresh after a write keeps the current content on screen instead of flashing "Loading".
    loading.value = !loadedOnce;
    try {
      const loaded = await fetcher(eventRequestId(), current.signal);
      if (current.signal.aborted) return;
      items.value = loaded;
      loadError.value = null;
      loadedOnce = true;
    } catch (error) {
      if (current.signal.aborted) return;
      loadedOnce = false;
      loadError.value = messageFor(error, 'This information could not be loaded. Please try again.');
    } finally {
      if (!current.signal.aborted) loading.value = false;
    }
  }

  watch(eventRequestId, () => { items.value = []; loadedOnce = false; loadError.value = null; void load(); }, { immediate: true });
  onBeforeUnmount(() => controller?.abort());
  return { items, loading, loadError, load };
}

/** One write at a time, with busy, error and saved feedback; duplicate clicks are ignored. */
export function usePanelAction(onSaved: () => void | Promise<void>) {
  const busy = ref(false);
  const actionError = ref<string | null>(null);
  const savedMessage = ref<string | null>(null);

  async function run(action: () => Promise<unknown>, saved: string): Promise<boolean> {
    if (busy.value) return false;
    busy.value = true;
    actionError.value = null;
    savedMessage.value = null;
    try {
      await action();
      savedMessage.value = saved;
      await onSaved();
      return true;
    } catch (error) {
      actionError.value = messageFor(error, 'The change could not be saved. Refresh the page before trying again.');
      return false;
    } finally {
      busy.value = false;
    }
  }

  function reset(): void {
    actionError.value = null;
    savedMessage.value = null;
  }
  return { busy, actionError, savedMessage, run, reset };
}
