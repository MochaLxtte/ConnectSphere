<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import HealthCheckCard from '../components/HealthCheckCard.vue';
import { checkApi, checkDatabase } from '../api/health';

type CheckState = { status: 'pending' | 'success' | 'error'; message: string };
const pending = (): CheckState => ({ status: 'pending', message: 'Checking the connection…' });
const api = ref<CheckState>(pending());
const database = ref<CheckState>(pending());
const checking = computed(
  () => api.value.status === 'pending' || database.value.status === 'pending',
);
let controller: AbortController | undefined;

async function runChecks() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  api.value = pending();
  database.value = pending();
  const run = async (
    check: typeof checkApi | typeof checkDatabase,
    target: typeof api,
    success: string,
  ) => {
    try {
      await check(current.signal);
      if (!current.signal.aborted) target.value = { status: 'success', message: success };
    } catch (error) {
      if (!current.signal.aborted)
        target.value = {
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'The connection check failed. Please try again.',
        };
    }
  };
  await Promise.all([
    run(checkApi, api, 'The backend is reachable and responding.'),
    run(checkDatabase, database, 'The backend can connect to PostgreSQL.'),
  ]);
}

onMounted(runChecks);
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading heading-with-badge">
    <div>
      <p class="eyebrow">Workspace overview</p>
      <h1>Project overview</h1>
      <p class="page-description">A starting point for your team’s event planning application.</p>
    </div>
    <span class="stage-badge"><span class="tiny-dot"></span>Project scaffold</span>
  </section>

  <section class="welcome-panel" aria-labelledby="welcome-title">
    <div class="welcome-copy">
      <span class="welcome-kicker">ConnectSphere Event Services</span>
      <h2 id="welcome-title">Event planning,<br />in one place.</h2>
      <p>
        Organise event requests, coordinate reviews, and follow decisions in one shared workspace.
      </p>
      <RouterLink to="/events" class="button button-light"
        >Explore event requests<AppIcon name="arrow" :size="17"
      /></RouterLink>
    </div>
    <div class="welcome-art" aria-hidden="true">
      <div class="art-orbit orbit-one"></div>
      <div class="art-orbit orbit-two"></div>
      <div class="art-orbit orbit-three"></div>
      <span class="art-center"><AppIcon name="calendar" :size="42" /></span
      ><span class="art-dot art-dot-one"></span><span class="art-dot art-dot-two"></span
      ><span class="art-spark">✳</span><span class="art-caption">Plan. Review. Coordinate.</span>
    </div>
  </section>

  <section class="workflow-section" aria-labelledby="workflow-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Event request workflow</p>
        <h2 id="workflow-title">From request to decision.</h2>
      </div>
      <span class="section-caption">Planned workflow</span>
    </div>
    <div class="workflow-grid">
      <RouterLink to="/events/new" class="workflow-card"
        ><span class="step-number">01 / ORGANISE</span
        ><span class="workflow-icon"><AppIcon name="plus" :size="23" /></span>
        <h3>Create an event request<AppIcon name="arrow" :size="18" /></h3>
        <p>Create an event request and prepare the details before submitting.</p>
        <span class="small-label">Draft & submit</span></RouterLink
      >
      <RouterLink to="/reviews" class="workflow-card"
        ><span class="step-number">02 / COORDINATE</span
        ><span class="workflow-icon"><AppIcon name="review" :size="23" /></span>
        <h3>Review event requests<AppIcon name="arrow" :size="18" /></h3>
        <p>Review submissions, ask for clarification, and record a decision.</p>
        <span class="small-label">Review & decide</span></RouterLink
      >
      <RouterLink to="/events" class="workflow-card"
        ><span class="step-number">03 / TRACK</span
        ><span class="workflow-icon"><AppIcon name="calendar" :size="23" /></span>
        <h3>Follow request status<AppIcon name="arrow" :size="18" /></h3>
        <p>Keep track of request status as an event moves through review.</p>
        <span class="small-label">Track progress</span></RouterLink
      >
    </div>
    <p class="workflow-note">
      These pages are starting points. Event and account features are ready for your team to build.
    </p>
  </section>

  <section class="system-section" aria-labelledby="system-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Development environment</p>
        <h2 id="system-title">Connection check</h2>
      </div>
      <button class="button button-secondary" type="button" :disabled="checking" @click="runChecks">
        <AppIcon name="refresh" :size="16" />{{ checking ? 'Checking…' : 'Check again' }}
      </button>
    </div>
    <div class="health-grid">
      <HealthCheckCard
        title="API service"
        description="The connection between this workspace and the backend."
        icon="server"
        :state="api"
      /><HealthCheckCard
        title="Database"
        description="The backend’s connection to the project database."
        icon="database"
        :state="database"
      />
    </div>
  </section>
</template>
