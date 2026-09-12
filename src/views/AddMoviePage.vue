<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Add Movie</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="add-movie-container">
        <div class="form-header">
          <ion-icon :icon="filmOutline" class="form-icon"></ion-icon>
          <h2 class="form-title">Add New Movie</h2>
          <p class="form-subtitle">Fill in the details to add a movie to your watchlist.</p>
        </div>

        <MovieForm 
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  toastController
} from '@ionic/vue';
import { filmOutline } from 'ionicons/icons';
import MovieForm from '../components/MovieForm.vue';
import { movieService } from '../services/movieService';
import type { Movie } from '../types/movie';

const router = useRouter();

const handleSubmit = async (movieData: Omit<Movie, 'id' | 'createdAt'>) => {
  try {
    await movieService.addMovie(movieData);
    showToast('Movie added successfully!');
    router.push('/watchlist');
  } catch (error) {
    console.error('Error adding movie:', error);
    showToast('Error adding movie');
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
.add-movie-container {
  padding: 32px 40px;
  max-width: 700px;
  margin: 0 auto;
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
  .add-movie-container {
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
  .add-movie-container {
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
  .add-movie-container {
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
