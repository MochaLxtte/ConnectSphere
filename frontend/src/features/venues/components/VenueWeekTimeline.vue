<script setup lang="ts">
import { computed, useId } from 'vue';
import type { VenueAvailability } from '../api/availability';
import {
  calendarWeek, formatClock, formatDay, formatInstant, formatTimeRange, hourTicks, HOUR_MS, timelineRange,
  type AgendaItem, type CalendarDay, type DaySegment, type DayStatus,
} from '../availability';

/** KAN-51: one venue's week. The bars are for scanning; each day's agenda carries the same facts in text. */
const props = defineProps<{
  venue: VenueAvailability;
  /** Monday of the week shown, as `YYYY-MM-DD` in Singapore time. */
  weekStart: string;
  today: string;
}>();

const id = useId();
const days = computed(() => calendarWeek(props.venue, props.weekStart));
const range = computed(() => timelineRange(props.venue, days.value));
const ticks = computed(() => hourTicks(range.value));
const span = computed(() => range.value.end - range.value.start);

const dayStatusLabels: Record<DayStatus, string> = {
  AVAILABLE: 'Available', PARTLY_AVAILABLE: 'Partly available', UNAVAILABLE: 'Unavailable',
};

const offset = (time: number) => `${((time - range.value.start) / span.value) * 100}%`;

function barStyle(segment: DaySegment) {
  const start = Math.max(segment.start, range.value.start);
  const end = Math.min(segment.end, range.value.end);
  return { left: offset(start), width: `${((end - start) / span.value) * 100}%` };
}

function visibleSegments(day: CalendarDay): DaySegment[] {
  return day.segments.filter((segment) => segment.end > range.value.start && segment.start < range.value.end);
}

function agendaLabel(item: AgendaItem): string {
  if (item.kind === 'AVAILABLE') return 'Available';
  return item.period.kind === 'BOOKING' ? 'Booked' : 'Blocked';
}

function agendaKey(item: AgendaItem): string {
  return item.kind === 'AVAILABLE' ? `available-${item.start}` : `${item.period.id}-${item.start}`;
}
</script>

<template>
  <div class="week-timeline" :style="{ '--hours': String(span / HOUR_MS) }">
    <ul class="timeline-legend" aria-label="Legend">
      <li><span class="legend-swatch bar-segment--available" aria-hidden="true"></span>Available</li>
      <li><span class="legend-swatch bar-segment--booked" aria-hidden="true"></span>Booked: confirmed venue booking</li>
      <li><span class="legend-swatch bar-segment--blocked" aria-hidden="true"></span>Blocked: operational unavailability</li>
      <li><span class="legend-swatch bar-segment--closed" aria-hidden="true"></span>Closed: outside opening hours</li>
    </ul>

    <div class="timeline-scale" aria-hidden="true">
      <span class="scale-track">
        <span v-for="tick in ticks" :key="tick" class="scale-tick" :style="{ left: offset(tick) }">{{ formatClock(tick) }}</span>
      </span>
    </div>

    <ol class="day-list" :aria-label="`${venue.name} availability by day`">
      <li v-for="day in days" :key="day.key" class="day-row" :class="{ 'day-row--today': day.key === today }">
        <div class="day-heading">
          <h3 :id="`${id}-${day.key}`">{{ formatDay(day.key) }}</h3>
          <span v-if="day.key === today" class="today-tag">Today</span>
          <span class="day-status" :class="`day-status--${day.status.toLowerCase()}`">{{ dayStatusLabels[day.status] }}</span>
        </div>
        <div class="day-bar" aria-hidden="true">
          <span
            v-for="segment in visibleSegments(day)"
            :key="segment.start"
            class="bar-segment"
            :class="`bar-segment--${segment.status.toLowerCase()}`"
            :style="barStyle(segment)"
          ></span>
        </div>
        <ul class="day-agenda" :aria-labelledby="`${id}-${day.key}`">
          <!-- Spaces and separators stay in the text so assistive technology reads each part apart. -->
          <li v-for="item in day.agenda" :key="agendaKey(item)">
            <span class="agenda-tag" :class="`agenda-tag--${agendaLabel(item).toLowerCase()}`">{{ agendaLabel(item) }}</span> <span class="agenda-text">
              <span class="agenda-time">{{ formatTimeRange(item.start, item.end) }}</span>
              <template v-if="item.kind === 'RECORDED' && item.period.kind === 'BOOKING' && item.period.event">
                · Assigned to you:
                <RouterLink :to="`/reviews/${item.period.event.id}`">{{ item.period.event.name?.trim() || 'Untitled event request' }}</RouterLink>
              </template>
              <template v-else-if="item.kind === 'RECORDED' && item.period.kind === 'BLOCKED'">
                · {{ item.period.reason?.trim() || 'No reason recorded' }}
              </template>
              <span v-if="item.kind === 'RECORDED' && item.clipped" class="agenda-note">
                · {{ formatInstant(item.period.startsAt) }} – {{ formatInstant(item.period.endsAt) }}
              </span>
            </span>
          </li>
        </ul>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.week-timeline { margin-top: 20px; }
