<template>
  <ion-page>
    <PageHeader title="Dashboard" />

    <ion-content :fullscreen="true">
      <div class="page-container page-container--has-fab">
        <section class="hero">
          <div
            v-if="heroPoster"
            class="hero-backdrop"
            :style="{ backgroundImage: `url(${heroPoster})` }"
            aria-hidden="true"
          ></div>
          <div class="hero-body">
            <div class="logo-section">
              <ion-icon :icon="filmOutline" class="logo-icon" />
              <h1 class="app-title">CineList</h1>
            </div>
            <p class="welcome-message">{{ welcomeMessage }}</p>
          </div>
        </section>

        <MovieStats :stats="stats" @tile-click="handleStatTile" />

        <section class="recent-section">
          <div class="section-header">
            <h2 class="section-title">Recently Added</h2>
            <ion-button fill="clear" size="small" color="primary" @click="goToWatchlist">
              View All
              <ion-icon slot="end" :icon="arrowForwardOutline" />
            </ion-button>
          </div>

          <div v-if="recentMovies.length > 0" :class="['movie-grid', { 'movie-grid--rail': isMobile }]">
            <MovieCard
              v-for="movie in recentMovies"
              :key="movie.id"
              :movie="movie"
              @click="handleOpen"
              @edit="handleEdit"
              @delete="handleDelete"
            />
          </div>

          <EmptyState
            v-else
            title="No movies yet"
            message="Add your first movie to get started!"
            @add-movie="goToAddMovie"
          />
        </section>
      </div>

      <!-- Direct child of ion-content: slot="fixed" is ignored on a deeper descendant,
           which is why this used to scroll away with the page. -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" aria-label="Add a movie" @click="goToAddMovie">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton
} from '@ionic/vue';
import { filmOutline, arrowForwardOutline, addOutline } from 'ionicons/icons';
import PageHeader from '../components/PageHeader.vue';
import MovieCard from '../components/MovieCard.vue';
import MovieStats from '../components/MovieStats.vue';
import EmptyState from '../components/EmptyState.vue';
import { movieService } from '../services/movieService';
import { useToast } from '../composables/useToast';
import { useConfirmDelete } from '../composables/useConfirmDelete';
import { useBreakpoint } from '../composables/useBreakpoint';
import type { Movie, StatKey } from '../types/movie';

const router = useRouter();
const { showToast } = useToast();
const { confirmDelete } = useConfirmDelete();
const { isMobile } = useBreakpoint();

// These read the live store, so they refresh on their own whenever the database changes.
const recentMovies = computed(() => movieService.getRecentMovies(6));
const stats = computed(() => movieService.getStats());

const heroPoster = computed(() => recentMovies.value.find(m => m.posterUrl)?.posterUrl ?? null);

const welcomeMessage = computed(() =>
  stats.value.total === 0
    ? 'Your collection is empty. Add a movie to get started.'
    : `You have ${stats.value.total} ${stats.value.total === 1 ? 'movie' : 'movies'}, ${stats.value.notWatched} still to watch.`
);

onMounted(() => {
  // The store subscribes at import time; this only surfaces a connection failure.
  movieService.getMovies().catch(error => {
    console.error('Error loading movies:', error);
    showToast('Could not reach the movie database.', 'danger');
  });
});

const goToWatchlist = () => router.push('/watchlist');
const goToAddMovie = () => router.push('/add');
const handleOpen = (movie: Movie) => router.push(`/movie/${movie.id}`);
const handleEdit = (movie: Movie) => router.push(`/edit/${movie.id}`);

/** Each tile deep-links into the watchlist with its filter already applied. */
const handleStatTile = (key: StatKey) => {
  const query: Record<string, string> = {
    total: { status: 'all' },
    watched: { status: 'watched' },
    notWatched: { status: 'not-watched' },
    avgRating: { status: 'all', sort: 'rating-desc' }
  }[key] as Record<string, string>;

  router.push({ path: '/watchlist', query });
};

const handleDelete = async (movie: Movie) => {
  const confirmed = await confirmDelete({
    subHeader: `Remove "${movie.title}" from your watchlist?`
  });
  if (!confirmed) return;

  try {
    await movieService.deleteMovie(movie.id);
    showToast('Movie deleted.');
  } catch (error) {
    console.error('Error deleting movie:', error);
    showToast('Could not delete that movie.', 'danger');
  }
};
</script>

<style scoped>
/* Hero */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-2xl);
  background: var(--hero-gradient), var(--surface-1);
  border: 1px solid var(--border-color);
}

/* The newest poster, blurred out of recognition, as a cheap cinematic backdrop. It is
   an image the page has already loaded, so it costs nothing extra. */
.hero-backdrop {
  position: absolute;
  inset: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(40px);
  opacity: 0.35;
  transform: scale(1.1);
}

.hero-body {
  position: relative;
  padding: var(--spacing-2xl) var(--spacing-xl);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  font-size: 2.25rem;
  color: var(--primary-color);
}

.app-title {
  font-family: var(--font-display);
  font-size: var(--font-size-4xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.welcome-message {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  margin: var(--spacing-xs) 0 0;
}

/* Recent */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.section-header ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
  min-height: 36px;
  font-size: var(--font-size-xs);
}

@media (max-width: 767.98px) {
  .hero-body {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  .app-title {
    font-size: var(--font-size-3xl);
  }

  .welcome-message {
    font-size: var(--font-size-sm);
  }

  /* Let the rail bleed to the screen edges so the next card peeks in. */
  .movie-grid--rail {
    margin: 0 calc(var(--spacing-md) * -1);
    padding: 0 var(--spacing-md) var(--spacing-xs);
  }
}
</style>
