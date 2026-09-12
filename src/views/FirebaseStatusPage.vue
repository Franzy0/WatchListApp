<template>
  <ion-page>
    <PageHeader title="Firebase Connection" back-href="/dashboard" />

    <ion-content :fullscreen="true">
      <div class="page-container page-container--narrow">
        <div class="status-card">
          <div class="icon-chip status-icon" :class="statusChipClass">
            <ion-icon :icon="statusIcon" />
          </div>

          <h2 class="status-title">{{ statusTitle }}</h2>
          <p class="status-message">{{ statusMessage }}</p>

          <div v-if="isChecking" class="loading-section">
            <ion-spinner name="crescent" />
            <p>Checking connection...</p>
          </div>

          <ion-button
            v-else
            expand="block"
            color="primary"
            class="check-btn"
            @click="checkConnection"
          >
            <ion-icon slot="start" :icon="refreshOutline" />
            Check Connection
          </ion-button>

          <div class="details-section">
            <h3 class="details-title">Connection Details</h3>
            <dl class="details-list">
              <div v-for="row in details" :key="row.label" class="detail-item">
                <dt class="detail-label">{{ row.label }}</dt>
                <dd class="detail-value">{{ row.value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/vue';
import { refreshOutline, cloudOfflineOutline, cloudDoneOutline } from 'ionicons/icons';
import PageHeader from '../components/PageHeader.vue';
import { database, isStorageConfigured } from '../firebase/config';
import { ref as dbRef, get } from 'firebase/database';

interface ConnectionDetails {
  projectId: string;
  databaseUrl: string;
  appId: string;
}

const isChecking = ref(false);
const isConnected = ref(false);
const errorMessage = ref('');
const connectionDetails = ref<ConnectionDetails | null>(null);

const statusIcon = computed(() => {
  if (isChecking.value) return refreshOutline;
  return isConnected.value ? cloudDoneOutline : cloudOfflineOutline;
});

const statusChipClass = computed(() => {
  if (isChecking.value) return 'icon-chip--warning';
  return isConnected.value ? 'icon-chip--success' : 'icon-chip--danger';
});

const statusTitle = computed(() => {
  if (isChecking.value) return 'Checking...';
  return isConnected.value ? 'Connected to Firebase' : 'Connection Failed';
});

const statusMessage = computed(() => {
  if (isChecking.value) return 'Please wait while we verify your Firebase connection.';
  if (isConnected.value) {
    return 'Your app is successfully connected to Firebase Realtime Database.';
  }
  return errorMessage.value || 'Unable to connect to Firebase. Please check your configuration.';
});

const details = computed(() => [
  { label: 'Project ID', value: connectionDetails.value?.projectId ?? 'Unknown' },
  { label: 'Database URL', value: connectionDetails.value?.databaseUrl ?? 'Unknown' },
  { label: 'App ID', value: connectionDetails.value?.appId ?? 'Unknown' },
  { label: 'Image storage', value: isStorageConfigured ? 'Configured' : 'Not configured' }
]);

const checkConnection = async () => {
  isChecking.value = true;
  isConnected.value = false;
  errorMessage.value = '';
  connectionDetails.value = null;

  try {
    await get(dbRef(database, 'movies'));

    isConnected.value = true;
    connectionDetails.value = {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      databaseUrl: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  } catch (error) {
    isConnected.value = false;
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Unknown error occurred while checking connection.';
    console.error('Firebase connection error:', error);
  } finally {
    isChecking.value = false;
  }
};

onMounted(checkConnection);
</script>

<style scoped>
.status-card {
  background: var(--surface-1);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-2xl) var(--spacing-xl);
  text-align: center;
}

.status-icon {
  --chip-size: 80px;
  border-radius: 50%;
  margin: 0 auto var(--spacing-lg);
}

.status-title {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
  letter-spacing: 0.3px;
}

.status-message {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xl);
  line-height: 1.55;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
}

.loading-section p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.check-btn {
  --border-radius: var(--radius-md);
  min-height: var(--button-height-mobile);
  font-weight: 600;
}

.details-section {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  text-align: left;
}

.details-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.details-list {
  margin: 0;
}

.detail-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid var(--border-color-light);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 600;
  margin: 0;
}

/* These are identifiers and URLs, which are far easier to scan in a monospace face
   than broken mid-word across a proportional one. */
.detail-value {
  font-family: ui-monospace, 'SFMono-Regular', 'Roboto Mono', Menlo, monospace;
  font-size: var(--font-size-xs);
  color: var(--text-primary);
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 767.98px) {
  .status-card {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  .detail-item {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
