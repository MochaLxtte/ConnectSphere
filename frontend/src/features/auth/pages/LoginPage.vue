<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '../../../lib/api-client.js';
import { authSession, roleLabel, signIn } from '../session.js';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const submitting = ref(false);

async function submit(): Promise<void> {
  error.value = null;
  submitting.value = true;
  try {
    await signIn(email.value.trim(), password.value);
    await router.push('/');
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message
      : cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Your account</p>
    <h1>Welcome to ConnectSphere</h1>
    <p class="page-description">Sign in with your approved account.</p>
  </section>
  <section v-if="authSession.user" class="panel account-panel" aria-labelledby="signed-in-title">
    <p class="eyebrow">Signed in</p>
    <h2 id="signed-in-title">{{ authSession.user.displayName }}</h2>
    <p>{{ roleLabel(authSession.user.role) }}</p>
    <RouterLink class="button button-primary" to="/">Go to overview</RouterLink>
  </section>
  <form v-else class="panel login-form" @submit.prevent="submit">
    <label>
      Email address
      <input v-model="email" type="email" autocomplete="email" required :disabled="submitting" />
    </label>
    <label>
      Password
      <input v-model="password" type="password" autocomplete="current-password" required :disabled="submitting" />
    </label>
    <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
    <button class="button button-primary" type="submit" :disabled="submitting">
      {{ submitting ? 'Signing in…' : 'Sign in' }}
    </button>
  </form>
</template>
