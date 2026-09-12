<template>
  <div class="empty-state">
    <div class="empty-icon">
      <ion-icon :icon="filmOutline"></ion-icon>
    </div>
    <h2 class="empty-title">{{ title }}</h2>
    <p class="empty-message">{{ message }}</p>
    <ion-button 
      v-if="showAddButton" 
      fill="solid" 
      color="primary"
      @click="$emit('add-movie')"
      class="add-button"
    >
      <ion-icon slot="start" :icon="addOutline"></ion-icon>
      Add Movie
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonIcon, IonButton } from '@ionic/vue';
import { filmOutline, addOutline } from 'ionicons/icons';

interface Props {
  title?: string;
  message?: string;
  showAddButton?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: 'Your watchlist is empty',
  message: 'Start building your movie collection by adding your first movie.',
  showAddButton: true
});

defineEmits<{
  (e: 'add-movie'): void;
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  min-height: 400px;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 140px;
  margin-bottom: 32px;
  color: var(--text-tertiary);
  opacity: 0.4;
}

.empty-icon ion-icon {
  font-size: 96px;
}

.empty-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.empty-message {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin-bottom: 40px;
  max-width: 500px;
  line-height: 1.6;
}

.add-button {
  --border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 0.3px;
  --padding-start: 32px;
  --padding-end: 32px;
  min-height: var(--button-height-desktop);
  font-size: var(--font-size-md);
}

@media (min-width: 1024px) {
  .empty-state {
    padding: 100px 48px;
    min-height: 500px;
  }
  
  .empty-icon {
    width: 160px;
    height: 160px;
    margin-bottom: 40px;
  }
  
  .empty-icon ion-icon {
    font-size: 112px;
  }
  
  .empty-title {
    font-size: var(--font-size-4xl);
    margin-bottom: 20px;
  }
  
  .empty-message {
    font-size: var(--font-size-lg);
    margin-bottom: 48px;
    max-width: 600px;
  }
}

@media (max-width: 768px) {
  .empty-state {
    padding: 60px 24px;
    min-height: 350px;
  }
  
  .empty-icon {
    width: 120px;
    height: 120px;
    margin-bottom: 24px;
  }
  
  .empty-icon ion-icon {
    font-size: 80px;
  }
  
  .empty-title {
    font-size: var(--font-size-2xl);
    margin-bottom: 12px;
  }
  
  .empty-message {
    font-size: var(--font-size-sm);
    margin-bottom: 32px;
    max-width: 400px;
  }
}

@media (max-width: 480px) {
  .empty-state {
    padding: 48px 20px;
    min-height: 300px;
  }
  
  .empty-icon {
    width: 100px;
    height: 100px;
    margin-bottom: 20px;
  }
  
  .empty-icon ion-icon {
    font-size: 64px;
  }
  
  .empty-title {
    font-size: var(--font-size-xl);
  }
  
  .empty-message {
    font-size: var(--font-size-sm);
    margin-bottom: 28px;
  }
  
  .add-button {
    min-height: var(--button-height-mobile);
    --padding-start: 24px;
    --padding-end: 24px;
  }
}
</style>
