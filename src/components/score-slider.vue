<script setup lang="ts">
import { computed } from "vue";

interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

type Emits = (e: "update:modelValue", value: number) => void;

const props = withDefaults(defineProps<Props>(), {
  label: "Target Gender Score",
  max: 1,
  min: -1,
  step: 0.01,
});

defineEmits<Emits>();

const displayValue = computed(() => {
  const value = props.modelValue;
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
});

const category = computed(() => {
  const score = props.modelValue;
  if (score > 0.3) {
    return "Feminine";
  }
  if (score < -0.3) {
    return "Masculine";
  }
  return "Neutral";
});

const categoryColor = computed(() => {
  const score = props.modelValue;
  if (score > 0.3) {
    return "#7C3AED";
  }
  if (score < -0.3) {
    return "#059669";
  }
  return "#F59E0B";
});
</script>

<template>
  <div class="score-slider">
    <label class="slider-label">{{ label }}</label>
    <div class="slider-container">
      <div class="slider-wrapper">
        <input
          type="range"
          :value="modelValue"
          :min="min"
          :max="max"
          :step="step"
          class="slider-input"
          @input="
            $emit(
              'update:modelValue',
              parseFloat(($event.target as HTMLInputElement).value),
            )
          "
        />
        <div class="slider-labels">
          <span class="feminine-label">Feminine</span>
          <span class="neutral-label">Neutral</span>
          <span class="masculine-label">Masculine</span>
        </div>
      </div>
      <div class="slider-display">
        <span class="score-value">{{ displayValue }}</span>
        <span class="category" :style="{ color: categoryColor }">{{
          category
        }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.score-slider {
  margin: 1.5rem 0;
}

.slider-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #333;
}

.slider-container {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.slider-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.slider-input {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  direction: rtl;
  background: linear-gradient(to right, #7c3aed 0%, #f59e0b 50%, #059669 100%);
  outline: none;
  appearance: none;
}

.slider-input::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid #f59e0b;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid #f59e0b;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-display {
  display: flex;
  gap: 1rem;
  align-items: center;
  min-width: 200px;
}

.score-value {
  font-family: monospace;
  font-size: 1.2rem;
  font-weight: bold;
  width: 100px;
  text-align: center;
}

.category {
  font-weight: 600;
  min-width: 100px;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #666;
}

.masculine-label {
  color: #059669;
}

.neutral-label {
  color: #f59e0b;
}

.feminine-label {
  color: #7c3aed;
}
</style>
