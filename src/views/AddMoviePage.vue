<template>
  <ion-page>
    <PageHeader title="Add Movie" back-href="/watchlist" condensed />

    <ion-content :fullscreen="true">
      <div class="page-container page-container--narrow">
        <div class="form-hero">
          <ion-icon :icon="filmOutline" class="form-hero__icon" />
          <h2 class="form-hero__title">Add New Movie</h2>
          <p class="form-hero__subtitle">
            Fill in the details to add a movie to your watchlist.
          </p>
        </div>

        <MovieForm :busy="busy" @submit="handleSubmit" @cancel="handleCancel" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { filmOutline } from 'ionicons/icons';
import PageHeader from '../components/PageHeader.vue';
import MovieForm from '../components/MovieForm.vue';
import { movieService } from '../services/movieService';
import { useToast } from '../composables/useToast';
import type { MovieFormSubmit } from '../types/movie';

const router = useRouter();
const { showToast } = useToast();

const busy = ref(false);

const handleSubmit = async (payload: MovieFormSubmit) => {
  busy.value = true;

  try {
    // One write. The poster goes in as `posterUrl` on the record itself, so there is no
    // second upload step that can fail after the movie has already been saved.
    await movieService.addMovie({
      ...payload.data,
      posterUrl: payload.poster.action === 'replace' ? payload.poster.dataUrl : undefined
    });

    showToast('Movie added.');
    router.push('/watchlist');
  } catch (error) {
    console.error('Error adding movie:', error);
    showToast('Could not add that movie.', 'danger');
  } finally {
    busy.value = false;
  }
};

const handleCancel = () => router.back();
</script>
