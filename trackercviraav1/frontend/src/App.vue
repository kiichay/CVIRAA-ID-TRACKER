<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
 
* {
  box-sizing: border-box;
}
 
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;
}
 
/* ── Sidebar ── */
.sidebar {
  width: 240px;
  min-width: 240px;
  background-color: #1a4d2e;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
 
/* Brand */
.sidebar-brand {
  padding: 16px 20px 12px;
}
 
.brand-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.01em;
  line-height: 1.2;
}
 
.brand-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.3;
}
 
.sidebar-divider {
  height: 0.5px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 16px;
}
 
/* Nav */
.sidebar-links {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
 
.nav-section-label {
  margin: 10px 0 6px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
 
.nav-section-label:first-child {
  margin-top: 4px;
}
 
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
 
.sidebar-link:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.85);
}
 
.sidebar-link.router-link-exact-active {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-weight: 700;
}
 
.nav-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
 
.link-text {
  flex: 1;
}
 
/* Badges */
.badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 20px;
  flex-shrink: 0;
}
 
.badge-in {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}
 
.badge-out {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}
 
/* Footer */
.sidebar-footer {
  padding: 12px 20px;
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.25);
  text-align: center;
}
 
/* ── Main content ── */
.router-fill {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
 
.main-content {
  position: fixed;
  top: 0;
  left: 240px;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}
 
/* ── QR Scanner modal ── */
.scanner-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #f5f5f5;
  overflow: auto;
}
 
/* ── Responsive ── */
@media (max-width: 768px) {
  .sidebar {
    width: 64px;
    min-width: 64px;
  }
 
  .brand-title,
  .brand-sub,
  .nav-section-label,
  .link-text,
  .badge {
    display: none;
  }
 
  .sidebar-brand {
    padding: 16px 0;
    display: flex;
    justify-content: center;
  }
 
  .sidebar-link {
    justify-content: center;
    padding: 10px;
  }
 
  .nav-icon {
    width: 18px;
    height: 18px;
  }
 
  .main-content {
    left: 64px;
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
    left: 0;
  }
}
</style>

<template>
  <div id="app">
    <nav class="sidebar">
 
      <!-- Brand -->
      <div class="sidebar-brand">
        <p class="brand-title">CVIRAA</p>
        <p class="brand-sub">Athlete Tracker System</p>
      </div>
 
      <div class="sidebar-divider"></div>
 
      <!-- Nav links -->
      <div class="sidebar-links">
 
        <p class="nav-section-label">General</p>
 
        <router-link to="/overview" class="sidebar-link">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
            <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
            <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
            <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
          </svg>
          <span class="link-text">Overview</span>
        </router-link>
 
        <router-link to="/dashboard" class="sidebar-link">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor"/>
            <rect x="6.5" y="5" width="3" height="9" rx="1" fill="currentColor"/>
            <rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor"/>
          </svg>
          <span class="link-text">Dashboard</span>
        </router-link>
 
        <router-link to="/personnel" class="sidebar-link">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.4"/>
            <circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.4"/>
            <path d="M1 13c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M12 9c1.5.4 3 1.6 3 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span class="link-text">Personnel</span>
        </router-link>
 
        <p class="nav-section-label">QR Scanner</p>
 
        <button type="button" class="sidebar-link" @click="scannerModal = 'in'">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <path d="M2 5V3a1 1 0 011-1h2M11 2h2a1 1 0 011 1v2M14 11v2a1 1 0 01-1 1h-2M5 14H3a1 1 0 01-1-1v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/>
          </svg>
          <span class="link-text">Scan in</span>
          <span class="badge badge-in">IN</span>
        </button>
 
        <button type="button" class="sidebar-link" @click="scannerModal = 'out'">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <path d="M2 5V3a1 1 0 011-1h2M11 2h2a1 1 0 011 1v2M14 11v2a1 1 0 01-1 1h-2M5 14H3a1 1 0 01-1-1v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/>
          </svg>
          <span class="link-text">Scan out</span>
          <span class="badge badge-out">OUT</span>
        </button>
 
        <p class="nav-section-label">Tools</p>
 
        <router-link to="/generate-files" class="sidebar-link">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M3 8h6M3 12h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span class="link-text">Generate files</span>
        </router-link>
 
        <p class="nav-section-label">System</p>
 
        <router-link to="/settings" class="sidebar-link">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/>
            <path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.5 3.5l.7.7M11.8 11.8l.7.7M11.8 4.2l-.7.7M4.2 11.8l-.7.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span class="link-text">Settings</span>
        </router-link>
 
        <router-link to="/about" class="sidebar-link">
          <svg class="nav-icon" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span class="link-text">About</span>
        </router-link>
 
      </div>
 
      <div class="sidebar-footer">
        <span>CVIRAA v2.0 · 2026</span>
      </div>
    </nav>
 
    <main class="main-content">
      <router-view class="router-fill"/>
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

<!-- <style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden; /* Prevent any scroll at the page level */
}
 
* {
  box-sizing: border-box;
}
 
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;
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
  flex-shrink: 0;
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
 
.router-fill {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
 
.main-content {
  position: fixed;
  top: 0;
  left: 260px;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
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
    left: 70px;
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
    left: 0;
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
</style> -->