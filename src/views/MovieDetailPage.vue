<template>
  <ion-page>
    <PageHeader :title="movie?.title ?? 'Movie'" back-href="/watchlist" condensed />

    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <template v-else-if="movie">
        <!-- Full-bleed artwork, deliberately outside the padded container. -->
        <div class="poster-stage">
          <img
            v-if="movie.posterUrl && !posterFailed"
            :src="movie.posterUrl"
            :alt="`${movie.title} poster`"
            class="stage-art"
            @error="posterFailed = true"
          />
          <div v-else class="stage-placeholder">
            <ion-icon :icon="filmOutline" />
          </div>
          <div class="stage-scrim" aria-hidden="true"></div>

          <div class="stage-caption">
            <h1 class="detail-title">{{ movie.title }}</h1>
            <p class="detail-meta">{{ movie.year }}</p>
            <div v-if="movie.genre.length" class="genre-tags">
              <span v-for="genre in movie.genre" :key="genre" class="genre-tag">
                {{ genre }}
              </span>
            </div>
          </div>
        </div>

        <div class="page-container page-container--narrow detail-body">
          <div class="facts">
            <div class="fact">
              <span class="icon-chip icon-chip--warning"><ion-icon :icon="star" /></span>
              <span class="fact-text">
                <span class="fact-label">Rating</span>
                <span class="fact-value">{{ ratingLabel }}</span>
              </span>
            </div>

            <div class="fact">
              <span class="icon-chip" :class="statusChipClass">
                <ion-icon :icon="statusIcon" />
              </span>
              <span class="fact-text">
                <span class="fact-label">Status</span>
                <span class="fact-value">{{ movie.status }}</span>
              </span>
            </div>

            <div class="fact">
              <span class="icon-chip icon-chip--primary"><ion-icon :icon="calendarOutline" /></span>
              <span class="fact-text">
                <span class="fact-label">Added</span>
                <span class="fact-value">{{ addedLabel }}</span>
              </span>
            </div>
          </div>

          <div class="detail-actions">
            <ion-button expand="block" color="primary" :disabled="busy" @click="toggleWatched">
              <ion-icon slot="start" :icon="movie.status === 'Watched' ? bookmarkOutline : checkmarkCircle" />
              {{ movie.status === 'Watched' ? 'Mark as to watch' : 'Mark as watched' }}
            </ion-button>

            <div class="secondary-actions">
              <ion-button fill="outline" color="medium" :disabled="busy" @click="goToEdit">
                <ion-icon slot="start" :icon="createOutline" />
                Edit
              </ion-button>
              <ion-button fill="outline" color="danger" :disabled="busy" @click="handleDelete">
                <ion-icon slot="start" :icon="trashOutline" />
                Delete
              </ion-button>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="page-container page-container--narrow">
        <EmptyState
          :icon="alertCircleOutline"
          title="Movie Not Found"
          message="This movie is no longer in your watchlist."
          :show-add-button="false"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/vue';
import {
  filmOutline,
  star,
  calendarOutline,
  createOutline,
  trashOutline,
  checkmarkCircle,
  bookmarkOutline,
  alertCircleOutline
} from 'ionicons/icons';
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/EmptyState.vue';
import { movieService } from '../services/movieService';
import { useToast } from '../composables/useToast';
import { useConfirmDelete } from '../composables/useConfirmDelete';
import type { Movie } from '../types/movie';

const router = useRouter();
const route = useRoute();
const { showToast } = useToast();
const { confirmDelete } = useConfirmDelete();

const movie = ref<Movie | null>(null);
const loading = ref(true);
const busy = ref(false);
const posterFailed = ref(false);

onMounted(async () => {
  try {
    movie.value = await movieService.getMovieById(Number(route.params.id));
  } catch (error) {
    console.error('Error loading movie:', error);
    showToast('Could not load that movie.', 'danger');
  } finally {
    loading.value = false;
  }
});

const ratingLabel = computed(() => {
  const rating = movie.value?.rating;
  return rating != null && Number.isFinite(rating) ? `${rating.toFixed(1)} / 10` : 'Not rated';
});

const addedLabel = computed(() => {
  if (!movie.value?.createdAt) return 'Unknown';
  const date = new Date(movie.value.createdAt);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
});

const statusIcon = computed(() =>
  movie.value?.status === 'Watched' ? checkmarkCircle : bookmarkOutline
);

const statusChipClass = computed(() =>
  movie.value?.status === 'Watched' ? 'icon-chip--success' : 'icon-chip--warning'
);

const goToEdit = () => movie.value && router.push(`/edit/${movie.value.id}`);

const toggleWatched = async () => {
  const current = movie.value;
  if (!current) return;

  const status = current.status === 'Watched' ? 'Not Watched' : 'Watched';
  busy.value = true;
  try {
    await movieService.updateMovie(current.id, { status });
    movie.value = { ...current, status };
    showToast(status === 'Watched' ? 'Marked as watched.' : 'Moved back to your list.');
  } catch (error) {
    console.error('Error updating status:', error);
    showToast('Could not update that movie.', 'danger');
  } finally {
    busy.value = false;
  }
};

const handleDelete = async () => {
  const current = movie.value;
  if (!current) return;

  const confirmed = await confirmDelete({
    subHeader: `Remove "${current.title}" from your watchlist?`
  });
  if (!confirmed) return;

  busy.value = true;
  try {
    await movieService.deleteMovie(current.id);
    showToast('Movie deleted.');
    router.replace('/watchlist');
  } catch (error) {
    console.error('Error deleting movie:', error);
    showToast('Could not delete that movie.', 'danger');
    busy.value = false;
  }
};
</script>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.loading-container ion-spinner {
  width: 44px;
  height: 44px;
}

/* Artwork */
.poster-stage {
  position: relative;
  width: 100%;
  height: 58vh;
  max-height: 520px;
  min-height: 280px;
  overflow: hidden;
  background: var(--poster-placeholder-gradient);
}

.stage-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.stage-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  color: var(--text-tertiary);
}

.stage-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.92) 0%,
    rgba(0, 0, 0, 0.55) 35%,
    rgba(0, 0, 0, 0.05) 70%
  );
}

.stage-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.detail-title {
  font-family: var(--font-display);
  font-size: var(--font-size-4xl);
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  line-height: 1.1;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}

.detail-meta {
  font-size: var(--font-size-base);
  color: rgba(255, 255, 255, 0.82);
  margin: var(--spacing-xs) 0 0;
}

.genre-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--spacing-sm);
}

/* Sits on artwork, so the surface is a fixed translucent black in both palettes. */
.genre-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

/* Facts */
.detail-body {
  padding-top: var(--spacing-xl);
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}

.fact {
  --chip-size: 44px;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--surface-1);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.fact-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fact-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.fact-value {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--text-primary);
}

/* Actions */
.detail-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.detail-actions ion-button {
  --border-radius: var(--radius-md);
  min-height: var(--button-height-mobile);
  font-weight: 600;
}

.secondary-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.secondary-actions ion-button {
  flex: 1;
}

@media (max-width: 767.98px) {
  .poster-stage {
    height: 48vh;
  }

  .detail-title {
    font-size: var(--font-size-3xl);
  }
}
</style>
