<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Firebase Connection</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="status-container">
        <div class="status-card">
          <div class="status-icon" :class="connectionStatusClass">
            <ion-icon :icon="statusIcon" size="large"></ion-icon>
          </div>
          
          <h2 class="status-title">{{ statusTitle }}</h2>
          <p class="status-message">{{ statusMessage }}</p>
          
          <div v-if="isChecking" class="loading-section">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Checking connection...</p>
          </div>
          
          <ion-button 
            v-if="!isChecking" 
            expand="block" 
            @click="checkConnection"
            class="check-btn"
          >
            <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
            Check Connection
          </ion-button>
          
          <div v-if="connectionDetails" class="details-section">
            <h3>Connection Details</h3>
            <div class="detail-item">
              <span class="detail-label">Project ID:</span>
              <span class="detail-value">{{ connectionDetails.projectId }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Database URL:</span>
              <span class="detail-value">{{ connectionDetails.databaseUrl }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">App ID:</span>
              <span class="detail-value">{{ connectionDetails.appId }}</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/vue';
import { 
  checkmarkCircle, 
  closeCircle, 
  refreshOutline,
  cloudOfflineOutline,
  cloudDoneOutline
} from 'ionicons/icons';
import { database } from '../firebase/config';
import { ref as dbRef, get } from 'firebase/database';

const isChecking = ref(false);
const isConnected = ref(false);
const errorMessage = ref('');
const connectionDetails = ref<any>(null);

const statusIcon = computed(() => {
  if (isChecking.value) return refreshOutline;
  if (isConnected.value) return cloudDoneOutline;
  return cloudOfflineOutline;
});

const connectionStatusClass = computed(() => {
  if (isChecking.value) return 'checking';
  if (isConnected.value) return 'connected';
  return 'disconnected';
});

const statusTitle = computed(() => {
  if (isChecking.value) return 'Checking...';
  if (isConnected.value) return 'Connected to Firebase';
  return 'Connection Failed';
});

const statusMessage = computed(() => {
  if (isChecking.value) return 'Please wait while we verify your Firebase connection.';
  if (isConnected.value) return 'Your app is successfully connected to Firebase Realtime Database.';
  return errorMessage.value || 'Unable to connect to Firebase. Please check your configuration.';
});

const checkConnection = async () => {
  isChecking.value = true;
  isConnected.value = false;
  errorMessage.value = '';
  connectionDetails.value = null;

  try {
    const testRef = dbRef(database, 'movies');
    const snapshot = await get(testRef);
    
    isConnected.value = true;
    connectionDetails.value = {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      databaseUrl: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  } catch (error: any) {
    isConnected.value = false;
    errorMessage.value = error.message || 'Unknown error occurred while checking connection.';
    console.error('Firebase connection error:', error);
  } finally {
    isChecking.value = false;
  }
};

onMounted(() => {
  checkConnection();
});
</script>

<style scoped>
.status-container {
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 56px);
}

.status-card {
  background: var(--medium-color);
  border-radius: var(--radius-lg);
  padding: 32px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  border: 1px solid var(--border-color);
}

.status-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

.status-icon.checking {
  background: rgba(255, 160, 10, 0.15);
  color: var(--warning-color);
}

.status-icon.connected {
  background: rgba(70, 211, 105, 0.15);
  color: var(--success-color);
}

.status-icon.disconnected {
  background: rgba(229, 9, 20, 0.15);
  color: var(--danger-color);
}

.status-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.status-message {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.6;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.loading-section ion-spinner {
  color: var(--primary-color);
}

.loading-section p {
  color: var(--text-secondary);
  margin: 0;
}

.check-btn {
  --border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 32px;
}

.details-section {
  text-align: left;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.details-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-value {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

@media (max-width: 768px) {
  .status-container {
    padding: 16px;
  }
  
  .status-card {
    padding: 24px;
  }
  
  .status-icon {
    width: 64px;
    height: 64px;
    font-size: 2rem;
  }
  
  .status-title {
    font-size: 1.25rem;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .detail-value {
    text-align: left;
    max-width: 100%;
  }
}
</style>
