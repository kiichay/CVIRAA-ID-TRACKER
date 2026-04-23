<template>
  <div class="overview-view">
 
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        LIVE TRACKING
      </div>
      <h1 class="page-title">Overview IN/OUT Track</h1>
      <p class="page-subtitle">Select an event or view all, then click <span class="highlight-text">Show</span> to load data</p>
    </div>
 
    <!-- Filter Card -->
    <div class="filter-card">
      <div class="filter-group">
        <label class="filter-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
          </svg>
          Event
        </label>
        <div class="select-wrapper">
          <select v-model="selectedEvent" class="filter-select">
            <option value="">All Events</option>
            <option
              v-for="e in eventTypes"
              :key="`overview-event-${e.value}`"
              :value="String(e.value)"
            >
              {{ e.label }}
            </option>
          </select>
          <svg class="select-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
 
      <div class="filter-actions">
        <button @click="loadOverview" class="btn-show">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Show
        </button>
        <button
          @click="createExcel"
          class="btn-export"
          :disabled="!showTable || summaryRows.length === 0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Export Excel
        </button>
      </div>
    </div>
 
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading data...</span>
    </div>
 
    <!-- Table Section -->
    <div v-if="showTable && !loading" class="table-container">
 
      <!-- Stats Strip -->
      <div v-if="summaryRows.length > 0" class="stats-strip">
        <div class="stat-item">
          <span class="stat-value">{{ totals.total }}</span>
          <span class="stat-label">Total Persons</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value green">{{ totals.totalIn }}</span>
          <span class="stat-label">Total IN</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value red">{{ totals.totalOut }}</span>
          <span class="stat-label">Total OUT</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ summaryRows.length }}</span>
          <span class="stat-label">Sports Events</span>
        </div>
      </div>
 
      <!-- Table -->
      <div class="table-scroll-wrapper">
        <table class="overview-table">
          <thead>
            <tr>
              <th class="th-sports col-sticky">Sports</th>
              <th class="th-total">Total</th>
              <th class="th-in">Athlete IN</th>
              <th class="th-out">Athlete OUT</th>
              <th class="th-in">Coach IN</th>
              <th class="th-out">Coach OUT</th>
              <th class="th-in">Chaperon IN</th>
              <th class="th-out">Chaperon OUT</th>
              <th class="th-in">Asst. Coach IN</th>
              <th class="th-out">Asst. Coach OUT</th>
              <th class="th-in">Trainer IN</th>
              <th class="th-out">Trainer OUT</th>
              <th class="th-total-in">Total IN</th>
              <th class="th-total-out">Total OUT</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in summaryRows"
              :key="row.eventType"
              :style="{ animationDelay: `${index * 40}ms` }"
              class="data-row"
            >
              <td class="td-sports col-sticky">{{ row.eventType }}</td>
              <td class="td-total">{{ row.total }}</td>
              <td class="td-in">{{ row.athleteIn }}</td>
              <td class="td-out">{{ row.athleteOut }}</td>
              <td class="td-in">{{ row.coachIn }}</td>
              <td class="td-out">{{ row.coachOut }}</td>
              <td class="td-in">{{ row.chaperonIn }}</td>
              <td class="td-out">{{ row.chaperonOut }}</td>
              <td class="td-in">{{ row.asstCoachIn }}</td>
              <td class="td-out">{{ row.asstCoachOut }}</td>
              <td class="td-in">{{ row.trainerIn }}</td>
              <td class="td-out">{{ row.trainerOut }}</td>
              <td class="td-total-in">{{ row.totalIn }}</td>
              <td class="td-total-out">{{ row.totalOut }}</td>
            </tr>
          </tbody>
          <tfoot v-if="summaryRows.length > 0">
            <tr class="totals-row">
              <td class="td-sports col-sticky">Total Persons</td>
              <td class="td-total">{{ totals.total }}</td>
              <td class="td-in">{{ totals.athleteIn }}</td>
              <td class="td-out">{{ totals.athleteOut }}</td>
              <td class="td-in">{{ totals.coachIn }}</td>
              <td class="td-out">{{ totals.coachOut }}</td>
              <td class="td-in">{{ totals.chaperonIn }}</td>
              <td class="td-out">{{ totals.chaperonOut }}</td>
              <td class="td-in">{{ totals.asstCoachIn }}</td>
              <td class="td-out">{{ totals.asstCoachOut }}</td>
              <td class="td-in">{{ totals.trainerIn }}</td>
              <td class="td-out">{{ totals.trainerOut }}</td>
              <td class="td-total-in">{{ totals.totalIn }}</td>
              <td class="td-total-out">{{ totals.totalOut }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
 
      <!-- Empty State -->
      <div v-if="summaryRows.length === 0" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>No data found for the selected event.</p>
      </div>
 
    </div>
 
  </div>
</template>

<script>
import { eventTypes, personnelAPI } from '@/services/api';

// roleid mapping as requested
const ROLE_MAP = {
  1: 'athlete',
  2: 'asstcoach',
  3: 'chaperon',
  4: 'coach',
  5: 'trainer'
};

export default {
  name: 'OverviewView',
  data() {
    return {
      eventTypes,
      selectedEvent: '',
      loading: false,
      showTable: false,
      summaryRows: []
    };
  },

//  Automatically load all events when this page opens
  mounted() {
  this.loadOverview();
},
  computed: {
    totals() {
      return this.summaryRows.reduce(
        (acc, row) => {
          acc.total += Number(row.total || 0);
          acc.athleteIn += Number(row.athleteIn || 0);
          acc.athleteOut += Number(row.athleteOut || 0);
          acc.coachIn += Number(row.coachIn || 0);
          acc.coachOut += Number(row.coachOut || 0);
          acc.chaperonIn += Number(row.chaperonIn || 0);
          acc.chaperonOut += Number(row.chaperonOut || 0);
          acc.asstCoachIn += Number(row.asstCoachIn || 0);
          acc.asstCoachOut += Number(row.asstCoachOut || 0);
          acc.trainerIn += Number(row.trainerIn || 0);
          acc.trainerOut += Number(row.trainerOut || 0);
          acc.totalIn += Number(row.totalIn || 0);
          acc.totalOut += Number(row.totalOut || 0);
          return acc;
        },
        {
          total: 0,
          athleteIn: 0,
          athleteOut: 0,
          coachIn: 0,
          coachOut: 0,
          chaperonIn: 0,
          chaperonOut: 0,
          asstCoachIn: 0,
          asstCoachOut: 0,
          trainerIn: 0,
          trainerOut: 0,
          totalIn: 0,
          totalOut: 0
        }
      );
    }
  },
  methods: {
    async loadOverview() {
      this.showTable = false;
      this.loading = true;
      this.summaryRows = [];

      try {
        const params = {
          roleGroup: 1 // sports only
        };
        if (this.selectedEvent) {
          params.eventType = this.selectedEvent;
        }

        const response = await personnelAPI.getAll(params);
        const persons = Array.isArray(response.data) ? response.data : [];

        // Count by event then by role/status
        const eventCounts = new Map();

        persons.forEach((p) => {
          const eventName = p.eventTypeName || (p.eventType !== null && p.eventType !== undefined ? String(p.eventType) : 'Unknown');
          const roleIdNum = Number(p.roleid || p.role);
          const roleNameRaw = (p.roleName || p.rolename || p.role || '').toString().toLowerCase();
          let roleKey = ROLE_MAP[roleIdNum];

          // fallback by string role name in case roleid is not set
          if (!roleKey) {
            if (roleNameRaw.includes('athlete')) roleKey = 'athlete';
            else if (roleNameRaw.includes('asst')) roleKey = 'asstcoach';
            else if (roleNameRaw.includes('chaperon')) roleKey = 'chaperon';
            else if (roleNameRaw.includes('coach')) roleKey = 'coach';
            else if (roleNameRaw.includes('trainer')) roleKey = 'trainer';
          }

          const status = p.personnelStatus !== null && p.personnelStatus !== undefined
            ? Number(p.personnelStatus)
            : ((p.statusName || '').toLowerCase() === 'in' ? 1 : 0);

          if (!roleKey) {
            return; // skip non-target roles
          }

          if (!eventCounts.has(eventName)) {
            eventCounts.set(eventName, {
              athleteIn: 0,
              athleteOut: 0,
              coachIn: 0,
              coachOut: 0,
              chaperonIn: 0,
              chaperonOut: 0,
              asstCoachIn: 0,
              asstCoachOut: 0,
              trainerIn: 0,
              trainerOut: 0,
              total: 0
            });
          }

          const row = eventCounts.get(eventName);
          row.total += 1;

          if (roleIdNum === 1) {
            status === 1 ? row.athleteIn++ : row.athleteOut++;
          } else if (roleIdNum === 2) {
            status === 1 ? row.asstCoachIn++ : row.asstCoachOut++;
          } else if (roleIdNum === 3) {
            status === 1 ? row.chaperonIn++ : row.chaperonOut++;
          } else if (roleIdNum === 4) {
            status === 1 ? row.coachIn++ : row.coachOut++;
          } else if (roleIdNum === 5) {
            status === 1 ? row.trainerIn++ : row.trainerOut++;
          }
        });

        this.summaryRows = Array.from(eventCounts.entries())
          .map(([eventType, data]) => {
            const totalIn = data.athleteIn + data.coachIn + data.chaperonIn + data.asstCoachIn + data.trainerIn;
            const totalOut = data.athleteOut + data.coachOut + data.chaperonOut + data.asstCoachOut + data.trainerOut;
            return {
              eventType,
              ...data,
              totalIn,
              totalOut
            };
          })
          .sort((a, b) => a.eventType.localeCompare(b.eventType));

        this.showTable = true;
      } catch (err) {
        console.error('Error loading overview:', err);
        this.summaryRows = [];
        this.showTable = true;
      } finally {
        this.loading = false;
      }
    },

    createExcel() {
      if (!this.summaryRows || this.summaryRows.length === 0) {
        return;
      }

      const columns = [
        'Sports',
        'Total',
        'Athlete-IN',
        'Athlete-OUT',
        'Coach-IN',
        'Coach-OUT',
        'Chaperon-IN',
        'Chaperon-OUT',
        'AsstCoach-IN',
        'AsstCoach-OUT',
        'Trainer-IN',
        'Trainer-OUT'
      ];

      const rows = this.summaryRows.map((r) => [
        r.eventType,
        r.total,
        r.athleteIn,
        r.athleteOut,
        r.coachIn,
        r.coachOut,
        r.chaperonIn,
        r.chaperonOut,
        r.asstCoachIn,
        r.asstCoachOut,
        r.trainerIn,
        r.trainerOut
      ]);

      const csvContent = [columns.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `overview-in-out-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
};
</script>

<style scoped>
/* ── CSS Variables ── */
.overview-view {
  --green-700: #15803d;
  --green-600: #16a34a;
  --green-500: #22c55e;
  --green-200: #bbf7d0;
  --green-100: #dcfce7;
  --green-50:  #f0fdf4;
  --red-500:   #ef4444;
  --red-50:    #fff5f5;
  --gray-900:  #111827;
  --gray-700:  #374151;
  --gray-500:  #6b7280;
  --gray-400:  #9ca3af;
  --gray-300:  #d1d5db;
  --gray-100:  #f3f4f6;
  --gray-50:   #f9fafb;
  --white:     #ffffff;
 
  /* KEY FIX: fill the full height given by .main-content, use flex column */
  display: flex;
  flex-direction: column;
  height: 100%;           /* Fill .main-content's full height */
  width: 100%;            /* ← ADD THIS */
  min-width: 0;           /* ← ADD THIS */
  padding: 32px;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
  background: var(--gray-50);
  box-sizing: border-box;
  gap: 0;
  overflow: hidden;      /* Prevent this element from growing beyond viewport */
}
 
/* ── Page Header ── */
.page-header {
  margin-bottom: 24px;
  flex-shrink: 0;         /* Never compress the header */
}
 
.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--green-100);
  color: var(--green-700);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 10px;
}
 
.page-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--gray-900);
  letter-spacing: -0.5px;
  margin: 0 0 6px;
  line-height: 1.2;
}
 
.page-subtitle {
  font-size: 13.5px;
  color: var(--gray-500);
  margin: 0;
}
 
.highlight-text {
  color: var(--green-600);
  font-weight: 600;
}
 
/* ── Filter Card ── */
.filter-card {
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
  flex-shrink: 0;         /* Never compress the filter bar */
}
 
.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
 
.filter-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-700);
  white-space: nowrap;
  flex-shrink: 0;
}
 
.select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
 
.filter-select {
  appearance: none;
  background: var(--gray-50);
  border: 1.5px solid var(--gray-300);
  border-radius: 7px;
  padding: 7px 34px 7px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--gray-900);
  min-width: 180px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
 
.filter-select:focus {
  outline: none;
  border-color: var(--green-500);
  box-shadow: 0 0 0 3px rgba(34,197,94,0.12);
}
 
.select-chevron {
  position: absolute;
  right: 10px;
  color: var(--gray-500);
  pointer-events: none;
}
 
.filter-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}
 
.btn-show {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--green-600);
  color: var(--white);
  border: none;
  border-radius: 7px;
  padding: 8px 18px;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(22,163,74,0.3);
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  white-space: nowrap;
}
 
.btn-show:hover {
  background: var(--green-700);
  box-shadow: 0 4px 12px rgba(22,163,74,0.35);
  transform: translateY(-1px);
}
 
.btn-show:active { transform: translateY(0); }
 
.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--white);
  color: var(--green-700);
  border: 1.5px solid var(--green-500);
  border-radius: 7px;
  padding: 8px 18px;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  white-space: nowrap;
}
 
.btn-export:hover:not(:disabled) {
  background: var(--green-50);
  transform: translateY(-1px);
}
 
.btn-export:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--gray-300);
  color: var(--gray-500);
}
 
/* ── Loading ── */
.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: var(--gray-500);
  font-size: 14px;
  flex-shrink: 0;
}
 
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid var(--gray-300);
  border-top-color: var(--green-500);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
 
@keyframes spin { to { transform: rotate(360deg); } }
 
/* ── Table Container ── */
.table-container {
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  /* KEY FIX: flex: 1 + min-height: 0 makes it fill remaining space
     without a fixed max-height that causes outer page scroll */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
 
/* ── Stats Strip ── */
.stats-strip {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  background: var(--green-50);
  border-bottom: 1px solid var(--green-100);
  gap: 24px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
 
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
 
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--gray-900);
  letter-spacing: -0.5px;
  line-height: 1;
}
 
.stat-value.green { color: var(--green-600); }
.stat-value.red   { color: var(--red-500); }
 
.stat-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--gray-500);
}
 
.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--green-200);
  flex-shrink: 0;
}
 
/* ── Table Scroll: only this div scrolls, not the page ── */
.table-scroll-wrapper {
  flex: 1;
  min-height: 0;          /* Critical: allows the flex child to shrink below content size */
  overflow-x: auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
 
.table-scroll-wrapper::-webkit-scrollbar        { width: 6px; height: 6px; }
.table-scroll-wrapper::-webkit-scrollbar-track  { background: var(--gray-100); }
.table-scroll-wrapper::-webkit-scrollbar-thumb  { background: var(--gray-300); border-radius: 3px; }
.table-scroll-wrapper::-webkit-scrollbar-thumb:hover { background: var(--gray-400); }
 
/* ── Table ── */
.overview-table {
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}
 
.overview-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}
 
.overview-table thead tr {
  background: var(--gray-50);
  border-bottom: 2px solid var(--gray-300);
}
 
.overview-table tfoot {
  position: sticky;
  bottom: 0;
  z-index: 2;
}
 
.overview-table th {
  padding: 11px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gray-500);
  white-space: nowrap;
  text-align: center;
  background: var(--gray-50);
}
 
/* Sticky first column */
.col-sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--white);
  box-shadow: 2px 0 6px rgba(0,0,0,0.06);
}
 
thead .col-sticky { background: var(--gray-50); z-index: 3; }
tfoot .col-sticky { background: var(--gray-100); z-index: 3; }
 
.th-sports    { text-align: left !important; min-width: 160px; width: 160px; }
.th-total     { min-width: 80px; width: 80px; }
.th-in        { min-width: 110px; width: 110px; }
.th-out       { min-width: 110px; width: 110px; }
.th-total-in  { min-width: 100px; width: 100px; }
.th-total-out { min-width: 100px; width: 100px; }
 
/* Data Rows */
.data-row {
  border-bottom: 1px solid var(--gray-100);
  animation: fadeInRow 0.25s ease both;
  transition: background 0.1s;
}
 
.data-row:hover { background: var(--green-50); }
.data-row:hover .col-sticky { background: var(--green-50); }
 
@keyframes fadeInRow {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
 
.overview-table td {
  padding: 10px 14px;
  text-align: center;
  color: var(--gray-700);
  white-space: nowrap;
}
 
.td-sports    { text-align: left; font-weight: 600; color: var(--gray-900); }
.td-total     { font-weight: 700; color: var(--gray-900); }
.td-in        { color: var(--green-600); }
.td-out       { color: var(--red-500); }
.td-total-in  { background: rgba(34,197,94,0.05);  font-weight: 700; color: var(--green-600); }
.td-total-out { background: rgba(239,68,68,0.04);  font-weight: 700; color: var(--red-500); }
 
/* Totals Footer */
.totals-row {
  background: var(--gray-100);
  border-top: 2px solid var(--gray-300);
}
 
.totals-row td {
  font-weight: 700;
  color: var(--gray-900);
  padding: 11px 14px;
  white-space: nowrap;
}
 
.totals-row .td-in        { color: var(--green-600); }
.totals-row .td-out       { color: var(--red-500); }
.totals-row .td-total-in  { background: rgba(34,197,94,0.08); color: var(--green-600); }
.totals-row .td-total-out { background: rgba(239,68,68,0.07); color: var(--red-500); }
 
/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 24px;
  color: var(--gray-500);
  font-size: 13.5px;
}
 
.empty-state svg { color: var(--gray-300); }
 
/* ── Responsive ── */
@media (max-width: 1024px) {
  .overview-view { padding: 24px; }
  .th-sports { min-width: 120px; max-width: 120px; width: 120px; }
}
 
@media (max-width: 768px) {
  .overview-view { padding: 16px; }
  .th-in, .th-out { min-width: 75px; max-width: 75px; width: 75px; }
}
 
@media (max-width: 480px) {
  .overview-view { padding: 12px; }
  .filter-card { padding: 12px 16px; }
  .th-in, .th-out { min-width: 65px; max-width: 65px; width: 65px; }
}
</style>

<!-- <style scoped>
.overview-view {
  padding: 20px;
}
.overview-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}
.filter-select {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.overview-table-wrap {
  overflow-x: auto;
}
.overview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.overview-table th,
.overview-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}
.overview-table th {
  background: #f8f9fa;
  font-weight: 700;
}
.overview-loading,
.overview-empty {
  margin-top: 12px;
  font-size: 14px;
}
</style> -->
