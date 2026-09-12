<template>
  <ion-button
    fill="clear"
    class="theme-toggle"
    :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    :aria-pressed="isDark"
    @click="toggle"
  >
    <ion-icon slot="icon-only" :icon="isDark ? sunnyOutline : moonOutline" class="toggle-icon" />
  </ion-button>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue';
import { sunnyOutline, moonOutline } from 'ionicons/icons';
import { useTheme } from '../composables/useTheme';

const { isDark, toggle } = useTheme();
</script>

<style scoped>
.theme-toggle {
  --color: var(--text-secondary);
  --padding-start: 8px;
  --padding-end: 8px;
  min-height: 44px;
}

.theme-toggle:hover {
  --color: var(--primary-text);
}

.toggle-icon {
  font-size: 1.4rem;
  transition: transform var(--transition-normal);
}

.theme-toggle:active .toggle-icon {
  transform: rotate(40deg);
}
</style>
