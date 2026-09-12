<template>
  <ion-card class="movie-card" @click="$emit('click', movie)">
    <div class="movie-poster">
      <div class="poster-placeholder">
        <ion-icon :icon="filmOutline" class="poster-icon"></ion-icon>
        <span class="poster-text">MOVIE</span>
      </div>
    </div>
    
    <div class="card-content">
      <h3 class="movie-title">{{ movie.title }}</h3>
      <p class="movie-subtitle">{{ movie.genre }} • {{ movie.year }}</p>
      
      <div class="movie-rating">
        <ion-icon :icon="star" class="star-icon"></ion-icon>
        <span class="rating-value">{{ movie.rating ? movie.rating.toFixed(1) : 'N/A' }}</span>
      </div>
      
      <div class="movie-status" :class="statusClass">
        <ion-icon :icon="statusIcon"></ion-icon>
        <span>{{ movie.status }}</span>
      </div>
      
      <div class="movie-actions">
        <ion-button 
          fill="clear" 
          size="small" 
          color="light"
          @click.stop="$emit('edit', movie)"
          class="action-btn"
        >
          <ion-icon slot="icon-only" :icon="createOutline"></ion-icon>
        </ion-button>
        
        <ion-button 
          fill="clear" 
          size="small" 
          color="danger"
          @click.stop="$emit('delete', movie)"
          class="action-btn"
        >
          <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
        </ion-button>
      </div>
    </div>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { 
  IonCard, 
  IonButton,
  IonIcon 
} from '@ionic/vue';
import { 
  filmOutline, 
  star, 
  createOutline, 
  trashOutline,
  checkmarkCircle,
  bookmarkOutline
} from 'ionicons/icons';
import type { Movie } from '../types/movie';

interface Props {
  movie: Movie;
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'click', movie: Movie): void;
  (e: 'edit', movie: Movie): void;
  (e: 'delete', movie: Movie): void;
}>();

const statusClass = computed(() => ({
  'status-watched': props.movie.status === 'Watched',
  'status-not-watched': props.movie.status === 'Not Watched'
}));

const statusIcon = computed(() => 
  props.movie.status === 'Watched' ? checkmarkCircle : bookmarkOutline
);
</script>

<style scoped>
.movie-card {
  margin: 0;
  padding: 0;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
  cursor: pointer;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.movie-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.movie-poster {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, var(--medium-color) 0%, var(--light-color) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.poster-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-tertiary);
}

.poster-icon {
  font-size: 3rem;
  color: var(--primary-color);
  opacity: 0.8;
}

.poster-text {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-tertiary);
  opacity: 0.6;
}

.card-content {
  padding: 22px;
}

.movie-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.movie-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  font-weight: 500;
}

.movie-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.star-icon {
  color: var(--warning-color);
  font-size: 1.3rem;
}

.rating-value {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--text-primary);
}

.movie-status {  
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: 16px;
  width: fit-content;
}

.status-watched {
  background: rgba(70, 211, 105, 0.15);
  color: var(--success-color);
}

.status-not-watched {
  background: rgba(255, 160, 10, 0.15);
  color: var(--warning-color);
}

.movie-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.action-btn {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
}

@media (min-width: 768px) {
  .movie-poster {
    height: 200px;
  }
  
  .card-content {
    padding: 24px;
  }
  
  .movie-title {
    font-size: var(--font-size-2xl);
  }
  
  .movie-subtitle {
    font-size: var(--font-size-md);
  }
}

@media (max-width: 768px) {
  .movie-poster {
    height: 160px;
  }
  
  .card-content {
    padding: 18px;
  }
  
  .movie-title {
    font-size: var(--font-size-lg);
  }
  
  .movie-subtitle {
    font-size: var(--font-size-sm);
  }
  
  .poster-icon {
    font-size: 2.5rem;
  }
}

@media (max-width: 480px) {
  .movie-poster {
    height: 140px;
  }
  
  .card-content {
    padding: 16px;
  }
  
  .movie-title {
    font-size: var(--font-size-md);
  }
  
  .movie-subtitle {
    font-size: var(--font-size-xs);
  }
}
</style>
