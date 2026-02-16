<script setup lang="ts">
interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface Props {
  items: BreadcrumbItem[];
  size?: "small" | "large";
}

withDefaults(defineProps<Props>(), {
  size: "small",
});
</script>

<template>
  <nav class="breadcrumb" :class="{ 'breadcrumb-large': size === 'large' }">
    <ol class="breadcrumb-list">
      <li v-for="(item, index) in items" :key="index" class="breadcrumb-item">
        <router-link
          v-if="item.to"
          :to="item.to"
          class="breadcrumb-link"
          :class="{ active: !item.to }"
        >
          {{ item.label }}
        </router-link>
        <span v-else class="breadcrumb-current">{{ item.label }}</span>
        <span v-if="index < items.length - 1" class="breadcrumb-separator">
          ›
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  margin-bottom: 1.5rem;
}

.breadcrumb-large {
  margin-bottom: 2rem;
}

.breadcrumb-large .breadcrumb-list {
  font-size: 2rem;
  font-weight: bold;
}

.breadcrumb-large .breadcrumb-link {
  color: #f59e0b;
}

.breadcrumb-large .breadcrumb-link:hover {
  color: #d97706;
}

.breadcrumb-large .breadcrumb-current {
  color: #333;
}

.breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 0;
  align-items: center;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-link {
  color: #f59e0b;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #d97706;
  text-decoration: underline;
}

.breadcrumb-current {
  color: #666;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #ccc;
  margin: 0 0.5rem;
}
</style>
