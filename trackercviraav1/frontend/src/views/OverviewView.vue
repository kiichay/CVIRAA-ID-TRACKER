<template>
  <div class="overview-view">
    <h1>Overview IN/OUT Track</h1>
    <p>select Sports (either all events or select one), then click <strong>Show</strong></p>

    <div class="overview-filters">
      <label>
        Event:
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
      </label>

      <button @click="loadOverview" class="btn btn-primary">Show</button>
      <button @click="createExcel" class="btn btn-secondary" :disabled="!showTable || summaryRows.length===0">Create Excel</button>
    </div>

    <div v-if="loading" class="overview-loading">Loading...</div>

    <div v-if="showTable && !loading" class="overview-table-wrap">
      <table class="overview-table">
        <thead>
          <tr>
            <th>Sports</th>
            <th>Total</th>
            <th>Athlete-IN</th>
            <th>Athlete-OUT</th>
            <th>Coach-IN</th>
            <th>Coach-OUT</th>
            <th>Chaperon-IN</th>
            <th>Chaperon-OUT</th>
            <th>AsstCoach-IN</th>
            <th>AsstCoach-OUT</th>
            <th>Trainer-IN</th>
            <th>Trainer-OUT</th>
          <th>Total IN</th>
          <th>Total OUT</th>
        </tr>
      </thead>
      <tbody>
          <tr v-for="row in summaryRows" :key="row.eventType">
            <td>{{ row.eventType }}</td>
            <td>{{ row.total }}</td>
            <td>{{ row.athleteIn }}</td>
            <td>{{ row.athleteOut }}</td>
            <td>{{ row.coachIn }}</td>
            <td>{{ row.coachOut }}</td>
            <td>{{ row.chaperonIn }}</td>
            <td>{{ row.chaperonOut }}</td>
            <td>{{ row.asstCoachIn }}</td>
            <td>{{ row.asstCoachOut }}</td>
            <td>{{ row.trainerIn }}</td>
            <td>{{ row.trainerOut }}</td>
            <td>{{ row.totalIn }}</td>
            <td>{{ row.totalOut }}</td>
          </tr>
        </tbody>
        <tfoot v-if="summaryRows.length > 0">
          <tr>
            <td><strong>Total Persons</strong></td>
            <td><strong>{{ totals.total }}</strong></td>
            <td>{{ totals.athleteIn }}</td>
            <td>{{ totals.athleteOut }}</td>
            <td>{{ totals.coachIn }}</td>
            <td>{{ totals.coachOut }}</td>
            <td>{{ totals.chaperonIn }}</td>
            <td>{{ totals.chaperonOut }}</td>
            <td>{{ totals.asstCoachIn }}</td>
            <td>{{ totals.asstCoachOut }}</td>
            <td>{{ totals.trainerIn }}</td>
            <td>{{ totals.trainerOut }}</td>
            <td>{{ totals.totalIn }}</td>
            <td>{{ totals.totalOut }}</td>
          </tr>
        </tfoot>
      </table>
      <div v-if="summaryRows.length === 0" class="overview-empty">No data for selected event.</div>
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
</style>
