<template>
  <ion-app>
    <ion-menu menu-id="main-menu" content-id="main-content" type="overlay" :disabled="isMobile">
      <ion-content>
        <div class="menu-header">
          <ion-icon :icon="filmOutline" class="menu-logo"></ion-icon>
          <h2 class="menu-title">CineList</h2>
        </div>
        
        <ion-list lines="none">
          <ion-item button :router-link="'/dashboard'" :class="{ 'menu-item-selected': currentPath === '/dashboard' }" @click="closeMenu">
            <ion-icon slot="start" :icon="homeOutline"></ion-icon>
            <ion-label>Dashboard</ion-label>
          </ion-item>
          
          <ion-item button :router-link="'/watchlist'" :class="{ 'menu-item-selected': currentPath === '/watchlist' }" @click="closeMenu">
            <ion-icon slot="start" :icon="listOutline"></ion-icon>
            <ion-label>My Watchlist</ion-label>
          </ion-item>
          
          <ion-item button :router-link="'/add'" :class="{ 'menu-item-selected': currentPath === '/add' }" @click="closeMenu">
            <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
            <ion-label>Add Movie</ion-label>
          </ion-item>
          
          <ion-item button :router-link="'/firebase-status'" :class="{ 'menu-item-selected': currentPath === '/firebase-status' }" @click="closeMenu">
            <ion-icon slot="start" :icon="cloudDoneOutline"></ion-icon>
            <ion-label>Firebase Status</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-menu>
    
    <div class="ion-page" id="main-content">
      <ion-router-outlet></ion-router-outlet>
      
      <ion-tab-bar v-if="isMobile" slot="bottom">
        <ion-tab-button tab="dashboard" href="/dashboard" :selected="currentPath === '/dashboard'">
          <ion-icon :icon="homeOutline"></ion-icon>
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="watchlist" href="/watchlist" :selected="currentPath === '/watchlist'">
          <ion-icon :icon="listOutline"></ion-icon>
          <ion-label>Watchlist</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="add" href="/add" :selected="currentPath === '/add'">
          <ion-icon :icon="addCircleOutline"></ion-icon>
          <ion-label>Add</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="firebase-status" href="/firebase-status" :selected="currentPath === '/firebase-status'">
          <ion-icon :icon="cloudDoneOutline"></ion-icon>
          <ion-label>Status</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </div>
  </ion-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { menuController } from '@ionic/vue';
import { 
  IonApp, 
  IonMenu, 
  IonContent, 
  IonList, 
  IonItem, 
  IonIcon, 
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet
} from '@ionic/vue';
import { 
  filmOutline, 
  homeOutline, 
  listOutline, 
  addCircleOutline,
  cloudDoneOutline
} from 'ionicons/icons';

const route = useRoute();
const isMobile = ref(true);

const currentPath = computed(() => route.path);

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
};

const closeMenu = async () => {
  await menuController.close();
};
</script>

<style scoped>
.menu-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 32px 24px;
  border-bottom: 1px solid var(--border-color);
}

.menu-logo {
  font-size: 2.5rem;
  color: var(--primary-color);
}

.menu-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

ion-item {
  --padding-start: 24px;
  --padding-end: 24px;
  --min-height: 64px;
  margin: 6px 16px;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-normal), transform var(--transition-fast);
  --background: transparent;
}

ion-item:hover {
  --background: rgba(255, 255, 255, 0.05);
}

ion-item.menu-item-selected {
  --background: rgba(229, 9, 20, 0.15);
  color: var(--primary-color);
}

ion-item.menu-item-selected ion-icon,
ion-item.menu-item-selected ion-label {
  color: var(--primary-color);
}

ion-item ion-icon {
  font-size: 1.5rem;
}

ion-item ion-label {
  font-weight: 600;
  font-size: var(--font-size-md);
}

ion-tab-bar {
  --background: var(--medium-color);
  --border-color: var(--border-color);
  height: 64px;
}

ion-tab-button {
  --color: var(--text-tertiary);
  --color-selected: var(--primary-color);
}

ion-tab-button ion-icon {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

ion-tab-button ion-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

@media (min-width: 768px) {
  ion-tab-bar {
    display: none;
  }
}

@media (max-width: 768px) {
  .menu-header {
    padding: 24px 20px;
  }
  
  .menu-logo {
    font-size: 2rem;
  }
  
  .menu-title {
    font-size: 1.5rem;
  }
  
  ion-item {
    --min-height: 56px;
    margin: 4px 12px;
  }
  
  ion-item ion-icon {
    font-size: 1.25rem;
  }
  
  ion-item ion-label {
    font-size: var(--font-size-sm);
  }
}
</style>
