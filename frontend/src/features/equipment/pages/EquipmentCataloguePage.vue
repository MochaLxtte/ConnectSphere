<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { authSession, clearLocalSession } from '../../auth/session.js';
import {
  fetchAllEquipmentAvailability, fetchEquipmentAvailability, fetchEquipmentTypes, updateEquipmentType,
  type EquipmentAvailability, type EquipmentType,
} from '../api/equipment';
import {
  availabilityLabel, equipmentErrorMessage, formatPeriod, fromSingaporeInput, isSessionExpired,
} from '../presentation';
import '../equipment.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean }
  | { status: 'ready'; items: EquipmentType[] };
type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; from: string; to: string; byType: Map<string, EquipmentAvailability> };

const state = ref<LoadState>({ status: 'loading' });
const lookup = ref<LookupState>({ status: 'idle' });
const search = ref('');
const category = ref('');
const knownCategories = ref<string[]>([]);
const from = ref('');
const to = ref('');
const lookupError = ref('');
const togglingId = ref<string | null>(null);
const toggleError = ref('');
let controller: AbortController | undefined;
let lookupController: AbortController | undefined;

const isStaff = computed(() => authSession.user?.role === 'TECHNICAL_SUPPORT_STAFF');

function showSignIn() {
  controller?.abort();
  lookupController?.abort();
  lookup.value = { status: 'idle' };
  state.value = { status: 'error', signIn: true, message: 'Sign in to view equipment.' };
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  toggleError.value = '';
  try {
    const items = await fetchEquipmentTypes({ q: search.value, category: category.value }, current.signal);
    if (current.signal.aborted) return;
    const categories = new Set(knownCategories.value);
    for (const item of items) if (item.category) categories.add(item.category);
    knownCategories.value = [...categories].sort((a, b) => a.localeCompare(b));
    state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (isSessionExpired(error)) {
      clearLocalSession();
      showSignIn();
      return;
    }
    state.value = {
      status: 'error', signIn: false,
      message: equipmentErrorMessage(error, 'The equipment list could not be loaded. Please try again.'),
    };
  }
}

async function checkAvailability() {
  lookupError.value = '';
  const fromIso = fromSingaporeInput(from.value);
  const toIso = fromSingaporeInput(to.value);
  if (!fromIso || !toIso) {
    lookupError.value = 'Enter both a start and an end.';
    return;
  }
  if (Date.parse(toIso) <= Date.parse(fromIso)) {
    lookupError.value = 'The end must be later than the start.';
    return;
  }
  lookupController?.abort();
  const current = new AbortController();
  lookupController = current;
  lookup.value = { status: 'loading' };
  try {
    const items = await fetchAllEquipmentAvailability(fromIso, toIso, current.signal);
    const byType = new Map<string, EquipmentAvailability>(items.map((item) => [item.equipmentTypeId, item]));
    // The all-types lookup covers active types only; staff also see inactive rows in the list.
    if (isStaff.value && state.value.status === 'ready') {
      const inactive = state.value.items.filter((item) => !item.isActive);
      const extra = await Promise.all(inactive.map((item) =>
        fetchEquipmentAvailability(item.id, fromIso, toIso, current.signal)));
      for (const item of extra) byType.set(item.equipmentTypeId, item);
    }
    if (!current.signal.aborted) lookup.value = { status: 'ready', from: fromIso, to: toIso, byType };
  } catch (error) {
    if (current.signal.aborted) return;
    if (isSessionExpired(error)) {
      clearLocalSession();
      showSignIn();
      return;
    }
    lookup.value = {
      status: 'error',
      message: equipmentErrorMessage(error, 'Availability could not be checked. Please try again.'),
    };
  }
}

function clearLookup() {
  lookupController?.abort();
  lookup.value = { status: 'idle' };
  lookupError.value = '';
}

function availabilityFor(id: string): EquipmentAvailability | undefined {
  return lookup.value.status === 'ready' ? lookup.value.byType.get(id) : undefined;
}

async function toggleActive(item: EquipmentType) {
  if (togglingId.value) return;
  togglingId.value = item.id;
  toggleError.value = '';
  try {
    const saved = await updateEquipmentType(item.id, { isActive: !item.isActive });
    if (state.value.status === 'ready') {
      state.value = {
        status: 'ready',
        items: state.value.items.map((existing) => (existing.id === saved.id ? saved : existing)),
      };
    }
  } catch (error) {
    if (isSessionExpired(error)) {
      clearLocalSession();
      showSignIn();
    } else {
      toggleError.value = equipmentErrorMessage(error, `${item.name} could not be updated. Please try again.`);
    }
  } finally {
    togglingId.value = null;
  }
}