.timeline-legend {
  list-style: none; margin: 0 0 18px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 18px;
  color: #59685e; font-size: 12px;
}
.timeline-legend li { display: inline-flex; align-items: center; gap: 7px; }
.legend-swatch { display: inline-block; width: 22px; height: 12px; border-radius: 3px; border: 1px solid #d9dfd2; }

/* The scale and the bars share one column grid, offset by the row's padding and border. */
.timeline-scale, .day-row {
  display: grid; grid-template-columns: 148px minmax(0, 1fr); column-gap: 20px;
}
.timeline-scale { padding: 0 17px; }
.scale-track { grid-column: 2; position: relative; height: 18px; }
/* Centred on their hour; the row padding leaves room for the first and last labels. */
.scale-tick {
  position: absolute; top: 0; transform: translateX(-50%); color: #59685e; font-size: 11px;
  white-space: nowrap; font-variant-numeric: tabular-nums;
}

.day-list { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 10px; }
.day-row {
  border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; row-gap: 10px;
  align-items: center;
}
.day-row--today { border-color: #b4c6a3; background: #fcfdf9; }
.day-heading {
  grid-column: 1; grid-row: 1 / span 2; align-self: start;
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px;
}
.day-heading h3 { width: 100%; font-size: 14px; font-weight: 650; letter-spacing: -0.2px; }
.today-tag, .day-status {
  display: inline-block; border-radius: 20px; padding: 2px 9px; font-size: 11px; font-weight: 600;
  line-height: 1.6;
}
.today-tag { background: #eaf0e1; color: #354c31; }
.day-status--available { background: #edf5e9; color: #365d2e; }
.day-status--partly_available { background: #fff3df; color: #805518; }
.day-status--unavailable { background: #fbeeed; color: #853e37; }

.day-bar {
  grid-column: 2; grid-row: 1; position: relative; height: 22px; overflow: hidden;
  border-radius: 5px; background: #eceee8;
}
/* Hour lines above the segments. */
.day-bar::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: linear-gradient(to right, rgba(41, 58, 51, 0.14) 1px, transparent 1px);
  background-size: calc(100% / var(--hours)) 100%;
}
.bar-segment { position: absolute; top: 0; bottom: 0; }
.bar-segment--available { background: #cfe3c0; }
.bar-segment--booked { background: #3f6690; }
.bar-segment--blocked { background: repeating-linear-gradient(135deg, #b9813f 0 5px, #e2b77c 5px 10px); }
.bar-segment--closed { background: #eceee8; }

.day-agenda {
  grid-column: 2; grid-row: 2; list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 1.6;
}
/* Long details wrap beside the tag rather than dropping below it. */
.day-agenda li { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.agenda-tag {
  flex-shrink: 0; display: inline-block; min-width: 72px; text-align: center; border-radius: 20px;
  padding: 0 9px; font-size: 12px; font-weight: 600;
}
.agenda-tag--available { background: #edf5e9; color: #365d2e; }
.agenda-tag--booked { background: #edf2fa; color: #345579; }
.agenda-tag--blocked { background: #fff2e5; color: #8a5a26; }
.agenda-text { flex: 1 1 0; min-width: 0; overflow-wrap: anywhere; }
.agenda-time { font-weight: 600; font-variant-numeric: tabular-nums; }
.agenda-text a { color: var(--green); text-decoration: underline; text-underline-offset: 3px; }
.agenda-note { color: #59685e; font-size: 12px; }

@media (max-width: 700px) {
  .timeline-scale, .day-row { grid-template-columns: minmax(0, 1fr); }
  .scale-track, .day-heading, .day-bar, .day-agenda { grid-column: 1; grid-row: auto; }
  .day-heading h3 { width: auto; }
  .scale-tick { font-size: 10px; }
}
@media (max-width: 400px) {
  .scale-tick:nth-child(even) { visibility: hidden; }
}
</style>
