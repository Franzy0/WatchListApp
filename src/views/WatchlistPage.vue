<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button menu="main-menu"></ion-menu-button>
        </ion-buttons>
        <ion-title>My Watchlist</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showSortMenu = true">
            <ion-icon slot="icon-only" :icon="funnelOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="watchlist-container">
        <ion-searchbar 
          v-model="searchQuery" 
          placeholder="Search by title, genre, or year..."
          animated
          class="search-bar"
        ></ion-searchbar>

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
            placeholder="Filter by genre"
            interface="popover"
            class="genre-select"
          >
            <ion-select-option value="all">All Genres</ion-select-option>
            <ion-select-option 
              v-for="genre in genres" 
              :key="genre" 
              :value="genre"
            >
              {{ genre }}
            </ion-select-option>
          </ion-select>
        </div>

        <div v-if="filteredMovies.length > 0" class="movies-grid">
          <MovieCard 
            v-for="movie in filteredMovies.filter(m => m && typeof m === 'object')" 
            :key="movie.id" 
            :movie="movie"
            @edit="handleEdit"
            @delete="handleDelete"
          />
        </div>

        <EmptyState 
          v-else 
          :title="searchQuery ? 'No movies found' : 'Your watchlist is empty'"
          :message="searchQuery ? 'Try adjusting your search or filters.' : 'Start building your movie collection by adding your first movie.'"
          @add-movie="goToAddMovie"
        />

        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button color="primary" @click="goToAddMovie">
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      </div>
    </ion-content>

    <ion-action-sheet
      :is-open="showSortMenu"
      header="Sort By"
      :buttons="sortButtons"
      @did-dismiss="showSortMenu = false"
    ></ion-action-sheet>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonFab,
  IonFabButton,
  IonIcon,
  IonActionSheet,
  toastController,
  alertController
} from '@ionic/vue';
import { funnelOutline, addOutline } from 'ionicons/icons';
import MovieCard from '../components/MovieCard.vue';
import EmptyState from '../components/EmptyState.vue';
import { movieService } from '../services/movieService';
import type { Movie, FilterOption, SortOption } from '../types/movie';

const router = useRouter();
const searchQuery = ref('');
const statusFilter = ref<FilterOption>('all');
const genreFilter = ref('all');
const sortOption = ref<SortOption>('recent');
const showSortMenu = ref(false);

const genres = movieService.getGenres();

onMounted(async () => {
  try {
    await movieService.getMovies();
  } catch (error) {
    console.error('Error loading movies:', error);
  }
});

const sortButtons = computed(() => [
  {
    text: 'Recently Added',
    icon: 'time-outline',
    handler: () => { sortOption.value = 'recent'; }
  },
  {
    text: 'Title A-Z',
    icon: 'text-outline',
    handler: () => { sortOption.value = 'title-asc'; }
  },
  {
    text: 'Title Z-A',
    icon: 'text-outline',
    handler: () => { sortOption.value = 'title-desc'; }
  },
  {
    text: 'Highest Rating',
    icon: 'star-outline',
    handler: () => { sortOption.value = 'rating-desc'; }
  },
  {
    text: 'Lowest Rating',
    icon: 'star-outline',
    handler: () => { sortOption.value = 'rating-asc'; }
  },
  {
    text: 'Newest Release',
    icon: 'calendar-outline',
    handler: () => { sortOption.value = 'year-desc'; }
  },
  {
    text: 'Oldest Release',
    icon: 'calendar-outline',
    handler: () => { sortOption.value = 'year-asc'; }
  },
  {
    text: 'Cancel',
    role: 'cancel'
  }
]);

const filteredMovies = computed(() => {
  let movies = movieService.searchMovies(searchQuery.value);
  
  movies = movieService.filterMovies(movies, statusFilter.value);
  movies = movieService.filterByGenre(movies, genreFilter.value);
  movies = movieService.sortMovies(movies, sortOption.value);
  
  return movies;
});

const goToAddMovie = () => {
  router.push('/add');
};

const handleEdit = (movie: Movie) => {
  router.push(`/edit/${movie.id}`);
};

const handleDelete = async (movie: Movie) => {
  const alert = await alertController.create({
    header: 'Delete Movie?',
    subHeader: 'Are you sure you want to remove this movie from your watchlist?',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel',
        cssClass: 'secondary'
      },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            await movieService.deleteMovie(movie.id);
            showToast('Movie deleted successfully!');
          } catch (error) {
            console.error('Error deleting movie:', error);
            showToast('Error deleting movie');
          }
        }
      }
    ]
  });

  await alert.present();
};

const showToast = async (message: string) => {
  const toast = await toastController.create({
    message,
    duration: 2000,
    position: 'bottom',
    color: 'success'
  });

  await toast.present();
};
</script>

<style scoped>
.watchlist-container {
  padding: 32px 40px;
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding-bottom: 80px;
}

.search-bar {
  margin-bottom: 24px;
}

.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  align-items: center;
  flex-wrap: wrap;
}

ion-segment {
  flex: 1;
  min-width: 280px;
}

.genre-select {
  width: 180px;
  min-width: 140px;
}

.movies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

@media (min-width: 1024px) {
  .watchlist-container {
    padding: 40px 48px;
  }
  
  .search-bar {
    margin-bottom: 28px;
  }
  
  .filters-section {
    gap: 20px;
    margin-bottom: 36px;
  }
  
  .genre-select {
    width: 200px;
  }
  
  .movies-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 28px;
  }
}

@media (max-width: 768px) {
  .watchlist-container {
    padding: 24px 20px;
  }
  
  .search-bar {
    margin-bottom: 20px;
  }
  
  .filters-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 24px;
  }
  
  ion-segment {
    min-width: auto;
  }
  
  .genre-select {
    width: 100%;
  }
  
  .movies-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: 480px) {
  .watchlist-container {
    padding: 20px 16px;
  }
  
  .search-bar {
    margin-bottom: 16px;
  }
  
  .filters-section {
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .movies-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
