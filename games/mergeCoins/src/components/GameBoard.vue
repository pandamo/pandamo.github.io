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
  maxCapacity: {
    type: Number,
    required: true,
  },
  getColorForValue: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["select"]);

function getSelectedTopValue() {
  if (props.selectedBottleIndex === null) {
    return null;
  }

  const selectedBottle = props.bottles[props.selectedBottleIndex];
  if (!selectedBottle?.length) {
    return null;
  }

  return selectedBottle[selectedBottle.length - 1];
}

function getTopRunStartIndex(bottle) {
  if (!bottle.length) {
    return -1;
  }

  const topValue = bottle[bottle.length - 1];
  let startIndex = bottle.length - 1;

  while (startIndex > 0 && bottle[startIndex - 1] === topValue) {
    startIndex -= 1;
  }

  return startIndex;
}

function shouldHighlightCoin(bottle, bottleIndex, coinIndex) {
  const selectedTopValue = getSelectedTopValue();
  if (selectedTopValue === null || !bottle.length) {
    return false;
  }

  const topValue = bottle[bottle.length - 1];
  if (topValue !== selectedTopValue) {
    return false;
  }

  const topRunStartIndex = getTopRunStartIndex(bottle);
  if (coinIndex < topRunStartIndex) {
    return false;
  }

  if (bottleIndex === props.selectedBottleIndex) {
    return true;
  }

  return bottle.length < props.maxCapacity;
}
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
          :class="{ highlighted: shouldHighlightCoin(bottle, index, coinIndex) }"
          :style="{ backgroundColor: props.getColorForValue(value) }"
        >
          {{ value }}
        </span>
      </div>
    </button>
  </div>
</template>