onMounted(load);
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  clearLookup();
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => {
  controller?.abort();
  lookupController?.abort();
});
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Equipment</p>
    <h1>Equipment catalogue</h1>
    <p class="page-description">Browse shared equipment and check how many are free for a chosen period.</p>
  </section>

  <section class="panel eq-panel" aria-labelledby="availability-title">
    <header class="eq-header">
      <div>
        <h2 id="availability-title">Check availability</h2>
        <p>Times are in Singapore time. Only reserved equipment counts as unavailable.</p>
      </div>
    </header>
    <form class="eq-form" novalidate @submit.prevent="checkAvailability">
      <div class="eq-form-grid">
        <label class="eq-field">From
          <input v-model="from" type="datetime-local" name="from" :aria-invalid="lookupError ? 'true' : undefined" />
        </label>
        <label class="eq-field">To
          <input v-model="to" type="datetime-local" name="to" :aria-invalid="lookupError ? 'true' : undefined" />
        </label>
        <div class="eq-actions">
          <button type="submit" class="button button-primary" :disabled="lookup.status === 'loading'">
            {{ lookup.status === 'loading' ? 'Checking…' : 'Check availability' }}
          </button>
          <button v-if="lookup.status === 'ready'" type="button" class="button button-secondary" @click="clearLookup">
            Clear
          </button>
        </div>
      </div>
      <p v-if="lookupError" class="eq-error" role="alert">{{ lookupError }}</p>
      <p v-else-if="lookup.status === 'error'" class="eq-error" role="alert">{{ lookup.message }}</p>
      <p v-else-if="lookup.status === 'ready'" class="eq-success" role="status">
        Showing availability for {{ formatPeriod(lookup.from, lookup.to) }}.
      </p>
    </form>
  </section>

  <section class="panel eq-panel" aria-labelledby="catalogue-title">
    <header class="eq-header">
      <div>
        <h2 id="catalogue-title">Equipment types</h2>
        <p>{{ isStaff ? 'Inactive types are visible to technical support only.' : 'Quantities are shared across all events.' }}</p>
      </div>
      <div class="eq-actions">
        <RouterLink v-if="isStaff" to="/equipment/requests" class="button button-secondary">Request queue</RouterLink>
        <RouterLink v-if="isStaff" to="/equipment/new" class="button button-primary">
          <AppIcon name="plus" :size="14" /> Add equipment
        </RouterLink>
      </div>
    </header>

    <form class="eq-form catalogue-filters" role="search" aria-label="Filter equipment" @submit.prevent="load">
      <div class="eq-form-grid">
        <label class="eq-field">Search
          <input v-model="search" type="search" name="q" placeholder="Name, category or description" maxlength="120" />
        </label>
        <label class="eq-field">Category
          <select v-model="category" name="category" @change="load">
            <option value="">All categories</option>
            <option v-for="option in knownCategories" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <div class="eq-actions">
          <button type="submit" class="button button-secondary" :disabled="state.status === 'loading'">Apply</button>
        </div>
      </div>
    </form>

    <p v-if="toggleError" class="eq-error" role="alert">{{ toggleError }}</p>
    <p v-if="state.status === 'loading'" role="status">Loading equipment…</p>

    <div v-else-if="state.status === 'error'" class="eq-state" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder catalogue-empty">
      <div class="empty-illustration"><AppIcon name="grid" :size="38" /></div>
      <h2>{{ search || category ? 'No equipment matches these filters' : 'No equipment has been added yet' }}</h2>
      <p>{{ isStaff ? 'Add an equipment type so organisers can request it.' : 'Technical support maintains this catalogue.' }}</p>
    </div>

    <ul v-else class="eq-list" aria-label="Equipment types">
      <li v-for="item in state.items" :key="item.id" class="eq-item">
        <div class="eq-item-head">
          <h3>{{ item.name }}</h3>
          <span v-if="!item.isActive" class="eq-pill eq-pill--inactive">Inactive</span>
          <span
            v-else-if="availabilityFor(item.id)"
            class="eq-pill" :class="availabilityFor(item.id)!.available > 0 ? 'eq-pill--ok' : 'eq-pill--short'"
          >{{ availabilityLabel(availabilityFor(item.id)!.available, availabilityFor(item.id)!.totalQuantity) }}</span>
        </div>
        <p class="eq-item-meta">
          <span>{{ item.category ?? 'Uncategorised' }}</span>
          <span>{{ item.totalQuantity }} in total</span>
          <span v-if="!item.isActive && availabilityFor(item.id)">
            {{ availabilityLabel(availabilityFor(item.id)!.available, availabilityFor(item.id)!.totalQuantity) }}
          </span>
        </p>
        <p v-if="item.description" class="eq-item-body">{{ item.description }}</p>
        <div v-if="isStaff" class="eq-actions">
          <RouterLink :to="`/equipment/${item.id}/edit`" class="button button-secondary" :aria-label="`Edit ${item.name}`">Edit</RouterLink>
          <button
            type="button" class="button button-secondary" :disabled="togglingId !== null"
            :aria-label="`${item.isActive ? 'Deactivate' : 'Activate'} ${item.name}`" @click="toggleActive(item)"
          >{{ item.isActive ? 'Deactivate' : 'Activate' }}</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.catalogue-filters { margin-bottom: 20px; }
.catalogue-empty { min-height: 0; padding-bottom: 24px; }
</style>
