<script setup>
import { Icon } from "@iconify/vue/offline";

defineProps({
  busy: Boolean,
  message: {
    type: String,
    required: true,
  },
  open: Boolean,
  title: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["close", "confirm"]);
</script>

<template>
  <div
    v-if="open"
    class="confirm-dialog-overlay"
    @click.self="emit('close')"
  >
    <div class="confirm-dialog pixel-panel">
      <div class="confirm-dialog-title">{{ title }}</div>
      <div class="confirm-dialog-text">{{ message }}</div>
      <div class="confirm-dialog-actions">
        <button
          class="pixel-action-button"
          type="button"
          :disabled="busy"
          @click="emit('close')"
        >
          <Icon icon="pixelarticons:undo" width="24" />
        </button>
        <button
          class="pixel-action-button pixel-action-button--danger"
          type="button"
          :disabled="busy"
          @click="emit('confirm')"
        >
          <Icon icon="pixelarticons:check" width="24" />
        </button>
      </div>
    </div>
  </div>
</template>
