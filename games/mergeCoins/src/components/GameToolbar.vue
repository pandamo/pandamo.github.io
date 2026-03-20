<script setup>
import { Icon } from "@iconify/vue/offline";
defineProps({
  canUndo: Boolean,
  busy: Boolean,
  showRestore: Boolean,
});

const emit = defineEmits(["undo", "deal", "reset", "restore"]);
</script>

<template>
  <div class="controls pixel-panel--controls">
    <button
      class="pixel-action-button"
      :disabled="!canUndo || busy"
      @click="emit('undo')"
    >
      <Icon icon="pixelarticons:redo" flip="horizontal" width="24" />
    </button>
    <button class="pixel-action-button" :disabled="busy" @click="emit('deal')">
      <Icon
        icon="pixelarticons:arrow-big-down-dash-sharp"
        flip="horizontal"
        width="24"
      />
    </button>
    <button
      v-if="showRestore"
      class="pixel-action-button"
      :disabled="busy"
      @click="emit('restore')"
    >
      恢复记录
    </button>
    <button
      class="pixel-action-button pixel-action-button--danger"
      :disabled="busy"
      @click="emit('reset')"
    >
      <Icon icon="pixelarticons:repeat" flip="horizontal" width="24" />
    </button>
  </div>
</template>
