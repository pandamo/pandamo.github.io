<script setup>
import { computed, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useRouter } from "vue-router";
import GameBoard from "../components/GameBoard.vue";
import GameToolbar from "../components/GameToolbar.vue";
import { useAuth } from "../composables/useAuth";
import { useGameState } from "../composables/useGameState";
import { useGameSync } from "../composables/useGameSync";

const router = useRouter();
const { user, refreshSession, signOut, loading: authLoading } = useAuth();
const gameState = useGameState();
const {
  maxFaceValue,
  maxRecord,
  bottles,
  selectedBottleIndex,
  isGameOver,
  canUndo,
  getColorForValue,
} = gameState;
const syncReady = ref(false);
const pageLoading = ref(true);
const showGameOver = ref(false);

const sync = useGameSync(user, gameState);
const { syncMessage, syncIsError } = sync;

const playerName = computed(() => {
  const email = user.value?.email || "";
  return email.split("@")[0] || "玩家";
});

async function initGame() {
  pageLoading.value = true;
  const sessionUser = await refreshSession();

  if (!sessionUser) {
    router.replace("/auth");
    return;
  }

  await sync.ensureProfile();
  const loaded = await sync.loadState();
  if (!loaded) {
    gameState.createFreshGame();
    await sync.saveState();
  }

  gameState.checkGameOver();
  syncReady.value = true;
  pageLoading.value = false;
}

async function persistAfter(actionResult) {
  if (!actionResult) return;
  await sync.saveState();
  showGameOver.value = gameState.isGameOver.value;
}

async function handleBottleSelect(index) {
  const moved = gameState.handleBottleClick(index);
  await persistAfter(moved);
}

async function handleDeal() {
  const dealt = gameState.deal();
  await persistAfter(dealt);
}

async function handleUndo() {
  const undone = gameState.undo();
  await persistAfter(undone);
}

async function handleReset() {
  const confirmed = window.confirm("确定要重置游戏吗？此操作将清除所有进度！");
  if (!confirmed) return;
  await sync.clearState();
  showGameOver.value = false;
}

async function handleSignOut() {
  const success = await signOut();
  if (success) {
    router.push("/");
  }
}

onMounted(async () => {
  await initGame();
  showGameOver.value = gameState.isGameOver.value;
});
</script>

<template>
  <div class="page-shell game-page">
    <div v-if="pageLoading" class="game-loading-screen">
      <span class="game-loading-spinner" aria-hidden="true"></span>
    </div>

    <div v-else class="game-container fade-in">
      <div class="page-actions pixel-panel">
        <RouterLink
          class="icon-link pixel-tool-button"
          to="/"
          aria-label="返回首页"
          title="返回首页"
        >
          <Icon icon="pixelarticons:home" />
        </RouterLink>

        <div class="player-summary pixel-panel pixel-panel--info">
          <span class="player-name">{{ playerName }}</span>
          <span class="sync-status" :class="{ error: syncIsError }">{{
            syncMessage
          }}</span>
        </div>

        <button
          class="icon-button pixel-tool-button"
          type="button"
          aria-label="退出登录"
          title="退出登录"
          @click="handleSignOut"
        >
          <Icon icon="pixelarticons:redo-sharp" />
        </button>
      </div>

      <table class="status-bar">
        <tbody>
          <tr>
            <td>
              当前最高数字
              <div class="status-value">{{ maxFaceValue }}</div>
            </td>
            <td>
              最高纪录
              <div class="status-record">{{ maxRecord }}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <!--  <div class="status-bar pixel-panel">
        <div class="status-box pixel-panel pixel-panel--inner">
          当前最高数字
          <div class="status-value">{{ maxFaceValue }}</div>
        </div>
        <div class="status-box pixel-panel pixel-panel--inner">
          最高纪录
          <div class="status-record">{{ maxRecord }}</div>
        </div>
      </div> -->

      <div v-if="showGameOver" class="game-over-banner pixel-panel">
        游戏结束！最终最高数字：{{ maxFaceValue }}
      </div>

      <GameBoard
        :bottles="bottles"
        :selected-bottle-index="selectedBottleIndex"
        :is-game-over="isGameOver"
        :get-color-for-value="getColorForValue"
        @select="handleBottleSelect"
      />

      <GameToolbar
        v-if="syncReady"
        :can-undo="canUndo"
        :busy="authLoading"
        @undo="handleUndo"
        @deal="handleDeal"
        @reset="handleReset"
      />
    </div>
  </div>
</template>
