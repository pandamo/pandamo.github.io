<script setup>
defineProps({
  canUndo: Boolean,
  busy: Boolean,
})

const emit = defineEmits(['undo', 'deal', 'reset'])
</script>

<template>
  <div class="controls pixel-panel pixel-panel--controls">
    <button class="pixel-action-button" :disabled="!canUndo || busy" @click="emit('undo')">撤回</button>
    <button class="pixel-action-button" :disabled="busy" @click="emit('deal')">发放</button>
    <button class="pixel-action-button pixel-action-button--danger" :disabled="busy" @click="emit('reset')">重新开始</button>
  </div>
</template>
