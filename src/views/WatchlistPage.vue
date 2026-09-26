<template>
  <ion-page>
    <PageHeader title="My Watchlist">
      <template #end>
        <ion-button aria-label="Sort movies" @click="showSortMenu = true">
          <ion-icon slot="icon-only" :icon="funnelOutline" />
        </ion-button>
      </template>
    </PageHeader>

    <ion-content :fullscreen="true">
      <div class="page-container page-container--has-fab">
        <div class="filter-bar glass-surface">
          <ion-searchbar
            v-model="searchQuery"
            placeholder="Search by title, genre, or year..."
            animated
            class="search-bar"
          />

          <div class="filters-section">
            <ion-segment v-model="statusFilter" mode="ios">
              <ion-segment-button value="all">
                <ion-label>All</ion-label>
              </ion-segment-button>
              <ion-segment-button value="watched">
                <ion-label>Watched</ion-label>
              </ion-segment-button>
              <ion-segment-button value="not-watched">
                <ion-label>To Watch</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-select
              v-model="genreFilter"
              label="Genre"
              label-placement="stacked"
              placeholder="All Genres"
              interface="popover"
              class="genre-select"
            >
              <ion-select-option value="all">All Genres</ion-select-option>
              <ion-select-option v-for="genre in genres" :key="genre" :value="genre">
                {{ genre }}
              </ion-select-option>
            </ion-select>
          </div>
        </div>

        <p class="result-count">
          {{ filteredMovies.length }} of {{ totalCount }}
          {{ totalCount === 1 ? 'movie' : 'movies' }}
        </p>

        <div v-if="filteredMovies.length > 0" class="movie-grid">
          <MovieCard
            v-for="movie in filteredMovies"
            :key="movie.id"
            :movie="movie"
            @click="handleOpen"
            @edit="handleEdit"
            @delete="handleDelete"
          />
        </div>

        <EmptyState
          v-else
          :icon="emptyState.icon"
          :title="emptyState.title"
          :message="emptyState.message"
          :show-add-button="emptyState.showAdd"
          @add-movie="goToAddMovie"
        />
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" aria-label="Add a movie" @click="goToAddMovie">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-action-sheet
      :is-open="showSortMenu"
      header="Sort By"
      :buttons="sortButtons"
      @did-dismiss="showSortMenu = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  IonPage,
  IonContent,
  IonButton,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonFab,
  IonFabButton,
  IonIcon,
  IonActionSheet
} from '@ionic/vue';
import {
  funnelOutline,
  addOutline,
  timeOutline,
  textOutline,
  starOutline,
  calendarOutline,
  searchOutline,
  checkmarkCircleOutline,
  bookmarkOutline
} from 'ionicons/icons';
import PageHeader from '../components/PageHeader.vue';
import MovieCard from '../components/MovieCard.vue';
import EmptyState from '../components/EmptyState.vue';
import { movieService } from '../services/movieService';
import { useToast } from '../composables/useToast';
import { useConfirmDelete } from '../composables/useConfirmDelete';
import type { Movie, FilterOption, SortOption } from '../types/movie';

/*
 * URL contract, so the dashboard stat tiles can deep-link into a filtered view:
 *   ?status=all|watched|not-watched     ?genre=<MovieGenre>|all
 *   ?sort=recent|title-asc|...          ?q=<free text>
 * The values are the same strings as the FilterOption and SortOption unions, so nothing
 * has to be translated on the way in or out.
 */

const router = useRouter();
const route = useRoute();
const { showToast } = useToast();
const { confirmDelete } = useConfirmDelete();

const searchQuery = ref('');
const statusFilter = ref<FilterOption>('all');
const genreFilter = ref('all');
const sortOption = ref<SortOption>('recent');
const showSortMenu = ref(false);

const genres = movieService.getGenres();

const STATUSES: FilterOption[] = ['all', 'watched', 'not-watched'];
const SORTS: SortOption[] = [
  'recent',
  'title-asc',
  'title-desc',
  'rating-desc',
  'rating-asc',
  'year-desc',
  'year-asc'
];

let syncing = false;

const syncFromQuery = () => {
  const { status, genre, sort, q } = route.query;

  statusFilter.value = STATUSES.includes(status as FilterOption)
    ? (status as FilterOption)
    : 'all';
  sortOption.value = SORTS.includes(sort as SortOption) ? (sort as SortOption) : 'recent';
  genreFilter.value =
    typeof genre === 'string' && (genre === 'all' || genres.includes(genre as never))
      ? genre
      : 'all';
  searchQuery.value = typeof q === 'string' ? q : '';
};

