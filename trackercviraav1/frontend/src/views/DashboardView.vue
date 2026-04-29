<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <div>
        <h1>Dashboard</h1>
        <p class="dashboard-subtitle">System overview · Last updated just now</p>
      </div>
    </header>
 
    <div v-if="loading" class="dashboard-loading">
      <div class="loading-spinner"></div>
      <span>Loading overview...</span>
    </div>
    <div v-else-if="error" class="dashboard-error">{{ error }}</div>
    <div v-else class="dashboard-content">
 
      <!-- Top stat cards -->
      <div class="stats-strip">
        <div class="stat-card total">
          <div class="stat-label">Total Personnel</div>
          <div class="stat-number total">{{ stats.totalPersonnel.toLocaleString() }}</div>
          <div class="stat-desc">registered in system</div>
          <div class="stat-bar">
            <div class="stat-bar-fill total" style="width: 100%"></div>
          </div>
        </div>
        <div class="stat-card s-in">
          <div class="stat-label">Currently IN</div>
          <div class="stat-number s-in">{{ stats.currentlyIn.toLocaleString() }}</div>
          <div class="stat-desc">on premises now</div>
          <div class="stat-bar">
            <div
              class="stat-bar-fill s-in"
              :style="{ width: stats.totalPersonnel ? (stats.currentlyIn / stats.totalPersonnel * 100) + '%' : '0%' }"
            ></div>
          </div>
        </div>
        <div class="stat-card s-out">
          <div class="stat-label">Currently OUT</div>
          <div class="stat-number s-out">{{ stats.currentlyOut.toLocaleString() }}</div>
          <div class="stat-desc">off premises</div>
          <div class="stat-bar">
            <div
              class="stat-bar-fill s-out"
              :style="{ width: stats.totalPersonnel ? (stats.currentlyOut / stats.totalPersonnel * 100) + '%' : '0%' }"
            ></div>
          </div>
        </div>
      </div>
 
      <!-- Personnel by Role Group -->
      <section class="section-card">
        <div class="section-top">
          <h2 class="section-title">Personnel by role group</h2>
          <div class="legend">
            <div class="leg-item"><span class="leg-dot in"></span>IN count</div>
            <div class="leg-item"><span class="leg-dot out"></span>OUT count</div>
          </div>
        </div>
 
        <!-- Regular groups (non-Officiating) in a 4-col grid -->
        <div class="groups-grid">
          <div
            v-for="group in regularGroups"
            :key="group.rolegroupname"
            class="group-card"
            :class="groupClass(group.rolegroupname)"
          >
            <div class="group-header">
              <span class="group-name">{{ group.rolegroupname }}</span>
              <span class="group-badge" :class="groupClass(group.rolegroupname)">{{ group.total }}</span>
            </div>
            <div class="group-total" :class="groupClass(group.rolegroupname)">{{ group.total }}</div>
            <p class="group-sub">personnel</p>
            <div class="group-bar">
              <div
                class="group-bar-fill"
                :class="groupClass(group.rolegroupname)"
                :style="{ width: stats.totalPersonnel ? (group.total / stats.totalPersonnel * 100) + '%' : '0%' }"
              ></div>
            </div>
            <ul class="role-list">
              <li v-for="role in group.roles" :key="role.roleid" class="role-row">
                <span class="role-name">{{ role.rolename }}</span>
                <span class="role-counts">
                  <span class="c-in">{{ role.countIn }}</span>
                  <span class="c-sep">/</span>
                  <span class="c-out">{{ role.countOut }}</span>
                  <span class="c-tot">({{ role.total }})</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
 
        <!-- Officiating group — full width -->
        <div
          v-for="group in officiatingGroup"
          :key="group.rolegroupname"
          class="group-card officiating-card"
        >
          <div class="group-header">
            <span class="group-name">{{ group.rolegroupname }}</span>
            <span class="group-badge officiating">{{ group.total }}</span>
          </div>
          <div class="group-total officiating">{{ group.total }}</div>
          <p class="group-sub">personnel</p>
          <div class="group-bar">
            <div
              class="group-bar-fill officiating"
              :style="{ width: stats.totalPersonnel ? (group.total / stats.totalPersonnel * 100) + '%' : '0%' }"
            ></div>
          </div>
          <ul class="role-list officiating-roles">
            <li v-for="role in group.roles" :key="role.roleid" class="role-row">
              <span class="role-name">{{ role.rolename }}</span>
              <span class="role-counts">
                <span class="c-in">{{ role.countIn }}</span>
                <span class="c-sep">/</span>
                <span class="c-out">{{ role.countOut }}</span>
                <span class="c-tot">({{ role.total }})</span>
              </span>
            </li>
          </ul>
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
  // BEFORE: Missing computed properties — template referenced regularGroups and officiatingGroup but they didn't exist
  // AFTER: Added computed properties to filter and separate role groups
  computed: {
    regularGroups() {
      return (this.stats.byRoleGroup || []).filter(
        group => group.rolegroupname !== 'Officiating'
      );
    },
    officiatingGroup() {
      return (this.stats.byRoleGroup || []).filter(
        group => group.rolegroupname === 'Officiating'
      );
    }
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
    },
    // BEFORE: Missing groupClass() method — template called it but it didn't exist
    // AFTER: Added method to map group names to appropriate CSS classes
    groupClass(groupName) {
      const name = (groupName || '').toLowerCase();
      if (name.includes('sport')) return 'sports';
      if (name.includes('committee')) return 'committee';
      if (name.includes('official')) return 'officials';
      if (name.includes('visitor')) return 'visitor';
      if (name === 'officiating') return 'officiating';
      return 'sports'; // default
    }
  }
};
</script>

