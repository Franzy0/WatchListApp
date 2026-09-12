<template>
  <form class="movie-form" novalidate @submit.prevent="handleSubmit">
    <!-- Poster picker -->
    <div class="poster-field">
      <button
        type="button"
        class="poster-target"
        :class="{ 'has-image': !!previewSrc }"
        :disabled="busy || picking"
        :aria-label="previewSrc ? 'Change movie poster' : 'Add a movie poster'"
        @click="handlePick"
      >
        <img v-if="previewSrc" :src="previewSrc" alt="" class="poster-preview" />
        <span v-else class="poster-prompt">
          <ion-icon :icon="imageOutline" class="poster-prompt-icon" />
          <span class="poster-prompt-title">Add a poster</span>
          <span class="poster-prompt-hint">Gallery or camera</span>
        </span>

        <span v-if="picking" class="poster-busy">
          <ion-spinner name="crescent" />
        </span>
      </button>

      <div v-if="previewSrc" class="poster-actions">
        <ion-button fill="clear" size="small" :disabled="busy || picking" @click="handlePick">
          <ion-icon slot="start" :icon="swapHorizontalOutline" />
          Replace
        </ion-button>
        <ion-button
          fill="clear"
          size="small"
          color="danger"
          :disabled="busy || picking"
          @click="handleRemovePoster"
        >
          <ion-icon slot="start" :icon="trashOutline" />
          Remove
        </ion-button>
      </div>

      <p v-if="posterError" class="field-error poster-error">{{ posterError }}</p>
    </div>

    <!-- Text fields. The caption is a property of the control in Ionic 9; the old
         ion-item plus floating ion-label pairing silently stopped working in Ionic 8
         and left the input painted over its own caption. -->
    <ion-input
      v-model="formData.title"
      class="form-field"
      label="Movie Title"
      label-placement="floating"
      fill="outline"
      type="text"
      autocapitalize="words"
      placeholder="Enter movie title"
      :class="{ 'ion-invalid': !!errors.title, 'ion-touched': touched.title }"
      :error-text="errors.title"
      @ion-blur="touched.title = true"
    />

    <div class="genre-field">
      <ion-select
        v-model="formData.genre"
        class="form-field"
        label="Genre"
        label-placement="floating"
        fill="outline"
        multiple
        placeholder="Select one or more genres"
        :class="{ 'ion-invalid': !!errors.genre, 'ion-touched': touched.genre }"
        :error-text="errors.genre"
        cancel-text="Cancel"
        ok-text="Done"
        @ion-blur="touched.genre = true"
      >
        <ion-select-option v-for="genre in genres" :key="genre" :value="genre">
          {{ genre }}
        </ion-select-option>
      </ion-select>

      <!-- The collapsed select only shows a comma list, which truncates once a few are
           picked. The chips make the full selection visible and individually removable. -->
      <div v-if="formData.genre.length" class="genre-chips">
        <button
          v-for="genre in formData.genre"
          :key="genre"
          type="button"
          class="genre-chip"
          :aria-label="`Remove ${genre}`"
          :disabled="busy"
          @click="removeGenre(genre)"
        >
          {{ genre }}
          <ion-icon :icon="closeOutline" />
        </button>
      </div>
    </div>

    <ion-input
      v-model.number="formData.year"
      class="form-field"
      label="Release Year"
      label-placement="floating"
      fill="outline"
      type="number"
      inputmode="numeric"
      :min="MIN_YEAR"
      :max="currentYear"
      placeholder="Enter release year"
      :class="{ 'ion-invalid': !!errors.year, 'ion-touched': touched.year }"
      :error-text="errors.year"
      @ion-blur="touched.year = true"
    />

    <ion-input
      v-model.number="formData.rating"
      class="form-field"
      label="Rating (0.0 - 10.0)"
      label-placement="floating"
      fill="outline"
      type="number"
      inputmode="decimal"
      min="0"
      max="10"
      step="0.1"
      placeholder="Enter rating"
      :class="{ 'ion-invalid': !!errors.rating, 'ion-touched': touched.rating }"
      :error-text="errors.rating"
      @ion-blur="touched.rating = true"
    />

    <div class="status-section">
      <span class="status-label">Watch Status</span>
      <ion-segment v-model="formData.status" mode="ios">
        <ion-segment-button value="Watched">
          <ion-icon :icon="checkmarkCircle" />
          <ion-label>Watched</ion-label>
        </ion-segment-button>
        <ion-segment-button value="Not Watched">
          <ion-icon :icon="bookmarkOutline" />
          <ion-label>Not Watched</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>

    <div v-if="busy" class="save-status">
      <ion-progress-bar type="indeterminate" />
      <span class="save-text">Saving...</span>
    </div>

    <div class="form-actions">
      <ion-button
        type="button"
        fill="outline"
        color="medium"
        class="action-btn"
        :disabled="busy"
        @click="$emit('cancel')"
      >
        Cancel
      </ion-button>
      <ion-button type="submit" color="primary" class="action-btn" :disabled="busy">
        {{ submitButtonText }}
      </ion-button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import {
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonButton,
  IonSpinner,
  IonProgressBar
} from '@ionic/vue';
import {
  checkmarkCircle,
  bookmarkOutline,
  imageOutline,
  trashOutline,
  swapHorizontalOutline,
  closeOutline
} from 'ionicons/icons';
import { movieService } from '../services/movieService';
import { usePhotoPicker } from '../composables/usePhotoPicker';
import type {
  Movie,
  MovieGenre,
  MovieStatus,
  MovieFormSubmit,
  PosterIntent
} from '../types/movie';

