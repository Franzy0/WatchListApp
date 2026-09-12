<template>
  <ion-card class="movie-card">
    <!-- A stretched transparent button rather than a click handler on the card host.
         The card also contains edit and delete buttons, and nesting those inside a
         clickable card gives unreliable hit-testing; this keeps one real button for the
         open gesture and gets keyboard focus for free. -->
    <button
      type="button"
      class="card-open"
      :aria-label="`Open ${movie.title}`"
      @click="$emit('click', movie)"
    ></button>

    <div class="movie-poster">
      <img
        v-if="movie.posterUrl && !posterFailed"
        :src="movie.posterUrl"
        :alt="`${movie.title} poster`"
        class="poster-img"
        loading="lazy"
        decoding="async"
        @load="posterLoaded = true"
        @error="posterFailed = true"
      />
      <div v-else class="poster-placeholder">
        <ion-icon :icon="filmOutline" class="poster-icon" />
        <span class="poster-text">{{ movie.title }}</span>
      </div>

      <div
        v-if="movie.posterUrl && !posterFailed && !posterLoaded"
        class="poster-skeleton"
        aria-hidden="true"
      ></div>

      <div class="poster-scrim" aria-hidden="true"></div>

      <div class="poster-badges">
        <span class="status-pill" :class="statusClass">
          <ion-icon :icon="statusIcon" />
          <span>{{ movie.status === 'Watched' ? 'Watched' : 'To watch' }}</span>
        </span>
        <span class="rating-badge">
          <ion-icon :icon="star" />
          <span>{{ ratingLabel }}</span>
        </span>
      </div>
    </div>

    <div class="card-content">
      <h3 class="movie-title">{{ movie.title }}</h3>
      <p class="movie-subtitle">{{ genreLabel }} &bull; {{ movie.year }}</p>

      <div class="movie-actions">
        <ion-button
          fill="clear"
          size="small"
          color="medium"
          class="action-btn"
          :aria-label="`Edit ${movie.title}`"
          @click.stop="$emit('edit', movie)"
        >
          <ion-icon slot="icon-only" :icon="createOutline" />
        </ion-button>

        <ion-button
          fill="clear"
          size="small"
          color="danger"
          class="action-btn"
          :aria-label="`Delete ${movie.title}`"
          @click.stop="$emit('delete', movie)"
        >
          <ion-icon slot="icon-only" :icon="trashOutline" />
        </ion-button>
      </div>
    </div>
  </ion-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IonCard, IonButton, IonIcon } from '@ionic/vue';
import {
  filmOutline,
  star,
  createOutline,
  trashOutline,
  checkmarkCircle,
  bookmarkOutline
} from 'ionicons/icons';
import type { Movie } from '../types/movie';

interface Props {
  movie: Movie;
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'click', movie: Movie): void;
  (e: 'edit', movie: Movie): void;
  (e: 'delete', movie: Movie): void;
}>();

const posterLoaded = ref(false);
const posterFailed = ref(false);

// Editing a movie swaps the URL on a component the list keeps alive, so the load and
// error flags have to be reset or a replaced poster stays stuck behind its skeleton.
watch(
  () => props.movie.posterUrl,
  () => {
    posterLoaded.value = false;
    posterFailed.value = false;
  }
);

const statusClass = computed(() => ({
  'status-watched': props.movie.status === 'Watched',
  'status-not-watched': props.movie.status === 'Not Watched'
}));

const statusIcon = computed(() =>
  props.movie.status === 'Watched' ? checkmarkCircle : bookmarkOutline
);

// One line, clipped rather than wrapped: the card has room for a single meta row.
const genreLabel = computed(() =>
  props.movie.genre?.length ? props.movie.genre.join(', ') : 'Unsorted'
);

// A rating of 0 is a real rating, so only a missing value reads as N/A.
const ratingLabel = computed(() =>
  props.movie.rating != null && Number.isFinite(props.movie.rating)
    ? props.movie.rating.toFixed(1)
    : 'N/A'
);
</script>

<style scoped>
.movie-card {
  position: relative;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius-lg);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.movie-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-open {
  position: absolute;
  /* Stops short of the action row so the edit and delete buttons stay reachable. */
  inset: 0 0 52px 0;
  z-index: 1;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.card-open:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: -4px;
  border-radius: var(--radius-lg);
}

/* Poster */
.movie-poster {
  position: relative;
  width: 100%;
  aspect-ratio: var(--poster-ratio);
  background: var(--poster-placeholder-gradient);
  overflow: hidden;
}

.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-tertiary);
}

.poster-icon {
  font-size: 2.5rem;
  opacity: 0.7;
}

.poster-text {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poster-skeleton {
  position: absolute;
  inset: 0;
  background: var(--skeleton-base);
  overflow: hidden;
}

.poster-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--skeleton-sheen), transparent);
  transform: translateX(-100%);
  animation: poster-shimmer 1.4s infinite;
}

@keyframes poster-shimmer {
  to {
    transform: translateX(100%);
  }
}

/* Keeps the badges legible whatever the artwork does underneath. */
.poster-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0.12) 30%,
    rgba(0, 0, 0, 0) 60%
  );
}

.poster-badges {
  position: absolute;
  top: var(--spacing-xs);
  left: var(--spacing-xs);
  right: var(--spacing-xs);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-xs);
  pointer-events: none;
}

.status-pill,
.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  white-space: nowrap;
}

.status-pill ion-icon,
.rating-badge ion-icon {
  font-size: 12px;
}

.status-watched {
  background: rgba(var(--success-color-rgb), 0.9);
  color: #06240f;
}

.status-not-watched {
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
}

.rating-badge {
  background: rgba(var(--warning-color-rgb), 0.92);
  color: #2b1a00;
}

/* Body */
.card-content {
  padding: var(--spacing-sm) var(--spacing-md) 0;
}

.movie-title {
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
  line-height: 1.25;
  letter-spacing: 0.2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.movie-subtitle {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.movie-actions {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  height: 52px;
  align-items: center;
}

.action-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  --box-shadow: none;
  min-height: 36px;
  margin: 0;
}

@media (max-width: 767.98px) {
  .poster-icon {
    font-size: 2rem;
  }

  .movie-title {
    font-size: var(--font-size-sm);
  }
}
</style>
