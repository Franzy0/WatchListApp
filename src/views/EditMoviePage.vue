<template>
  <ion-page>
    <PageHeader title="Edit Movie" back-href="/watchlist" condensed />

    <ion-content :fullscreen="true">
      <div v-if="loading" class="page-container page-container--narrow loading-container">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="movie" class="page-container page-container--narrow">
        <div class="form-hero">
          <ion-icon :icon="createOutline" class="form-hero__icon" />
          <h2 class="form-hero__title">Edit Movie</h2>
          <p class="form-hero__subtitle">Update the details for {{ movie.title }}.</p>
        </div>

        <MovieForm :movie="movie" :busy="busy" @submit="handleSubmit" @cancel="handleCancel" />
      </div>

      <div v-else class="page-container page-container--narrow">
        <EmptyState
          :icon="alertCircleOutline"
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
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { createOutline, alertCircleOutline } from 'ionicons/icons';
import PageHeader from '../components/PageHeader.vue';
import MovieForm from '../components/MovieForm.vue';
import EmptyState from '../components/EmptyState.vue';
import { movieService } from '../services/movieService';
import { useToast } from '../composables/useToast';
import type { Movie, MovieFormSubmit, MovieUpdate } from '../types/movie';

const router = useRouter();
const route = useRoute();
const { showToast } = useToast();

const movie = ref<Movie | null>(null);
const loading = ref(true);
const busy = ref(false);

onMounted(async () => {
  const movieId = Number(route.params.id);
  try {
    movie.value = await movieService.getMovieById(movieId);
  } catch (error) {
    console.error('Error loading movie:', error);
    showToast('Could not load that movie.', 'danger');
  } finally {
    loading.value = false;
  }
});

const handleSubmit = async (payload: MovieFormSubmit) => {
  const current = movie.value;
  if (!current) return;

  busy.value = true;

  const updates: MovieUpdate = { ...payload.data };
  if (payload.poster.action === 'replace') {
    updates.posterUrl = payload.poster.dataUrl;
  } else if (payload.poster.action === 'remove') {
    // null rather than undefined: Realtime Database reads null as "delete this key".
    updates.posterUrl = null;
  }

  try {
    // Text and poster land in the same update, so the record is never half-changed.
    await movieService.updateMovie(current.id, updates);
    showToast('Movie updated.');
    router.push('/watchlist');
  } catch (error) {
    console.error('Error updating movie:', error);
    const reason = error instanceof Error ? error.message : 'Something went wrong.';
    showToast(`Could not save your changes. ${reason}`, 'danger');
  } finally {
    busy.value = false;
  }
};

const handleCancel = () => router.back();
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
</style>
