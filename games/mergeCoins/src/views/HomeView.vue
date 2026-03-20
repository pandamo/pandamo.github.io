<script setup>
import { onMounted } from "vue";
import { Icon } from "@iconify/vue/offline";
import LeaderboardList from "../components/LeaderboardList.vue";
import { useAuth } from "../composables/useAuth";
import { useLeaderboard } from "../composables/useLeaderboard";

const { user, initialized, refreshSession } = useAuth();
const { entries, loading, errorMessage, loadLeaderboard } = useLeaderboard();
//const loading = ref(false);

onMounted(async () => {
  //loading.value = true;
  await Promise.all([loadLeaderboard(), refreshSession()]);
  // loading.value = false;
});
</script>

<template>
  <div class="page-shell home-page">
    <header class="hero">
      <h1>Merge Coins</h1>
    </header>

    <main class="main-panel shell-card pixel-panel">
      <div class="section-header">
        <Icon icon="pixelarticons:crown-sharp" class="section-icon" />
        <h2 class="section-title">TOP10</h2>
      </div>

      <div v-if="loading" class="status loading">
        <span class="loading-spinner" aria-hidden="true"></span>
      </div>
      <div v-else-if="errorMessage" class="status error">
        {{ errorMessage }}
      </div>

      <LeaderboardList :entries="entries" :loading="loading" />
    </main>

    <footer v-if="initialized" class="footer-actions">
      <div v-if="user" class="action-bar">
        <RouterLink class="button primary" to="/game">
          <Icon
            icon="pixelarticons:chevron-right-2"
            width="48"
            color="#fbbf24"
          />
        </RouterLink>
      </div>
      <div v-else class="action-bar">
        <RouterLink class="button primary" to="/auth">
          <Icon icon="pixelarticons:user-plus" width="24" />
          /
          <Icon icon="pixelarticons:login" width="24" />
        </RouterLink>
      </div>
    </footer>
  </div>
</template>
