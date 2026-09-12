<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/watchlist"></ion-back-button>
        </ion-buttons>
        <ion-title>Edit Movie</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div v-else-if="movie" class="edit-movie-container">
        <div class="form-header">
          <ion-icon :icon="createOutline" class="form-icon"></ion-icon>
          <h2 class="form-title">Edit Movie</h2>
          <p class="form-subtitle">Update the details for {{ movie.title }}.</p>
        </div>

        <MovieForm 
          :movie="movie"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>

      <div v-else class="error-container">
        <EmptyState 
          title="Movie Not Found"
          message="The movie you're trying to edit doesn't exist."
          :show-add-button="false"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonSpinner,
  toastController
} from '@ionic/vue';
import { createOutline } from 'ionicons/icons';
import MovieForm from '../components/MovieForm.vue';
import EmptyState from '../components/EmptyState.vue';
import { movieService } from '../services/movieService';
import type { Movie } from '../types/movie';

const router = useRouter();
const route = useRoute();

const movie = ref<Movie | null>(null);
const loading = ref(true);

onMounted(async () => {
  const movieId = Number(route.params.id);
  try {
    const foundMovie = await movieService.getMovieById(movieId);
    
    if (foundMovie) {
      movie.value = foundMovie;
    }
  } catch (error) {
    console.error('Error loading movie:', error);
  }
  
  loading.value = false;
});

const handleSubmit = async (movieData: Omit<Movie, 'id' | 'createdAt'>) => {
  if (movie.value) {
    try {
      await movieService.updateMovie(movie.value.id, movieData);
      showToast('Movie updated successfully!');
      router.push('/watchlist');
    } catch (error) {
      console.error('Error updating movie:', error);
      showToast('Error updating movie');
    }
  }
};

const handleCancel = () => {
  router.back();
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
.edit-movie-container {
  padding: 32px 40px;
  max-width: 700px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.error-container {
  padding: 24px;
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-icon {
  font-size: 3.5rem;
  color: var(--primary-color);
  margin-bottom: 20px;
}

.form-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.form-subtitle {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

@media (min-width: 1024px) {
  .edit-movie-container {
    max-width: 750px;
    padding: 40px 48px;
  }
  
  .form-header {
    margin-bottom: 48px;
  }
  
  .form-icon {
    font-size: 4rem;
  }
  
  .form-title {
    font-size: var(--font-size-4xl);
  }
  
  .form-subtitle {
    font-size: var(--font-size-lg);
  }
}

@media (max-width: 768px) {
  .edit-movie-container {
    padding: 24px 20px;
    max-width: 100%;
  }
  
  .form-header {
    margin-bottom: 32px;
  }
  
  .form-icon {
    font-size: 3rem;
  }
  
  .form-title {
    font-size: var(--font-size-2xl);
  }
  
  .form-subtitle {
    font-size: var(--font-size-sm);
  }
}

@media (max-width: 480px) {
  .edit-movie-container {
    padding: 20px 16px;
  }
  
  .form-icon {
    font-size: 2.5rem;
  }
  
  .form-title {
    font-size: var(--font-size-xl);
  }
  
  .form-subtitle {
    font-size: var(--font-size-sm);
  }
}
</style>
