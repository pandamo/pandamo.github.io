<script setup>
const props = defineProps({
  bottles: {
    type: Array,
    default: () => [],
  },
  selectedBottleIndex: {
    type: Number,
    default: null,
  },
  isGameOver: Boolean,
  getColorForValue: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["select"]);
</script>

<template>
  <div class="bottle-grid pixel-panel pixel-panel--board">
    <button
      v-for="(bottle, index) in props.bottles"
      :key="index"
      class="bottle pixel-bottle"
      :class="{
        selected: props.selectedBottleIndex === index,
        disabled: props.isGameOver,
      }"
      type="button"
      @click="emit('select', index)"
    >
      <!-- <span class="bottle-neck" aria-hidden="true"></span> -->
      <div class="bottle-inner">
        <span
          v-for="(value, coinIndex) in bottle"
          :key="`${index}-${coinIndex}-${value}`"
          class="coin pixel-coin"
          :style="{ backgroundColor: props.getColorForValue(value) }"
        >
          {{ value }}
        </span>
      </div>
    </button>
  </div>
</template>