interface Props {
  movie?: Movie;
  /** The page is saving. Disables the form and shows progress. */
  busy?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'submit', payload: MovieFormSubmit): void;
  (e: 'cancel'): void;
}>();

const MIN_YEAR = 1888;
const genres = movieService.getGenres();
const currentYear = new Date().getFullYear();

const { pickPhoto } = usePhotoPicker();

const formData = ref({
  title: '',
  genre: [] as MovieGenre[],
  year: currentYear,
  rating: 0,
  status: 'Not Watched' as MovieStatus
});

// Poster state is kept out of formData. It is not a text field, and keeping it separate
// is what lets the payload say plainly whether the picture should be kept, replaced or
// cleared. A picked photo is already the data URL that will be written to `posterUrl`,
// so the preview shows exactly what will be saved.
const existingPosterUrl = ref<string | null>(null);
const pickedPosterUrl = ref<string | null>(null);
const posterRemoved = ref(false);
const posterError = ref('');
const picking = ref(false);

const previewSrc = computed(() => {
  if (pickedPosterUrl.value) return pickedPosterUrl.value;
  return posterRemoved.value ? null : existingPosterUrl.value;
});

const touched = reactive({ title: false, genre: false, year: false, rating: false });
const submitAttempted = ref(false);

const errors = computed(() => {
  const show = (field: keyof typeof touched) => touched[field] || submitAttempted.value;
  const result: Record<string, string> = {};

  if (show('title') && !formData.value.title.trim()) {
    result.title = 'Give the movie a title.';
  }
  if (show('genre') && formData.value.genre.length === 0) {
    result.genre = 'Pick at least one genre.';
  }

  const year = Number(formData.value.year);
  if (show('year') && (!Number.isFinite(year) || year < MIN_YEAR || year > currentYear)) {
    result.year = `Enter a year between ${MIN_YEAR} and ${currentYear}.`;
  }

  const rating = Number(formData.value.rating);
  if (show('rating') && (!Number.isFinite(rating) || rating < 0 || rating > 10)) {
    result.rating = 'Enter a rating between 0 and 10.';
  }

  return result;
});

const submitButtonText = computed(() => (props.movie ? 'Save Changes' : 'Save Movie'));

const hydrate = (movie: Movie) => {
  formData.value = {
    title: movie.title,
    // Copied, not aliased: editing the chips must not mutate the stored record.
    genre: [...movie.genre],
    year: movie.year,
    rating: movie.rating,
    status: movie.status
  };
  existingPosterUrl.value = movie.posterUrl ?? null;
  posterRemoved.value = false;
};

onMounted(() => {
  if (props.movie) hydrate(props.movie);
});