const applyQuery = () => {
  const query: Record<string, string> = {};
  if (statusFilter.value !== 'all') query.status = statusFilter.value;
  if (genreFilter.value !== 'all') query.genre = genreFilter.value;
  if (sortOption.value !== 'recent') query.sort = sortOption.value;
  if (searchQuery.value) query.q = searchQuery.value;


  router.replace({ path: '/watchlist', query });
};

onMounted(() => {
  syncFromQuery();

  movieService.getMovies().catch(error => {
    console.error('Error loading movies:', error);
    showToast('Could not reach the movie database.', 'danger');
  });
});


watch(
  () => route.query,
  async () => {
    if (syncing || route.path !== '/watchlist') return;
    syncing = true;
    syncFromQuery();
    await nextTick();
    syncing = false;
  }
);

watch([searchQuery, statusFilter, genreFilter, sortOption], async () => {
  if (syncing) return;
  syncing = true;
  applyQuery();
  await nextTick();
  syncing = false;
});

const totalCount = computed(() => movieService.movies.value.length);

const filteredMovies = computed(() => {
  let list = movieService.searchMovies(searchQuery.value);
  list = movieService.filterMovies(list, statusFilter.value);
  list = movieService.filterByGenre(list, genreFilter.value);
  return movieService.sortMovies(list, sortOption.value);
});


const emptyState = computed(() => {
  if (searchQuery.value) {
    return {
      icon: searchOutline,
      title: 'No movies found',
      message: `Nothing matches "${searchQuery.value}". Try a different search.`,
      showAdd: false
    };
  }
  if (statusFilter.value === 'watched') {
    return {
      icon: checkmarkCircleOutline,
      title: 'Nothing watched yet',
      message: "You haven't marked any movies as watched.",
      showAdd: false
    };
  }
  if (statusFilter.value === 'not-watched') {
    return {
      icon: bookmarkOutline,
      title: 'All caught up',
      message: "You've watched everything on your list.",
      showAdd: false
    };
  }
  if (genreFilter.value !== 'all') {
    return {
      icon: searchOutline,
      title: `No ${genreFilter.value} movies`,
      message: 'Nothing in your collection matches this genre.',
      showAdd: false
    };
  }
  return {
    icon: undefined,
    title: 'Your watchlist is empty',
    message: 'Start building your movie collection by adding your first movie.',
    showAdd: true
  };
});

const sortButtons = computed(() => [
  { text: 'Recently Added', icon: timeOutline, handler: () => (sortOption.value = 'recent') },
  { text: 'Title A-Z', icon: textOutline, handler: () => (sortOption.value = 'title-asc') },
  { text: 'Title Z-A', icon: textOutline, handler: () => (sortOption.value = 'title-desc') },
  { text: 'Highest Rating', icon: starOutline, handler: () => (sortOption.value = 'rating-desc') },
  { text: 'Lowest Rating', icon: starOutline, handler: () => (sortOption.value = 'rating-asc') },
  { text: 'Newest Release', icon: calendarOutline, handler: () => (sortOption.value = 'year-desc') },
  { text: 'Oldest Release', icon: calendarOutline, handler: () => (sortOption.value = 'year-asc') },
  { text: 'Cancel', role: 'cancel' }
]);

const goToAddMovie = () => router.push('/add');
const handleOpen = (movie: Movie) => router.push(`/movie/${movie.id}`);
const handleEdit = (movie: Movie) => router.push(`/edit/${movie.id}`);

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
.filter-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.search-bar {
  --box-shadow: none;
  padding: 0;
  margin-bottom: var(--spacing-sm);
}

.filters-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.filters-section ion-segment {
  flex: 1;
  border-radius: var(--radius-md);
  padding: 4px;
}

.genre-select {
  --background: var(--surface-2);
  --border-radius: var(--radius-md);
  min-height: var(--filter-height-mobile);
  min-width: 150px;
  max-width: 190px;
  padding: 2px var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.result-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0 0 var(--spacing-md);
  padding-left: 2px;
}

@media (max-width: 767.98px) {
  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .genre-select {
    max-width: none;
  }
}
</style>
