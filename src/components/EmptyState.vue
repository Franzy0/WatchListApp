<template>
  <div class="empty-state">
    <div class="empty-icon">
      <ion-icon :icon="icon" />
    </div>
    <h2 class="empty-title">{{ title }}</h2>
    <p class="empty-message">{{ message }}</p>
    <slot />
    <ion-button
      v-if="showAddButton"
      fill="solid"
      color="primary"
      class="add-button"
      @click="$emit('add-movie')"
    >
      <ion-icon slot="start" :icon="addOutline" />
      {{ actionLabel }}
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
 
  icon?: string;
  actionLabel?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'Your watchlist is empty',
  message: 'Start building your movie collection by adding your first movie.',
  showAddButton: true,
  icon: filmOutline,
  actionLabel: 'Add Movie'
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
  text-align: center;
  padding: var(--spacing-4xl) var(--spacing-lg);
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(var(--primary-color-rgb), var(--chip-alpha));
  color: var(--primary-text);
  font-size: 2.75rem;
  margin-bottom: var(--spacing-lg);
}

.empty-title {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
  letter-spacing: 0.3px;
}

.empty-message {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xl);
  max-width: 420px;
  line-height: 1.55;
}

.add-button {
  --border-radius: var(--radius-md);
  min-height: var(--button-height-mobile);
  font-weight: 600;
}

@media (max-width: 767.98px) {
  .empty-state {
    padding: var(--spacing-3xl) var(--spacing-md);
  }

  .empty-icon {
    width: 76px;
    height: 76px;
    font-size: 2.25rem;
  }

  .empty-title {
    font-size: var(--font-size-xl);
  }
}
</style>