// The edit page gates rendering on the movie, but watching keeps the form correct if a
// parent ever swaps the record while this component stays mounted.
watch(
  () => props.movie,
  movie => {
    if (movie) hydrate(movie);
  }
);

const removeGenre = (genre: MovieGenre) => {
  formData.value.genre = formData.value.genre.filter(g => g !== genre);
  touched.genre = true;
};

const handlePick = async () => {
  posterError.value = '';
  picking.value = true;
  try {
    const dataUrl = await pickPhoto();
    if (!dataUrl) return; // Cancelled, which is not a failure.
    pickedPosterUrl.value = dataUrl;
    posterRemoved.value = false;
  } catch (error) {
    console.error('Could not pick a photo:', error);
    posterError.value =
      error instanceof Error ? error.message : 'That picture could not be opened.';
  } finally {
    picking.value = false;
  }
};

const handleRemovePoster = () => {
  pickedPosterUrl.value = null;
  posterRemoved.value = true;
  posterError.value = '';
};

const handleSubmit = () => {
  submitAttempted.value = true;
  if (Object.keys(errors.value).length > 0) return;

  let poster: PosterIntent = { action: 'keep' };
  if (pickedPosterUrl.value) poster = { action: 'replace', dataUrl: pickedPosterUrl.value };
  else if (posterRemoved.value) poster = { action: 'remove' };

  emit('submit', {
    data: {
      title: formData.value.title.trim(),
      genre: [...formData.value.genre],
      year: Number(formData.value.year),
      rating: Number(formData.value.rating),
      status: formData.value.status
    },
    poster
  });
};
</script>

<style scoped>
.movie-form {
  display: block;
}

/* Poster picker */
.poster-field {
  margin-bottom: var(--spacing-xl);
}

.poster-target {
  position: relative;
  display: block;
  width: 180px;
  max-width: 55%;
  margin: 0 auto;
  aspect-ratio: var(--poster-ratio);
  padding: 0;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--poster-placeholder-gradient);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.poster-target:hover:not(:disabled) {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.poster-target.has-image {
  border-style: solid;
  border-color: var(--border-color);
}

.poster-target:disabled {
  cursor: default;
  opacity: 0.7;
}

.poster-target:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 3px;
}

.poster-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-prompt {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--spacing-sm);
  text-align: center;
}

.poster-prompt-icon {
  font-size: 2rem;
  color: var(--primary-text);
  margin-bottom: 2px;
}

.poster-prompt-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.poster-prompt-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.poster-busy {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.poster-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.poster-actions ion-button {
  --padding-start: 10px;
  --padding-end: 10px;
  min-height: 36px;
  font-size: var(--font-size-xs);
}

.poster-error {
  text-align: center;
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-xs);
}

.field-error {
  color: var(--danger-text);
}

/* Text fields */
.form-field {
  display: block;
  margin-bottom: var(--spacing-xl);
}

/* Genre */
.genre-field {
  margin-bottom: var(--spacing-xl);
}

.genre-field .form-field {
  margin-bottom: 0;
}

.genre-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.genre-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: rgba(var(--primary-color-rgb), var(--chip-alpha));
  color: var(--primary-text);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.genre-chip:hover:not(:disabled) {
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.genre-chip:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.genre-chip:disabled {
  cursor: default;
  opacity: 0.6;
}

.genre-chip ion-icon {
  font-size: 13px;
}

/* Status */
.status-section {
  margin: var(--spacing-2xl) 0;
}

.status-label {
  display: block;
  margin-bottom: var(--spacing-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  font-weight: 600;
}

ion-segment {
  border-radius: var(--radius-md);
  padding: 5px;
}

/* Progress */
.save-status {
  margin-bottom: var(--spacing-lg);
}

.save-text {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  text-align: center;
}

/* Actions */
.form-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-2xl);
}

.action-btn {
  flex: 1;
  --border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 0.3px;
  min-height: var(--button-height-mobile);
}

@media (min-width: 1024px) {
  .poster-target {
    width: 200px;
  }

  .action-btn {
    min-height: var(--button-height-desktop);
  }
}

@media (max-width: 767.98px) {
  .form-actions {
    flex-direction: column-reverse;
    gap: var(--spacing-sm);
  }

  .action-btn {
    width: 100%;
  }
}
</style>
