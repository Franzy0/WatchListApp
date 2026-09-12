<template>
  <ion-header class="page-header">
    <ion-toolbar>
      <ion-buttons v-if="showStart" slot="start">
        <slot name="start">
          <ion-back-button v-if="backHref" :default-href="backHref" />
          <!-- Only rendered where the side menu actually opens. Below the mobile
               breakpoint the menu is disabled, so the button would do nothing. -->
          <ion-menu-button v-else-if="!isMobile" menu="main-menu" />
        </slot>
      </ion-buttons>

      <ion-title :class="{ condensed }">{{ title }}</ion-title>

      <ion-buttons slot="end">
        <slot name="end" />
        <ThemeToggle />
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonMenuButton
} from '@ionic/vue';
import ThemeToggle from './ThemeToggle.vue';
import { useBreakpoint } from '../composables/useBreakpoint';

interface Props {
  title: string;
  /** Set to show a back button instead of the menu button. */
  backHref?: string;
  /** Slightly smaller title, for form pages where the hero carries the heading. */
  condensed?: boolean;
}

const props = defineProps<Props>();
const slots = useSlots();
const { isMobile } = useBreakpoint();

// Leaving an empty ion-buttons in the start slot still reserves width and pushes the
// title off-centre, so the whole thing is skipped when there is nothing to show.
const showStart = computed(() => Boolean(props.backHref) || !isMobile.value || !!slots.start);
</script>

<style scoped>
.page-header {
  /* No bottom shadow: the toolbar and the content share a surface colour and a hard
     line reads better than a blur against the poster grid. */
  box-shadow: none;
}

ion-toolbar {
  --border-width: 0 0 1px 0;
  --border-color: var(--border-color);
  --border-style: solid;
}

ion-title.condensed {
  font-size: var(--font-size-lg);
}
</style>
