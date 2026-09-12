<template>
  <div class="stats-container">
    <ion-card class="stat-card total">
      <div class="stat-icon">
        <ion-icon :icon="filmOutline"></ion-icon>
      </div>
      <div class="stat-content">
        <div class="stat-label">TOTAL MOVIES</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
    </ion-card>

    <ion-card class="stat-card watched">
      <div class="stat-icon">
        <ion-icon :icon="checkmarkCircle"></ion-icon>
      </div>
      <div class="stat-content">
        <div class="stat-label">WATCHED</div>
        <div class="stat-value">{{ stats.watched }}</div>
      </div>
    </ion-card>

    <ion-card class="stat-card to-watch">
      <div class="stat-icon">
        <ion-icon :icon="bookmarkOutline"></ion-icon>
      </div>
      <div class="stat-content">
        <div class="stat-label">TO WATCH</div>
        <div class="stat-value">{{ stats.notWatched }}</div>
      </div>
    </ion-card>

    <ion-card class="stat-card rating">
      <div class="stat-icon">
        <ion-icon :icon="star"></ion-icon>
      </div>
      <div class="stat-content">
        <div class="stat-label">AVG. RATING</div>
        <div class="stat-value">{{ stats.avgRating }}</div>
      </div>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { IonCard, IonIcon } from '@ionic/vue';
import { filmOutline, checkmarkCircle, bookmarkOutline, star } from 'ionicons/icons';
import { movieService } from '../services/movieService';

const stats = computed(() => movieService.getStats());

onMounted(async () => {
  try {
    await movieService.getMovies();
  } catch (error) {
    console.error('Error loading stats:', error);
  }
});
</script>

<style scoped>
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  margin: 0;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
  border: 1px solid var(--border-color);
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  font-size: 1.75rem;
  flex-shrink: 0;
}

.total .stat-icon {
  background: rgba(229, 9, 20, 0.15);
  color: var(--primary-color);
}

.watched .stat-icon {
  background: rgba(70, 211, 105, 0.15);
  color: var(--success-color);
}

.to-watch .stat-icon {
  background: rgba(255, 160, 10, 0.15);
  color: var(--warning-color);
}

.rating .stat-icon {
  background: rgba(255, 160, 10, 0.15);
  color: var(--warning-color);
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 1.5px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.stat-value {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

@media (min-width: 1024px) {
  .stats-container {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  
  .stat-card {
    padding: 28px;
  }
  
  .stat-icon {
    width: 64px;
    height: 64px;
    font-size: 2rem;
  }
  
  .stat-label {
    font-size: var(--font-size-sm);
  }
  
  .stat-value {
    font-size: var(--font-size-4xl);
  }
}

@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .stat-card {
    padding: 20px;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 1.5rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
    letter-spacing: 1px;
  }
  
  .stat-value {
    font-size: var(--font-size-2xl);
  }
}

@media (max-width: 480px) {
  .stats-container {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .stat-card {
    padding: 18px;
  }
  
  .stat-icon {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }
  
  .stat-label {
    font-size: 0.7rem;
  }
  
  .stat-value {
    font-size: var(--font-size-xl);
  }
}
</style>
