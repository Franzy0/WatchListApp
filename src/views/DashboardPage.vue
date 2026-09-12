<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button menu="main-menu"></ion-menu-button>
        </ion-buttons>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="dashboard-container">
        <div class="header-section">
          <div class="logo-section">
            <ion-icon :icon="filmOutline" class="logo-icon"></ion-icon>
            <h1 class="app-title">CineList</h1>
          </div>
          <p class="welcome-message">Welcome back! Here's your movie collection overview.</p>
        </div>

        <MovieStats />

        <div class="recent-section">
          <div class="section-header">
            <h2 class="section-title">Recently Added</h2>
            <ion-button 
              fill="clear" 
              size="small" 
              color="primary"
              @click="goToWatchlist"
            >
              View All
              <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
            </ion-button>
          </div>

          <div v-if="recentMovies.length > 0" class="recent-movies">
            <MovieCard 
              v-for="movie in recentMovies.filter(m => m && typeof m === 'object')" 
              :key="movie.id" 
              :movie="movie"
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
        </div>

        <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="fab-container">
          <ion-fab-button color="primary" @click="goToAddMovie" class="cinefab-fab">
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonButton,
  IonIcon,
  toastController,
  alertController
} from '@ionic/vue';
import { 
  filmOutline, 
  addOutline, 
  arrowForwardOutline 
} from 'ionicons/icons';
import MovieStats from '../components/MovieStats.vue';
import MovieCard from '../components/MovieCard.vue';
import EmptyState from '../components/EmptyState.vue';
import { movieService } from '../services/movieService';
import type { Movie } from '../types/movie';

const router = useRouter();
const recentMovies = ref<Movie[]>([]);

onMounted(async () => {
  await loadRecentMovies();
});

const loadRecentMovies = async () => {
  try {
    await movieService.getMovies();
    recentMovies.value = movieService.getRecentMovies(5);
  } catch (error) {
    console.error('Error loading recent movies:', error);
  }
};

const goToWatchlist = () => {
  router.push('/watchlist');
};

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
            await loadRecentMovies();
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
.dashboard-container {
  padding: 32px 40px;
  max-width: var(--container-max-width);
  margin: 0 auto;
}

.header-section {
  margin-bottom: 40px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.logo-icon {
  font-size: 3rem;
  color: var(--primary-color);
}

.app-title {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

.welcome-message {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.recent-section {
  margin-top: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.recent-movies {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

@media (min-width: 1024px) {
  .dashboard-container {
    padding: 40px 48px;
  }
  
  .logo-icon {
    font-size: 3.5rem;
  }
  
  .app-title {
    font-size: var(--font-size-4xl);
  }
  
  .welcome-message {
    font-size: var(--font-size-lg);
  }
  
  .recent-movies {
    grid-template-columns: repeat(4, 1fr);
    gap: 28px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 24px 20px;
    padding-bottom: 80px;
  }
  
  .header-section {
    margin-bottom: 32px;
  }
  
  .logo-section {
    gap: 12px;
  }
  
  .logo-icon {
    font-size: 2.5rem;
  }
  
  .app-title {
    font-size: var(--font-size-2xl);
  }
  
  .welcome-message {
    font-size: var(--font-size-sm);
  }
  
  .recent-section {
    margin-top: 32px;
  }
  
  .recent-movies {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 20px 16px;
    padding-bottom: 80px;
  }
  
  .logo-section {
    gap: 10px;
  }
  
  .logo-icon {
    font-size: 2rem;
  }
  
  .app-title {
    font-size: var(--font-size-xl);
  }
  
  .welcome-message {
    font-size: var(--font-size-sm);
  }
  
  .recent-movies {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .section-title {
    font-size: var(--font-size-xl);
  }
}

.fab-container {
  margin: 24px;
}

.cinefab-fab {
  --background: var(--primary-color);
  --background-hover: var(--primary-color-shade);
  --color: #ffffff;
  --box-shadow: 0 4px 16px rgba(229, 9, 20, 0.4);
  width: 60px;
  height: 60px;
}

@media (min-width: 768px) {
  .cinefab-fab {
    width: 64px;
    height: 64px;
  }
}

@media (max-width: 768px) {
  .cinefab-fab {
    width: 56px;
    height: 56px;
  }
  
  .fab-container {
    margin: 16px;
  }
}
</style>
