<template>
  <form @submit.prevent="handleSubmit">
    <ion-item lines="full" class="form-item">
      <ion-label position="floating" color="light">Movie Title</ion-label>
      <ion-input 
        v-model="formData.title" 
        type="text" 
        required
        placeholder="Enter movie title"
      ></ion-input>
    </ion-item>

    <ion-item lines="full" class="form-item">
      <ion-label position="floating" color="light">Genre</ion-label>
      <ion-select v-model="formData.genre" placeholder="Select genre" required>
        <ion-select-option 
          v-for="genre in genres" 
          :key="genre" 
          :value="genre"
        >
          {{ genre }}
        </ion-select-option>
      </ion-select>
    </ion-item>

    <ion-item lines="full" class="form-item">
      <ion-label position="floating" color="light">Release Year</ion-label>
      <ion-input 
        v-model.number="formData.year" 
        type="number" 
        required
        min="1888"
        :max="currentYear"
        placeholder="Enter release year"
      ></ion-input>
    </ion-item>

    <ion-item lines="full" class="form-item">
      <ion-label position="floating" color="light">Rating (0.0 - 10.0)</ion-label>
      <ion-input 
        v-model.number="formData.rating" 
        type="number" 
        required
        min="0"
        max="10"
        step="0.1"
        placeholder="Enter rating"
      ></ion-input>
    </ion-item>

    <div class="status-section">
      <ion-label class="status-label">Watch Status</ion-label>
      <ion-segment v-model="formData.status" mode="ios">
        <ion-segment-button value="Watched">
          <ion-icon :icon="checkmarkCircle"></ion-icon>
          <ion-label>Watched</ion-label>
        </ion-segment-button>
        <ion-segment-button value="Not Watched">
          <ion-icon :icon="bookmarkOutline"></ion-icon>
          <ion-label>Not Watched</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>

    <div class="form-actions">
      <ion-button 
        type="button" 
        fill="outline" 
        color="light" 
        @click="$emit('cancel')"
        class="action-btn"
      >
        Cancel
      </ion-button>
      <ion-button 
        type="submit" 
        class="action-btn primary"
      >
        {{ submitButtonText }}
      </ion-button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonIcon,
  IonButton
} from '@ionic/vue';
import { checkmarkCircle, bookmarkOutline } from 'ionicons/icons';
import { movieService } from '../services/movieService';
import type { Movie, MovieGenre } from '../types/movie';

interface Props {
  movie?: Movie;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'submit', movie: Omit<Movie, 'id' | 'createdAt'>): void;
  (e: 'cancel'): void;
}>();

const genres = movieService.getGenres();
const currentYear = new Date().getFullYear();

const formData = ref({
  title: '',
  genre: '' as MovieGenre,
  year: currentYear,
  rating: 0,
  status: 'Not Watched' as 'Watched' | 'Not Watched'
});

const submitButtonText = computed(() => 
  props.movie ? 'Save Changes' : 'Save Movie'
);

onMounted(() => {
  if (props.movie) {
    formData.value = {
      title: props.movie.title,
      genre: props.movie.genre as MovieGenre,
      year: props.movie.year,
      rating: props.movie.rating,
      status: props.movie.status
    };
  }
});

const handleSubmit = () => {
  if (formData.value.title.trim() && formData.value.genre) {
    emit('submit', {
      title: formData.value.title.trim(),
      genre: formData.value.genre,
      year: formData.value.year,
      rating: formData.value.rating,
      status: formData.value.status
    });
  }
};
</script>

<style scoped>
.form-item {
  --background: var(--medium-color);
  --border-radius: var(--radius-md);
  margin-bottom: 24px;
  padding: 12px 20px;
}

.form-item ion-label {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: 8px;
}

.form-item ion-input,
.form-item ion-select {
  --padding-start: 0;
  --padding-end: 0;
  font-size: var(--font-size-lg);
}

.status-section {
  margin: 32px 0;
}

.status-label {
  display: block;
  margin-bottom: 16px;
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  font-weight: 600;
}

ion-segment {
  --background: var(--medium-color);
  border-radius: var(--radius-md);
  padding: 6px;
}

ion-segment-button {
  --color: var(--text-secondary);
  --color-checked: #ffffff;
  --background-checked: var(--primary-color);
  --border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-weight: 600;
}

ion-segment-button ion-label {
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 32px;
}

.action-btn {
  flex: 1;
  --border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 0.3px;
  min-height: var(--button-height-desktop);
}

@media (min-width: 1024px) {
  .form-item {
    margin-bottom: 28px;
    padding: 14px 24px;
  }
  
  .form-item ion-label {
    font-size: var(--font-size-lg);
  }
  
  .status-section {
    margin: 40px 0;
  }
  
  .status-label {
    font-size: var(--font-size-lg);
  }
  
  .form-actions {
    gap: 20px;
    margin-top: 40px;
  }
}

@media (max-width: 768px) {
  .form-item {
    margin-bottom: 20px;
    padding: 10px 16px;
  }
  
  .form-item ion-label {
    font-size: var(--font-size-sm);
  }
  
  .status-section {
    margin: 28px 0;
  }
  
  .status-label {
    font-size: var(--font-size-sm);
    margin-bottom: 12px;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 12px;
    margin-top: 28px;
  }
  
  .action-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .form-item {
    margin-bottom: 18px;
    padding: 8px 14px;
  }
  
  .action-btn {
    min-height: var(--button-height-mobile);
  }
}
</style>
