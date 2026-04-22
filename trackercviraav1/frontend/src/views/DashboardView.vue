<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <h1>Dashboard</h1>
      <p class="dashboard-subtitle">System overview</p>
    </header>

    <div v-if="loading" class="dashboard-loading">Loading overview...</div>
    <div v-else-if="error" class="dashboard-error">{{ error }}</div>
    <div v-else class="dashboard-content">
      <!-- Total personnel + Currently IN / OUT -->
      <section class="dashboard-section total-section">
        <h2>Total Personnel Registered</h2>
        <div class="stats-row">
          <div class="stat-block">
            <span class="stat-number">{{ stats.totalPersonnel }}</span>
            <span class="stat-label">personnel in system</span>
          </div>
          <div class="stat-block stat-in">
            <span class="stat-number">{{ stats.currentlyIn }}</span>
            <span class="stat-label">Currently IN</span>
          </div>
          <div class="stat-block stat-out">
            <span class="stat-number">{{ stats.currentlyOut }}</span>
            <span class="stat-label">Currently OUT</span>
          </div>
        </div>
      </section>

      <!-- By role group (Sports, Committee, Officials) -->
      <section class="dashboard-section role-groups-section">
        <h2>Personnel by Role Group</h2>
        <div class="role-groups-grid">
          <div
            v-for="group in stats.byRoleGroup"
            :key="group.rolegroupname"
            class="role-group-card"
          >
            <h3 class="role-group-name">{{ group.rolegroupname }}</h3>
            <div class="role-group-total">{{ group.total }}</div>
            <p class="role-group-label">personnel</p>
            <ul class="sub-roles-list">
              <li
                v-for="role in group.roles"
                :key="role.roleid"
                class="sub-role-item"
              >
                <span class="sub-role-name">{{ role.rolename }}</span>
                <span class="sub-role-count">{{ role.count }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { dashboardAPI } from '@/services/api';

export default {
  name: 'DashboardView',
  data() {
    return {
      loading: true,
      error: null,
      stats: {
        totalPersonnel: 0,
        currentlyIn: 0,
        currentlyOut: 0,
        byRoleGroup: []
      }
    };
  },
  mounted() {
    this.loadStats();
  },
  methods: {
    async loadStats() {
      this.loading = true;
      this.error = null;
      try {
        const response = await dashboardAPI.getStats();
        if (response.data && response.data.success) {
          this.stats = {
            totalPersonnel: response.data.totalPersonnel ?? 0,
            currentlyIn: response.data.currentlyIn ?? 0,
            currentlyOut: response.data.currentlyOut ?? 0,
            byRoleGroup: response.data.byRoleGroup ?? []
          };
        }
      } catch (e) {
        this.error = e.response?.data?.error || e.message || 'Failed to load dashboard stats.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.dashboard-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 28px;
}

.dashboard-header h1 {
  color: #2c3e50;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.dashboard-subtitle {
  color: #64748b;
  font-size: 15px;
  margin: 0;
}

.dashboard-loading,
.dashboard-error {
  padding: 24px;
  text-align: center;
  color: #64748b;
}

.dashboard-error {
  color: #dc2626;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.dashboard-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.dashboard-section h2 {
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.total-section .stat-total {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-number {
  font-size: 42px;
  font-weight: 700;
  color: #42b983;
  line-height: 1;
}

.stat-label {
  font-size: 16px;
  color: #64748b;
}

.role-groups-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .role-groups-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .role-groups-grid {
    grid-template-columns: 1fr;
  }
}

.role-group-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 18px;
  border: 1px solid #e2e8f0;
}

.role-group-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.role-group-total {
  font-size: 28px;
  font-weight: 700;
  color: #42b983;
  line-height: 1.2;
}

.role-group-label {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 14px 0;
}

.sub-roles-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}

.sub-role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}

.sub-role-name {
  color: #475569;
}

.sub-role-count {
  font-weight: 600;
  color: #2c3e50;
  min-width: 2em;
  text-align: right;
}
</style>
