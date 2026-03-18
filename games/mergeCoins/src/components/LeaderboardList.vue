<script setup>
defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <ol class="rank-list">
    <li v-if="!entries.length" class="empty">还没有玩家上传纪录，等你来拿第一。</li>
    <li v-for="(entry, index) in entries" :key="`${entry.display_name}-${index}`" class="rank-item">
      <span class="rank-no">#{{ index + 1 }}</span>
      <span class="rank-name">{{ entry.display_name }}</span>
      <span class="rank-score">{{ entry.max_record }}</span>
    </li>
  </ol>
</template>
