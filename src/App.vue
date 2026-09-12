<template>
  <ion-app>
    <ion-menu menu-id="main-menu" content-id="main-content" type="overlay" :disabled="isMobile">
      <ion-content>
        <div class="menu-header">
          <ion-icon :icon="filmOutline" class="menu-logo" />
          <h2 class="menu-title">CineList</h2>
        </div>

        <ion-list lines="none">
          <ion-item
            v-for="item in navItems"
            :key="item.path"
            button
            :router-link="item.path"
            :class="{ 'menu-item-selected': currentPath === item.path }"
            @click="closeMenu"
          >
            <ion-icon slot="start" :icon="item.icon" />
            <ion-label>{{ item.label }}</ion-label>
          </ion-item>
        </ion-list>

        <!-- The toolbar toggle is the fast affordance; this one is the explanatory one.
             It is desktop-only by virtue of the menu being disabled on mobile. -->
        <div class="menu-footer">
          <ion-item lines="none" class="theme-row">
            <ion-icon slot="start" :icon="isDark ? moonOutline : sunnyOutline" />
            <ion-toggle
              :checked="isDark"
              label-placement="start"
              @ion-change="setPreference($event.detail.checked ? 'dark' : 'light')"
            >
              Dark theme
            </ion-toggle>
          </ion-item>
        </div>
      </ion-content>
    </ion-menu>

    <div class="ion-page" id="main-content">
      <ion-router-outlet />

      <ion-tab-bar v-if="isMobile" slot="bottom">
        <ion-tab-button
          v-for="item in navItems"
          :key="item.path"
          :tab="item.tab"
          :href="item.path"
          :selected="currentPath === item.path"
        >
          <ion-icon :icon="item.icon" />
          <ion-label>{{ item.shortLabel }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </div>
  </ion-app>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  menuController,
  IonApp,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonToggle,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet
} from '@ionic/vue';
import {
  filmOutline,
  homeOutline,
  listOutline,
  addCircleOutline,
  cloudDoneOutline,
  sunnyOutline,
  moonOutline
} from 'ionicons/icons';
import { useBreakpoint } from './composables/useBreakpoint';
import { useTheme } from './composables/useTheme';

const route = useRoute();
const { isMobile } = useBreakpoint();
const { isDark, setPreference } = useTheme();

const currentPath = computed(() => route.path);

const navItems = [
  { path: '/dashboard', tab: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: homeOutline },
  { path: '/watchlist', tab: 'watchlist', label: 'My Watchlist', shortLabel: 'Watchlist', icon: listOutline },
  { path: '/add', tab: 'add', label: 'Add Movie', shortLabel: 'Add', icon: addCircleOutline },
  { path: '/firebase-status', tab: 'firebase-status', label: 'Firebase Status', shortLabel: 'Status', icon: cloudDoneOutline }
];

const closeMenu = async () => {
  await menuController.close();
};
</script>

<style scoped>
/* The tab bar is used outside <ion-tabs>, so its slot="bottom" carries no meaning and it
 * is simply the next flex child after the router outlet. The outlet is size-contained,
 * which makes its intrinsic height zero, so without an explicit grow it collapses and
 * the bar rides up over the page. */
#main-content {
  display: flex;
  flex-direction: column;
}

#main-content > ion-router-outlet {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl) var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);
}

.menu-logo {
  font-size: 2.25rem;
  color: var(--primary-color);
}

.menu-title {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 1px;
  text-transform: uppercase;
}

ion-item {
  --padding-start: var(--spacing-xl);
  --padding-end: var(--spacing-xl);
  --min-height: 60px;
  --background: transparent;
  margin: 4px var(--spacing-md);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-normal);
}

ion-item:hover {
  --background: var(--overlay-hover);
}

ion-item.menu-item-selected {
  --background: rgba(var(--primary-color-rgb), var(--chip-alpha));
  --color: var(--primary-text);
}

ion-item.menu-item-selected ion-icon,
ion-item.menu-item-selected ion-label {
  color: var(--primary-text);
}

ion-item ion-icon {
  font-size: 1.4rem;
  color: var(--text-secondary);
}

ion-item ion-label {
  font-weight: 600;
  font-size: var(--font-size-md);
}

.menu-footer {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-color);
}

.theme-row {
  --min-height: 56px;
}

.theme-row ion-toggle {
  width: 100%;
  font-weight: 600;
  font-size: var(--font-size-sm);
}

ion-tab-bar {
  height: 64px;
  padding-bottom: env(safe-area-inset-bottom);
}

ion-tab-button {
  --color: var(--text-tertiary);
  --color-selected: var(--primary-color);
}

ion-tab-button ion-icon {
  font-size: 1.4rem;
  margin-bottom: 2px;
}

ion-tab-button ion-label {
  font-size: 11px;
  font-weight: 600;
}

@media (min-width: 768px) {
  ion-tab-bar {
    display: none;
  }
}

@media (max-width: 767.98px) {
  .menu-header {
    padding: var(--spacing-xl) var(--spacing-lg);
  }
}
</style>
