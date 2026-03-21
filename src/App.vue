<script setup lang="ts">
import { onMounted } from "vue";

import AppLayout from "./components/app-layout.vue";
import { preloadData } from "./composables/useNamesData";

onMounted(() => {
  // Preload data in the background for faster navigation
  preloadData();
});
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>

<style scoped></style>
