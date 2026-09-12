<template>
  <div class="stats-container">
    <button
      v-for="tile in tiles"
      :key="tile.key"
      type="button"
      class="stat-card"
      :aria-label="`${tile.label}: ${tile.value}. Show these in the watchlist.`"
      @click="$emit('tile-click', tile.key)"
    >
      <span class="icon-chip" :class="tile.chipClass">
        <ion-icon :icon="tile.icon" />
      </span>
      <span class="stat-content">
        <span class="stat-label">{{ tile.label }}</span>
        <span class="stat-value">{{ tile.value }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { filmOutline, checkmarkCircle, bookmarkOutline, star } from 'ionicons/icons';
import type { MovieStats, StatKey } from '../types/movie';

interface Props {
  stats: MovieStats;
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'tile-click', key: StatKey): void;
}>();

// Stats arrive as a prop now. Fetching them here meant the tiles read a plain module
// variable through a computed with no reactive dependency, so they showed zero forever.
const tiles = computed(() => [
  {
    key: 'total' as StatKey,
    label: 'Total Movies',
    value: String(props.stats.total),
    icon: filmOutline,
    chipClass: 'icon-chip--primary'
  },
  {
    key: 'watched' as StatKey,
    label: 'Watched',
    value: String(props.stats.watched),
    icon: checkmarkCircle,
    chipClass: 'icon-chip--success'
  },
  {
    key: 'notWatched' as StatKey,
    label: 'To Watch',
    value: String(props.stats.notWatched),
    icon: bookmarkOutline,
    chipClass: 'icon-chip--warning'
  },
  {
    key: 'avgRating' as StatKey,
    label: 'Avg. Rating',
    value: props.stats.avgRating,
    icon: star,
    chipClass: 'icon-chip--warning'
  }
]);
</script>

<style scoped>
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  padding: var(--spacing-md);
  text-align: left;
  background: var(--surface-1);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal),
    border-color var(--transition-fast);
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-color);
}

.stat-card:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.stat-value {
  font-family: var(--font-display);
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

@media (max-width: 767.98px) {
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }

  .stat-card {
    --chip-size: 44px;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  .stat-value {
    font-size: var(--font-size-2xl);
  }
}
</style>
