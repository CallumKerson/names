<script setup lang="ts">
import { useRoute } from "vue-router";
import NameSearch from "@/components/name-search.vue";

const route = useRoute();

const isActive = (path: string): boolean => route.path === path;
</script>

<template>
  <div class="app-layout">
    <header class="navbar">
      <div class="navbar-container">
        <RouterLink to="/" class="logo">
          <h1>Names</h1>
        </RouterLink>
        <div class="nav-right">
          <NameSearch />
          <nav class="nav-menu">
            <RouterLink
              to="/score"
              class="nav-link"
              :class="{ active: isActive('/score') }"
            >
              Score
            </RouterLink>
            <RouterLink
              to="/popular"
              class="nav-link"
              :class="{ active: isActive('/popular') }"
            >
              Popular
            </RouterLink>
            <RouterLink
              to="/nearest"
              class="nav-link"
              :class="{ active: isActive('/nearest') }"
            >
              Nearest
            </RouterLink>
          </nav>
        </div>
      </div>
    </header>

    <main class="main-content">
      <slot />
    </main>

    <footer class="footer">
      <p>
        Data from
        <a
          href="https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/articles/babynamesexplorer/2019-06-07"
          target="_blank"
          rel="noopener noreferrer"
        >
          UK Office for National Statistics (1996-2024)
        </a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.navbar {
  background: #f59e0b;
  color: #333;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  text-decoration: none;
  color: #333;
}

.logo h1 {
  margin: 0;
  font-size: 1.5rem;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-menu {
  display: flex;
  gap: 2rem;
  list-style: none;
}

.nav-link {
  color: rgba(51, 51, 51, 0.7);
  text-decoration: none;
  transition: color 0.3s;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.nav-link:hover {
  color: #333;
  background: rgba(51, 51, 51, 0.1);
}

.nav-link.active {
  color: #333;
  background: rgba(51, 51, 51, 0.2);
  border-bottom: 2px solid #333;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.footer {
  background: #f0f0f0;
  text-align: center;
  padding: 1rem;
  color: #666;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .navbar-container {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-menu {
    gap: 1rem;
  }

  .nav-link {
    padding: 0.25rem 0.5rem;
  }
}
</style>
