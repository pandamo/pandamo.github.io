<script setup>
import { onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import LeaderboardList from '../components/LeaderboardList.vue'
import { useAuth } from '../composables/useAuth'
import { useLeaderboard } from '../composables/useLeaderboard'

const { user, initialized, refreshSession } = useAuth()
const { entries, loading, errorMessage, loadLeaderboard } = useLeaderboard()

onMounted(async () => {
  await Promise.all([loadLeaderboard(), refreshSession()])
})
</script>

<template>
  <div class="page-shell home-page">
    <header class="hero">
      <h1>Merge Coins</h1>
    </header>

    <main class="main-panel shell-card">
      <div class="section-header">
        <h2 class="section-title">TOP10</h2>
        <Icon icon="solar:ranking-bold" class="section-icon" />
      </div>

      <div v-if="loading" class="status loading">
        <span class="loading-spinner" aria-hidden="true"></span>
      </div>
      <div v-else-if="errorMessage" class="status error">
        {{ errorMessage }}
      </div>

      <LeaderboardList :entries="entries" />
    </main>

    <footer v-if="initialized" class="footer-actions">
      <div v-if="user" class="action-bar">
        <RouterLink class="button primary" to="/game">
          <Icon icon="solar:play-bold" />
          <span>进入游戏</span>
        </RouterLink>
      </div>
      <div v-else class="action-bar">
        <RouterLink class="button primary" to="/auth">
          <Icon icon="solar:user-plus-bold" />
          <span>注册</span>
        </RouterLink>
        <RouterLink class="button secondary" to="/auth">
          <Icon icon="solar:login-2-bold" />
          <span>登录</span>
        </RouterLink>
      </div>
    </footer>
  </div>
</template>