<style scoped>
/* ── Base ── */
.dashboard-view {
  padding: 24px 20px;
  max-width: 1280px;
  margin: 0 auto;
  font-family: inherit;
}
 
/* ── Header ── */
.dashboard-header {
  margin-bottom: 24px;
}
 
.dashboard-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px;
}
 
.dashboard-subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}
 
/* ── Loading / Error ── */
.dashboard-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 48px;
  justify-content: center;
  color: #64748b;
  font-size: 14px;
}
 
.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e2e8f0;
  border-top-color: #42b983;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
 
@keyframes spin {
  to { transform: rotate(360deg); }
}
 
.dashboard-error {
  padding: 24px;
  text-align: center;
  color: #dc2626;
  font-size: 14px;
}
 
/* ── Content ── */
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
 
/* ── Stat Strip ── */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
 
.stat-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 22px 18px;
}
 
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 12px 12px 0 0;
}
 
.stat-card.total::before { background: #1D9E75; }
.stat-card.s-in::before  { background: #22c55e; }
.stat-card.s-out::before { background: #ef4444; }
 
.stat-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 8px;
}
 
.stat-number {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}
 
.stat-number.total { color: #1D9E75; }
.stat-number.s-in  { color: #16a34a; }
.stat-number.s-out { color: #dc2626; }
 
.stat-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 14px;
}
 
.stat-bar {
  height: 3px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
}
 
.stat-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}
 
.stat-bar-fill.total { background: #1D9E75; }
.stat-bar-fill.s-in  { background: #22c55e; }
.stat-bar-fill.s-out { background: #ef4444; }
 
/* ── Section Card ── */
.section-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}
 
.section-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
 
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
 
.legend {
  display: flex;
  gap: 16px;
}
 
.leg-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}
 
.leg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
 
.leg-dot.in  { background: #22c55e; }
.leg-dot.out { background: #ef4444; }
 
/* ── Groups Grid ── */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}
 
/* ── Group Card ── */
.group-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
}
 
.group-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}
 
.group-name {
  font-size: 12px;
  font-weight: 900;
  /* color: #64748b; */
  color: #000000;
}
 
.group-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
}
 
.group-badge.sports      { background: #dcfce7; color: #15803d; }
.group-badge.committee   { background: #dbeafe; color: #1d4ed8; }
.group-badge.officials   { background: #fef3c7; color: #b45309; }
.group-badge.visitor     { background: #ede9fe; color: #7c3aed; }
.group-badge.officiating { background: #fee2e2; color: #b91c1c; }
 
.group-total {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}
 
.group-total.sports      { color: #1D9E75; }
.group-total.committee   { color: #2563eb; }
.group-total.officials   { color: #d97706; }
.group-total.visitor     { color: #7c3aed; }
.group-total.officiating { color: #dc2626; }
 
.group-sub {
  font-size: 11px;
  color: #94a3b8;
  margin: 0 0 10px;
}
 
.group-bar {
  height: 2px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}
 
.group-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}
 
.group-bar-fill.sports      { background: #1D9E75; }
.group-bar-fill.committee   { background: #2563eb; }
.group-bar-fill.officials   { background: #d97706; }
.group-bar-fill.visitor     { background: #7c3aed; }
.group-bar-fill.officiating { background: #dc2626; }
 
/* ── Role List ── */
.role-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
 
.role-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
 
.role-name {
  font-size: 11px;
  color: #64748b;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
 
.role-counts {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}
 
.c-in  { color: #16a34a; font-weight: 600; }
.c-sep { color: #cbd5e1; }
.c-out { color: #dc2626; font-weight: 600; }
.c-tot { color: #94a3b8; font-size: 10px; }
 
/* ── Officiating Full-Width Card ── */
.officiating-card {
  width: 100%;
}
 
.officiating-roles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px 24px;
  flex-direction: unset;
}
 
/* ── Responsive ── */
@media (max-width: 1024px) {
  .groups-grid {
    grid-template-columns: repeat(2, 1fr);
  }
 
  .officiating-roles {
    grid-template-columns: repeat(3, 1fr);
  }
}
 
@media (max-width: 768px) {
  .stats-strip {
    grid-template-columns: 1fr;
  }
 
  .groups-grid {
    grid-template-columns: 1fr;
  }
 
  .officiating-roles {
    grid-template-columns: repeat(2, 1fr);
  }
}
 
@media (max-width: 480px) {
  .dashboard-view {
    padding: 16px 12px;
  }
 
  .stat-number {
    font-size: 28px;
  }
 
  .officiating-roles {
    grid-template-columns: 1fr;
  }
 
  .section-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>