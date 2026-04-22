<template>
  <div id="app">
    <nav class="sidebar">
      <div class="sidebar-brand">
        <h2>CVIRAA Athlete Tracker System</h2>
      </div>
      <div class="sidebar-links">
        <router-link to="/overview" class="sidebar-link">
          <span class="link-icon">🗺️</span>
          <span class="link-text">Overview</span>
        </router-link>
        <router-link to="/dashboard" class="sidebar-link">
          <span class="link-icon">📊</span>
          <span class="link-text">Dashboard</span>
        </router-link>
        <router-link to="/personnel" class="sidebar-link">
          <span class="link-icon">👥</span>
          <span class="link-text">Personnel</span>
        </router-link>
        <button type="button" class="sidebar-link" @click="scannerModal = 'in'">
          <span class="link-icon">📥</span>
          <span class="link-text">QR Scanner In</span>
        </button>
        <button type="button" class="sidebar-link" @click="scannerModal = 'out'">
          <span class="link-icon">📤</span>
          <span class="link-text">QR Scanner Out</span>
        </button>
        <router-link to="/generate-files" class="sidebar-link">
          <span class="link-icon">📁</span>
          <span class="link-text">Generate Files</span>
        </router-link>
        <router-link to="/settings" class="sidebar-link">
          <span class="link-icon">⚙️</span>
          <span class="link-text">Settings</span>
        </router-link>
        <router-link to="/about" class="sidebar-link">
          <span class="link-icon">ℹ️</span>
          <span class="link-text">About</span>
        </router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view/>
    </main>

    <!-- Full-page QR Scanner modal -->
    <div v-if="scannerModal" class="scanner-modal-overlay">
      <QRScannerView
        :modal-mode="true"
        :initial-tab="scannerModal"
        @close="scannerModal = null"
      />
    </div>
  </div>
</template>

<script>
import QRScannerView from '@/views/QRScannerView.vue';

export default {
  name: 'App',
  components: { QRScannerView },
  data() {
    return {
      scannerModal: null
    };
  },
  watch: {
    scannerModal(open) {
      if (open) {
        document.addEventListener('keydown', this.onEscape);
      } else {
        document.removeEventListener('keydown', this.onEscape);
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onEscape);
  },
  methods: {
    onEscape(e) {
      if (e.key === 'Escape' && this.scannerModal) {
        this.scannerModal = null;
      }
    }
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
}

.sidebar {
  width: 260px;
  min-width: 260px;
  background-color: white;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.sidebar-brand {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.sidebar-brand h2 {
  color: #42b983;
  font-size: 18px;
  margin: 0;
  line-height: 1.4;
  font-weight: 600;
}

.sidebar-links {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #2c3e50;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s;
  border-left: 3px solid transparent;
  width: 100%;
  text-align: left;
  font: inherit;
  cursor: pointer;
  border-top: none;
  border-right: none;
  border-bottom: none;
  background: none;
}

.sidebar-link:hover {
  background-color: #f0f0f0;
  color: #42b983;
  border-left-color: #42b983;
}

nav button.sidebar-link {
  cursor: pointer;
}

.sidebar-link.router-link-exact-active {
  background-color: #e8f5e9;
  color: #42b983;
  border-left-color: #42b983;
  font-weight: 600;
}

.link-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.link-text {
  flex: 1;
}

.main-content {
  flex: 1;
  margin-left: 260px;
  min-height: 100vh;
  width: calc(100% - 260px);
}

@media (max-width: 768px) {
  .sidebar {
    width: 70px;
    min-width: 70px;
  }

  .sidebar-brand h2 {
    font-size: 12px;
    text-align: center;
  }

  .link-text {
    display: none;
  }

  .sidebar-link {
    justify-content: center;
    padding: 12px;
  }

  .link-icon {
    font-size: 24px;
  }

  .main-content {
    margin-left: 70px;
    width: calc(100% - 70px);
  }
}

@media (max-width: 480px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
    width: 100%;
  }
}

/* Full-page QR Scanner modal */
.scanner-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #f5f5f5;
  overflow: auto;
}
</style>
