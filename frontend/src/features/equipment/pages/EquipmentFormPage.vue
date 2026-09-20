<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { createEquipmentType, fetchEquipmentType, updateEquipmentType } from '../api/equipment';
import { equipmentErrorMessage, isSessionExpired } from '../presentation';
import '../equipment.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'ready' };

const route = useRoute();
const router = useRouter();
const equipmentId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const editing = computed(() => equipmentId.value !== '');
const isStaff = computed(() => authSession.user?.role === 'TECHNICAL_SUPPORT_STAFF');

const state = ref<LoadState>({ status: 'loading' });
const name = ref('');
const category = ref('');
const description = ref('');
const totalQuantity = ref<number | string>(1);
const isActive = ref(true);
const saving = ref(false);
const formError = ref('');
const fieldErrors = ref<{ name?: string; totalQuantity?: string }>({});
let controller: AbortController | undefined;

function showSignIn() {
  controller?.abort();
  state.value = { status: 'error', signIn: true, retryable: false, message: 'Sign in to manage equipment.' };
}

function resetForm() {
  name.value = '';
  category.value = '';
  description.value = '';
  totalQuantity.value = 1;
  isActive.value = true;
  formError.value = '';
  fieldErrors.value = {};
}

async function load() {
  controller?.abort();
  resetForm();
  if (!authSession.user) return showSignIn();
  if (!isStaff.value) {
    state.value = {
      status: 'error', signIn: false, retryable: false,
      message: 'Only technical support staff can manage equipment.',
    };
    return;
  }
  if (!editing.value) {
    state.value = { status: 'ready' };
    return;
  }
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const type = await fetchEquipmentType(equipmentId.value, current.signal);
    if (current.signal.aborted) return;
    name.value = type.name;
    category.value = type.category ?? '';
    description.value = type.description ?? '';
    totalQuantity.value = type.totalQuantity;
    isActive.value = type.isActive;
    state.value = { status: 'ready' };
  } catch (error) {
    if (current.signal.aborted) return;
    if (isSessionExpired(error)) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const unavailable = error instanceof ApiError && [400, 403, 404].includes(error.status);
    state.value = {
      status: 'error', signIn: false, retryable: !unavailable,
      message: unavailable ? 'This equipment type is unavailable.'
        : 'The equipment type could not be loaded. Please try again.',
    };
  }
}

function validate(): number | null {
  const errors: typeof fieldErrors.value = {};
  if (!name.value.trim()) errors.name = 'Enter a name.';
  const quantity = Number(totalQuantity.value);
  if (String(totalQuantity.value).trim() === '' || !Number.isInteger(quantity) || quantity < 0) {
    errors.totalQuantity = 'Enter a whole number of 0 or more.';
  }
  fieldErrors.value = errors;
  return Object.keys(errors).length === 0 ? quantity : null;
}

async function save() {
  if (saving.value) return;
  formError.value = '';
  const quantity = validate();
  if (quantity === null) return;
  saving.value = true;
  const input = {
    name: name.value.trim(),
    category: category.value.trim() || null,
    description: description.value.trim() || null,
    totalQuantity: quantity,
    isActive: isActive.value,
  };
  try {
    if (editing.value) await updateEquipmentType(equipmentId.value, input);
    else await createEquipmentType(input);
    await router.push('/equipment');
  } catch (error) {
    if (isSessionExpired(error)) {
      clearLocalSession();
      showSignIn();
    } else if (error instanceof ApiError && error.code === 'EQUIPMENT_NAME_TAKEN') {
      fieldErrors.value = { name: 'Another equipment type already uses this name.' };
    } else if (error instanceof ApiError && error.code === 'EQUIPMENT_QUANTITY_IN_USE') {
      fieldErrors.value = { totalQuantity: error.message };
    } else {
      formError.value = equipmentErrorMessage(error, 'The equipment type could not be saved. Please try again.');
    }
  } finally {
    saving.value = false;
  }
}

watch(equipmentId, () => { void load(); }, { immediate: true });
watch(() => [authSession.user?.id, authSession.user?.role], () => { void load(); }, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For technical support</p>
    <h1>{{ editing ? 'Edit equipment' : 'Add equipment' }}</h1>
    <p class="page-description">Equipment is pooled by type: set how many exist in total.</p>
  </section>

  <p class="form-back"><RouterLink to="/equipment" class="back-link">Back to equipment</RouterLink></p>

  <p v-if="state.status === 'loading'" class="panel eq-panel" role="status">Loading the equipment type…</p>
  <div v-else-if="state.status === 'error'" class="panel eq-panel eq-state" role="alert">
    <p>{{ state.message }}</p>
    <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
    <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
  </div>

  <form v-else class="panel eq-panel eq-form equipment-form" novalidate :aria-busy="saving" @submit.prevent="save">
    <div class="eq-field-group">
      <label class="eq-field">Name
        <input
          v-model="name" type="text" name="name" maxlength="120" required autocomplete="off"
          :aria-invalid="fieldErrors.name ? 'true' : undefined" aria-describedby="equipment-name-error"
        />
      </label>
      <p v-if="fieldErrors.name" id="equipment-name-error" class="eq-error" role="alert">{{ fieldErrors.name }}</p>
    </div>
    <div class="eq-form-grid form-row">
      <label class="eq-field">Category <span class="eq-optional">(optional)</span>
        <input v-model="category" type="text" name="category" maxlength="80" autocomplete="off" />
      </label>
      <div class="eq-field-group">
        <label class="eq-field">Total quantity
          <input
            v-model="totalQuantity" type="number" name="totalQuantity" min="0" step="1" inputmode="numeric" required
            :aria-invalid="fieldErrors.totalQuantity ? 'true' : undefined" aria-describedby="equipment-quantity-error"
          />
        </label>
        <p v-if="fieldErrors.totalQuantity" id="equipment-quantity-error" class="eq-error" role="alert">{{ fieldErrors.totalQuantity }}</p>
      </div>
    </div>
    <label class="eq-field">Description <span class="eq-optional">(optional)</span>
      <textarea v-model="description" name="description" rows="4" maxlength="2000" />
    </label>
    <label class="eq-check">
      <input v-model="isActive" type="checkbox" name="isActive" />
      <span>Active: organisers can see and request this equipment</span>
    </label>

    <p v-if="formError" class="eq-error" role="alert">{{ formError }}</p>
    <div class="eq-actions">
      <button type="submit" class="button button-primary" :disabled="saving">
        {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Add equipment' }}
      </button>
      <RouterLink to="/equipment" class="button button-secondary">Cancel</RouterLink>
    </div>
  </form>
</template>

<style scoped>
.form-back { margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.equipment-form { max-width: 720px; }
.form-row { align-items: start; }
</style>
