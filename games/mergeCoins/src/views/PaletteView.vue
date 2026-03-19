<script setup>
import { computed, ref, nextTick } from "vue";
import { Icon } from "@iconify/vue";
import { RouterLink } from "vue-router";
import { defaultColors } from "../composables/useGameState";

const totalSwatches = 60;
const palette = ref(
  Array.from(
    { length: totalSwatches },
    (_, index) => defaultColors[index] || "#000000",
  ),
);
const selectedIndex = ref(0);
const colorInput = ref(null);
const copyLabel = ref("复制颜色数组");
const dragIndex = ref(null);
const dragOverIndex = ref(null);

const paletteCode = computed(() => {
  const lines = palette.value.map((color, index) => {
    const suffix = index === palette.value.length - 1 ? "" : ",";
    return `  '${color}'${suffix}`;
  });

  return `const colors = [\n${lines.join("\n")}\n]`;
});

function handleSwatchClick(index) {
  if (dragIndex.value !== null) {
    return;
  }

  selectedIndex.value = index;
  nextTick(() => {
    colorInput.value?.click();
  });
}

function handleColorInput(event) {
  const { value } = event.target;
  palette.value[selectedIndex.value] = value.toUpperCase();
  copyLabel.value = "复制颜色数组";
}

function handleDragStart(index) {
  dragIndex.value = index;
  dragOverIndex.value = index;
}

function handleDragEnter(index) {
  if (dragIndex.value === null) {
    return;
  }

  dragOverIndex.value = index;
}

function handleDrop(index) {
  if (dragIndex.value === null || dragIndex.value === index) {
    handleDragEnd();
    return;
  }

  const nextPalette = [...palette.value];
  const [movedColor] = nextPalette.splice(dragIndex.value, 1);
  nextPalette.splice(index, 0, movedColor);
  palette.value = nextPalette;

  if (selectedIndex.value === dragIndex.value) {
    selectedIndex.value = index;
  } else if (
    dragIndex.value < selectedIndex.value &&
    index >= selectedIndex.value
  ) {
    selectedIndex.value -= 1;
  } else if (
    dragIndex.value > selectedIndex.value &&
    index <= selectedIndex.value
  ) {
    selectedIndex.value += 1;
  }

  copyLabel.value = "复制颜色数组";
  handleDragEnd();
}

function handleDragEnd() {
  window.setTimeout(() => {
    dragIndex.value = null;
    dragOverIndex.value = null;
  }, 0);
}

async function copyPaletteCode() {
  try {
    await navigator.clipboard.writeText(paletteCode.value);
    copyLabel.value = "已复制";
  } catch {
    copyLabel.value = "请手动复制";
  }
}
</script>

<template>
  <div class="page-shell palette-page">
    <main class="main-panel shell-card palette-panel">
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
          <span class="player-name">临时调色页面</span>
          <span class="sync-status">拖动排序，点击改色</span>
        </div>
      </div>

      <section class="pixel-panel palette-card">
        <div class="section-header palette-header">
          <h2 class="section-title">60色调色板</h2>
          <span class="palette-count">10 x 6</span>
        </div>

        <input
          ref="colorInput"
          class="palette-hidden-input"
          type="color"
          :value="palette[selectedIndex]"
          @input="handleColorInput"
        />

        <div class="palette-grid">
          <button
            v-for="(color, index) in palette"
            :key="`${index}-${color}`"
            class="palette-swatch"
            :class="{
              active: selectedIndex === index,
              dragging: dragIndex === index,
              'drag-over': dragOverIndex === index && dragIndex !== index,
            }"
            :style="{ backgroundColor: color }"
            type="button"
            draggable="true"
            :title="`${index + 1}: ${color}`"
            @click="handleSwatchClick(index)"
            @dragstart="handleDragStart(index)"
            @dragenter.prevent="handleDragEnter(index)"
            @dragover.prevent
            @drop.prevent="handleDrop(index)"
            @dragend="handleDragEnd"
          ></button>
        </div>
      </section>

      <section class="pixel-panel palette-output-card">
        <div class="section-header palette-header">
          <h2 class="section-title">颜色代码</h2>
          <button
            class="button primary palette-copy-button"
            type="button"
            @click="copyPaletteCode"
          >
            {{ copyLabel }}
          </button>
        </div>

        <textarea
          class="palette-output"
          readonly
          :value="paletteCode"
          @focus="$event.target.select()"
        />
      </section>
    </main>
  </div>
</template>
