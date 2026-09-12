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

        <MovieForm
          :busy="busy"
          :progress="progress"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
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
import { uploadPoster } from '../services/storageService';
import { useToast } from '../composables/useToast';
import type { MovieFormSubmit } from '../types/movie';

const router = useRouter();
const { showToast } = useToast();

const busy = ref(false);
const progress = ref<number | null>(null);

const handleSubmit = async (payload: MovieFormSubmit) => {
  busy.value = true;
  progress.value = null;

  try {
    // The record is written first, on purpose. If the picture then fails to upload the
    // typing is still saved, rather than the whole entry being lost to a storage error.
    const movie = await movieService.addMovie(payload.data);

    if (payload.poster.action === 'replace') {
      try {
        progress.value = 0;
        const { url, path } = await uploadPoster(payload.poster.file, movie.id, percent => {
          progress.value = percent;
        });
        await movieService.updateMovie(movie.id, { posterUrl: url, posterPath: path });
        showToast('Movie added.');
      } catch (uploadError) {
        console.error('Poster upload failed:', uploadError);
        const reason =
          uploadError instanceof Error ? uploadError.message : 'The upload failed.';
        showToast(`Movie added, but the poster did not upload. ${reason}`, 'warning');
      }
    } else {
      showToast('Movie added.');
    }

    router.push('/watchlist');
  } catch (error) {
    console.error('Error adding movie:', error);
    showToast('Could not add that movie.', 'danger');
  } finally {
    busy.value = false;
    progress.value = null;
  }
};

const handleCancel = () => router.back();
</script>
