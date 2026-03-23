<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { Icon } from "@iconify/vue/offline";
import { useRouter } from "vue-router";
import GameBoard from "../components/GameBoard.vue";
import GameToolbar from "../components/GameToolbar.vue";
import { useAuth } from "../composables/useAuth";
import { useGameState } from "../composables/useGameState";
import { useGameSync } from "../composables/useGameSync";
import { useLeaderboard } from "../composables/useLeaderboard";

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
  maxCapacity,
  getColorForValue,
} = gameState;
const syncReady = ref(false);
const pageLoading = ref(true);
const showGameOver = ref(false);
const playerNameTapCount = ref(0);
const showLocalSavePanel = ref(false);
const restoreError = ref("");
const worldRecord = ref(1);
const showSignOutConfirm = ref(false);
const showResetConfirm = ref(false);
const showToolbar = ref(true);
const lastBoardScrollTop = ref(0);

const sync = useGameSync(user, gameState);
const { syncMessage, syncIsError } = sync;
const { loadTopRecord } = useLeaderboard();

const playerName = computed(() => {
  const email = user.value?.email || "";
  return email.split("@")[0] || "玩家";
});

const localSaveText = computed(
  () => localStorage.getItem(sync.storageKey) || "",
);

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

  worldRecord.value = await loadTopRecord();
  gameState.checkGameOver();
  syncReady.value = true;
  pageLoading.value = false;
}

async function persistAfter(actionResult) {
  if (!actionResult) return;
  await sync.saveState();
  worldRecord.value = Math.max(worldRecord.value, maxRecord.value);
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

async function confirmReset() {
  await sync.clearState();
  showGameOver.value = false;
  showResetConfirm.value = false;
}

function openResetConfirm() {
  showResetConfirm.value = true;
}

function closeResetConfirm() {
  if (authLoading.value) return;
  showResetConfirm.value = false;
}

async function handleReset() {
  openResetConfirm();
}

async function handleSignOut() {
  const success = await signOut();
  if (success) {
    showSignOutConfirm.value = false;
    router.push("/");
  }
}

function openSignOutConfirm() {
  showSignOutConfirm.value = true;
}

function closeSignOutConfirm() {
  if (authLoading.value) return;
  showSignOutConfirm.value = false;
}

function handleBoardScroll() {
  const currentScrollTop = document.documentElement.scrollTop;
  const delta = currentScrollTop - lastBoardScrollTop.value;

  if (currentScrollTop <= 24) {
    showToolbar.value = true;
  } else if (delta > 8) {
    showToolbar.value = false;
  } else if (delta < -8) {
    showToolbar.value = true;
  }

  lastBoardScrollTop.value = currentScrollTop;
}

function handlePlayerNameClick() {
  playerNameTapCount.value += 1;

  if (playerNameTapCount.value > 20) {
    showLocalSavePanel.value = true;
  }
  setTimeout(() => {
    playerNameTapCount.value = 0;
  }, 10000);
}

function isValidRestoreState(state) {
  if (!state || typeof state !== "object") {
    return false;
  }

  if (!Array.isArray(state.bottles)) {
    return false;
  }

  if (!Number.isInteger(state.maxFaceValue) || state.maxFaceValue < 1) {
    return false;
  }

  if (!Number.isInteger(state.maxRecord) || state.maxRecord < 1) {
    return false;
  }

  if (!Number.isInteger(state.bottleCount) || state.bottleCount < 2) {
    return false;
  }

  if (typeof state.isGameOver !== "boolean") {
    return false;
  }

  if (state.bottles.length !== state.bottleCount) {
    return false;
  }

  return state.bottles.every((bottle) => {
    if (!Array.isArray(bottle) || bottle.length > maxCapacity) {
      return false;
    }

    return bottle.every(
      (value) =>
        Number.isInteger(value) && value >= 1 && value <= state.maxFaceValue,
    );
  });
}

async function handleRestoreLocalSave() {
  restoreError.value = "";

  try {
    const rawSave = localSaveText.value;
    if (!rawSave) {
      restoreError.value = "没有可恢复的本地记录。";
      return;
    }

    const parsed = JSON.parse(rawSave);
    if (!isValidRestoreState(parsed)) {
      restoreError.value = "gameSave 格式不正确，无法恢复。";
      return;
    }

    gameState.applyState(parsed);
    localStorage.setItem(sync.storageKey, JSON.stringify(parsed));
    await sync.saveState();
    window.location.reload();
  } catch {
    restoreError.value = "gameSave 不是有效的 JSON。";
  }
}

onMounted(async () => {
  await initGame();
  showGameOver.value = gameState.isGameOver.value;
  lastBoardScrollTop.value = document.documentElement.scrollTop;
  window.addEventListener("scroll", handleBoardScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleBoardScroll);
});
</script>

<template>
  <div class="page-shell game-page">
    <div
      v-if="showSignOutConfirm"
      class="signout-confirm-overlay"
      @click.self="closeSignOutConfirm"
    >
      <div class="signout-confirm-dialog pixel-panel">
        <div class="signout-confirm-title">确认退出登录？</div>
        <div class="signout-confirm-text">
          退出后需要重新登录才能继续云存档。
        </div>
        <div class="signout-confirm-actions">
          <button
            class="pixel-action-button"
            type="button"
            :disabled="authLoading"
            @click="closeSignOutConfirm"
          >
            <Icon icon="pixelarticons:undo" width="24" />
          </button>
          <button
            class="pixel-action-button pixel-action-button--danger"
            type="button"
            :disabled="authLoading"
            @click="handleSignOut"
          >
            <Icon icon="pixelarticons:check" width="24" />
          </button>
        </div>
      </div>
    </div>
    <div
      v-if="showResetConfirm"
      class="signout-confirm-overlay"
      @click.self="closeResetConfirm"
    >
      <div class="signout-confirm-dialog pixel-panel">
        <div class="signout-confirm-title">确认重新开始？</div>
        <div class="signout-confirm-text">重新开始后会清除当前进度！</div>
        <div class="signout-confirm-actions">
          <button
            class="pixel-action-button"
            type="button"
            :disabled="authLoading"
            @click="closeResetConfirm"
          >
            <Icon icon="pixelarticons:undo" width="24" />
          </button>
          <button
            class="pixel-action-button pixel-action-button--danger"
            type="button"
            :disabled="authLoading"
            @click="confirmReset"
          >
            <Icon icon="pixelarticons:check" width="24" />
          </button>
        </div>
      </div>
    </div>

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
          <button
            class="player-name-button"
            type="button"
            @click="handlePlayerNameClick"
          >
            <span class="player-name">{{ playerName }}</span>
          </button>
          <span class="sync-status" :class="{ error: syncIsError }">{{
            syncMessage
          }}</span>
        </div>

        <button
          class="icon-button pixel-tool-button"
          type="button"
          aria-label="退出登录"
          title="退出登录"
          @click="openSignOutConfirm"
        >
          <Icon icon="pixelarticons:logout" />
        </button>
      </div>

      <div
        v-if="showLocalSavePanel"
        class="status-panel game-save-panel"
        :class="{ error: restoreError }"
      >
        <div class="game-save-header">
          <strong>gameSave</strong>
          <span v-if="restoreError">{{ restoreError }}</span>
        </div>
        <textarea
          class="game-save-output"
          readonly
          :value="localSaveText"
          @focus="$event.target.select()"
        />
      </div>

      <table class="status-bar">
        <tbody>
          <tr>
            <td>
              当前最高数字
              <div class="status-value">{{ maxFaceValue }}</div>
            </td>
            <td>
              个人最高纪录
              <div class="status-record">{{ maxRecord }}</div>
            </td>
            <td>
              全球最高纪录
              <div class="status-word-record">{{ worldRecord }}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="showGameOver" class="game-over-banner pixel-panel">
        游戏结束！最终最高数字：{{ maxFaceValue }}
      </div>

      <GameBoard
        :bottles="bottles"
        :selected-bottle-index="selectedBottleIndex"
        :is-game-over="isGameOver"
        :max-capacity="maxCapacity"
        :get-color-for-value="getColorForValue"
        @select="handleBottleSelect"
      />

      <GameToolbar
        v-if="syncReady"
        :can-undo="canUndo"
        :busy="authLoading"
        :show-restore="showLocalSavePanel"
        :hidden="!showToolbar"
        @undo="handleUndo"
        @deal="handleDeal"
        @restore="handleRestoreLocalSave"
        @reset="handleReset"
      />
    </div>
  </div>
</template>
