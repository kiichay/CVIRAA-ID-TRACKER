<template>
  <div class="generate-files-view">
    <div class="header">
      <h1>Generate Files</h1>
      <p class="subtitle">Export and generate various reports and documents</p>
    </div>

    <div class="generate-options">
      <!-- Export Personnel List Section -->
      <div class="option-card">
        <div class="option-header">
          <span class="option-icon">📊</span>
          <h2>Export Personnel List</h2>
        </div>
        <p class="option-description">Export personnel data to CSV or Excel format</p>
        <div class="option-actions">
          <select v-model="exportFormat" class="export-select">
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
          <button @click="exportPersonnel" class="btn btn-primary" :disabled="exporting">
            {{ exporting ? 'Exporting...' : 'Export' }}
          </button>
        </div>
      </div>

      <!-- Personnel IN/OUT Status -->
      <div class="option-card">
        <div class="option-header">
          <span class="option-icon">✅</span>
          <h2>Personnel IN/OUT Status</h2>
        </div>
        <p class="option-description">Generate a list of personnel with their current status (IN or OUT). Choose to include all or only IN or only OUT.</p>
        <div class="status-export-filter">
          <label>Show:</label>
          <select v-model="statusFilterStatus" class="filter-select" @change="fetchStatusSummary">
            <option value="">All (IN and OUT)</option>
            <option value="1">IN only</option>
            <option value="0">OUT only</option>
          </select>

          <label>Event:</label>
          <select v-model="statusFilterEventType" class="filter-select" @change="fetchStatusSummary">
            <option value="">All Events</option>
            <option v-for="e in eventTypes" :key="`status-event-${e.value}`" :value="e.value">
              {{ e.label }}
            </option>
          </select>

          <label>Role Group:</label>
          <select v-model="statusFilterRoleGroup" class="filter-select" @change="onStatusFilterChange">
            <option value="">All Role Groups</option>
            <option v-for="g in roleGroups" :key="`status-rg-${g.rolegroupid}`" :value="String(g.rolegroupid)">
              {{ g.rolegroupname }}
            </option>
          </select>

          <label>Role:</label>
          <select v-model="statusFilterRole" class="filter-select" :disabled="!statusFilterRoleGroup" @change="fetchStatusSummary">
            <option value="">All Roles</option>
            <option
              v-for="r in rolesByGroup(statusFilterRoleGroup)"
              :key="`status-role-${r.value}`"
              :value="r.value"
            >
              {{ r.label }}
            </option>
          </select>
        </div>
        <div class="status-summary">
          <span>IN: <strong>{{ statusSummary.in }}</strong></span>
          <span>OUT: <strong>{{ statusSummary.out }}</strong></span>
          <span>Total: <strong>{{ statusSummary.total }}</strong></span>
        </div>
        <div class="option-actions">
          <button @click="exportPersonnelStatus" class="btn btn-primary" :disabled="exportingStatus">
            {{ exportingStatus ? 'Generating...' : 'Generate Status List' }}
          </button>
        </div>
      </div>

      <!-- Generate QR Codes -->
      <div class="option-card">
        <div class="option-header">
          <span class="option-icon">🖨️</span>
          <h2>Generate QR Codes</h2>
        </div>
        <p class="option-description">Generate a printable page with QR codes (4 columns × 6 rows per page). Each QR code has the person's name below it.</p>
        <div class="option-actions">
          <button @click="printQRCodes" class="btn btn-primary" :disabled="generatingQR">
            {{ generatingQR ? 'Generating...' : 'Generate QR Codes' }}
          </button>
        </div>
      </div>

      <!-- Print ID Cards -->
      <div class="option-card">
        <div class="option-header">
          <span class="option-icon">🪪</span>
          <h2>Print ID Cards</h2>
        </div>
        <p class="option-description">
          Generate printable ID cards (2 columns). Each row prints a <strong>duplicate pair</strong>
          (e.g. ID1 ID1, ID2 ID2) — so you get <strong>2 personnel per bond paper</strong>. Choose whether to print
          <strong>all</strong> personnel or use filters.
        </p>

        <!-- What to print: All vs Filtered -->
        <div class="idcard-mode">
          <label>
            <input
              type="radio"
              value="all"
              v-model="idCardPrintMode"
            />
            All personnel
          </label>
          <label>
            <input
              type="radio"
              value="filtered"
              v-model="idCardPrintMode"
            />
            Use filters
          </label>
        </div>

        <!-- Filter controls (same options as Personnel page) -->
        <div v-if="idCardPrintMode === 'filtered'" class="idcard-filters">
          <select v-model="idCardFilterRoleGroup" class="filter-select" @change="idCardFilterRole = ''">
            <option value="">All Role Groups</option>
            <option v-for="g in roleGroups" :key="`idcard-rg-${g.rolegroupid}`" :value="String(g.rolegroupid)">
              {{ g.rolegroupname }}
            </option>
          </select>
          <select v-model="idCardFilterRole" class="filter-select" :disabled="!idCardFilterRoleGroup">
            <option value="">All Roles</option>
            <option
              v-for="r in rolesByGroup(idCardFilterRoleGroup)"
              :key="`idcard-role-${r.value}`"
              :value="r.value"
            >
              {{ r.label }}
            </option>
          </select>

          <select v-model="idCardFilterEventType" class="filter-select" :disabled="isCommitteeSelected">
            <option value="">All Events</option>
            <option v-for="e in eventTypes" :key="`idcard-event-${e.value}`" :value="e.value">
              {{ e.label }}
            </option>
          </select>

          <select v-model="idCardFilterStatus" class="filter-select">
            <option value="">All Status</option>
            <option value="1">In</option>
            <option value="0">Out</option>
          </select>
        </div>

        <div class="option-actions">
          <button @click="printIdCards" class="btn btn-primary" :disabled="generatingIdCards">
            {{ generatingIdCards ? 'Generating...' : 'Print ID Cards' }}
          </button>
        </div>
      </div>

      <!-- Time IN/OUT History (Excel) -->
      <div class="option-card">
        <div class="option-header">
          <span class="option-icon">📊</span>
          <h2>Time IN/OUT History (Excel)</h2>
        </div>
        <p class="option-description">
          Download an Excel file with Personnel, Role, and columns In 1, Out 1, In 2, Out 2, … for the selected date. Same filters as above.
        </p>

        <div class="timestamp-filters">
          <div class="filter-row">
            <label>Date:</label>
            <input type="date" v-model="excelHistoryFilters.date" class="filter-input" />
          </div>
          <div class="filter-row">
            <label>Event:</label>
            <select v-model="excelHistoryFilters.eventType" class="filter-select">
              <option value="">All Events</option>
              <option v-for="e in eventTypes" :key="`excel-event-${e.value}`" :value="e.value">
                {{ e.label }}
              </option>
            </select>
          </div>
          <div class="filter-row">
            <label>Role Group:</label>
            <select v-model="excelHistoryFilters.roleGroup" class="filter-select" @change="excelHistoryFilters.role = ''">
              <option value="">All Role Groups</option>
              <option v-for="g in roleGroups" :key="`excel-rg-${g.rolegroupid}`" :value="String(g.rolegroupid)">
                {{ g.rolegroupname }}
              </option>
            </select>
          </div>
          <div class="filter-row">
            <label>Role:</label>
            <select v-model="excelHistoryFilters.role" class="filter-select" :disabled="!excelHistoryFilters.roleGroup">
              <option value="">All Roles</option>
              <option
                v-for="r in rolesByGroup(excelHistoryFilters.roleGroup)"
                :key="`excel-role-${r.value}`"
                :value="r.value"
              >
                {{ r.label }}
              </option>
            </select>
          </div>
          <div class="filter-row search-row search-person-row">
            <label>Search Person:</label>
            <div class="search-person-wrap">
              <input
                type="text"
                v-model="excelHistoryFilters.search"
                class="filter-input search-input"
                placeholder="Type name or ID to search..."
                @focus="onExcelSearchFocus"
                @input="onExcelSearchInput"
              />
              <div v-if="excelSearchLoading" class="search-person-loading">Searching...</div>
              <ul
                v-else-if="excelSearchOpen && excelSearchResults.length > 0"
                class="search-person-dropdown"
              >
                <li
                  v-for="p in excelSearchResults"
                  :key="p.personnelID"
                  class="search-person-item"
                  @mousedown.prevent="selectExcelSearchPerson(p)"
                >
                  <div v-if="p.roleid === 45" class="search-person-photo-container initials-container">
                    <span class="initials">{{ getInitials(p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ')) }}</span>
                  </div>
                  <div v-else-if="p.pictureUrl" class="search-person-photo-container">
                    <img
                      :src="getProfileImageUrl(p.pictureUrl, p.updated_at)"
                      :alt="p.fullName || 'Profile photo'"
                      class="search-person-photo"
                    />
                  </div>
                  <div v-else class="search-person-photo-container initials-container">
                    <span class="initials">{{ getInitials(p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ')) }}</span>
                  </div>
                  <div class="search-person-text">
                    <span class="search-person-name">{{ p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ') }}</span>
                    <span class="search-person-meta">ID: {{ p.personnelID }} · {{ p.roleName || '' }}</span>
                  </div>
                </li>
              </ul>
              <ul v-else-if="excelSearchOpen && excelHistoryFilters.search.trim() && !excelSearchLoading" class="search-person-dropdown">
                <li class="search-person-empty">No matching personnel</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="option-actions">
          <button @click="generateTimeInOutExcel" class="btn btn-primary" :disabled="generatingExcelHistory || !excelHistoryFilters.date">
            {{ generatingExcelHistory ? 'Generating...' : 'Generate Excel' }}
          </button>
        </div>
      </div>

      <!-- Individual Personnel Time IN/OUT Report (Excel) -->
      <div class="option-card">
        <div class="option-header">
          <span class="option-icon">👤</span>
          <h2>Individual Personnel Report</h2>
        </div>
        <p class="option-description">
          Download an Excel file with a specific personnel's complete time IN/OUT history. Can filter by date range or show all records.
        </p>

        <!-- Notification for Individual Report -->
        <div v-if="individualReportMessage" :class="['card-notification', 'notification-' + individualReportMessageType]">
          {{ individualReportMessage }}
        </div>

        <div class="timestamp-filters">
          <div class="filter-row search-row search-person-row">
            <label>Select Personnel:</label>
            <div class="search-person-wrap">
              <input
                type="text"
                v-model="individualReportFilters.personSearch"
                class="filter-input search-input"
                placeholder="Type name or ID to search..."
                @focus="onIndividualSearchFocus"
                @input="onIndividualSearchInput"
              />
              <div v-if="individualSearchLoading" class="search-person-loading">Searching...</div>
              <ul
                v-else-if="individualSearchOpen && individualSearchResults.length > 0"
                class="search-person-dropdown"
              >
                <li
                  v-for="p in individualSearchResults"
                  :key="p.personnelID"
                  class="search-person-item"
                  @mousedown.prevent="selectIndividualSearchPerson(p)"
                >
                  <div v-if="p.roleid === 45" class="search-person-photo-container initials-container">
                    <span class="initials">{{ getInitials(p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ')) }}</span>
                  </div>
                  <div v-else-if="p.pictureUrl" class="search-person-photo-container">
                    <img
                      :src="getProfileImageUrl(p.pictureUrl, p.updated_at)"
                      :alt="p.fullName || 'Profile photo'"
                      class="search-person-photo"
                    />
                  </div>
                  <div v-else class="search-person-photo-container initials-container">
                    <span class="initials">{{ getInitials(p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ')) }}</span>
                  </div>
                  <div class="search-person-text">
                    <span class="search-person-name">{{ p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ') }}</span>
                    <span class="search-person-meta">ID: {{ p.personnelID }} · {{ p.roleName || '' }}</span>
                  </div>
                </li>
              </ul>
              <ul v-else-if="individualSearchOpen && individualReportFilters.personSearch.trim() && !individualSearchLoading" class="search-person-dropdown">
                <li class="search-person-empty">No matching personnel</li>
              </ul>
            </div>
          </div>
          
          <div v-if="individualReportFilters.selectedPerson" class="selected-person-display">
            <div class="selected-person-info">
              <strong>Selected:</strong> {{ individualReportFilters.selectedPerson.fullName || [individualReportFilters.selectedPerson.fname, individualReportFilters.selectedPerson.mname, individualReportFilters.selectedPerson.lname].filter(Boolean).join(' ') }}
              <span class="selected-person-id">(ID: {{ individualReportFilters.selectedPerson.personnelID }})</span>
              <button @click="clearIndividualSelection" class="btn-remove">✕</button>
            </div>
          </div>

          <div class="filter-row">
            <label>Date (Optional):</label>
            <input type="date" v-model="individualReportFilters.date" class="filter-input" />
          </div>
        </div>

        <div class="option-actions">
          <button 
            @click="generateIndividualReport" 
            class="btn btn-primary" 
            :disabled="generatingIndividualReport || !individualReportFilters.selectedPerson"
          >
            {{ generatingIndividualReport ? 'Generating...' : 'Generate Report' }}
          </button>
        </div>
      </div>

      <!-- Personnel with/without Photos Excel Export -->
      <div class="option-card">
        <div class="option-header">
          <span class="option-icon">📸</span>
          <h2>Personnel Photos Report</h2>
        </div>
        <p class="option-description">
          Export an Excel file showing all personnel and their photo status. Filter by personnel with photos, without photos, or all personnel.
        </p>

        <div class="photo-export-options">
          <label>
            <input type="radio" value="all" v-model="photoExportMode" />
            All personnel
          </label>
          <label>
            <input type="radio" value="with-photo" v-model="photoExportMode" />
            Only with photos
          </label>
          <label>
            <input type="radio" value="without-photo" v-model="photoExportMode" />
            Only without photos
          </label>
        </div>

        <div class="option-actions">
          <button 
            @click="exportPersonnelPhotoReport" 
            class="btn btn-primary" 
            :disabled="generatingPhotoReport"
          >
            {{ generatingPhotoReport ? 'Generating...' : 'Generate Photo Report' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script>
import { eventTypes, roleAPI, loadEventTypesFromAPI, getImageUrl, getProfileImageUrl, getInitials } from '@/services/api';
import { personnelAPI } from '@/services/api';
import { generatePrintableIdCardHTML } from '@/utils/idCardPrint';

export default {
  name: 'GenerateFilesView',
  data() {
    return {
      generating: false,
      exporting: false,
      exportingStatus: false,
      statusFilterStatus: '',
      statusFilterEventType: '',
      statusFilterRoleGroup: '',
      statusFilterRole: '',
      statusSummary: {
        in: 0,
        out: 0,
        total: 0
      },
      generatingReport: false,
      generatingQR: false,
      generatingIdCards: false,
      exportFormat: 'csv',
      reportFilters: {
        roleGroup: '',
        role: '',
        eventType: ''
      },
      message: '',
      messageType: 'success',
      eventTypes,
      roleGroups: [],
      allRoles: [],
      // Print ID cards – what to print
      idCardPrintMode: 'all', // 'all' | 'filtered'
      idCardFilterRoleGroup: '',
      idCardFilterRole: '',
      idCardFilterEventType: '',
      idCardFilterStatus: '',
      // Timestamp report filters
      generatingTimestamp: false,
      timestampFilters: {
        date: '',
        eventType: '',
        roleGroup: '',
        role: '',
        search: ''
      },
      // Time IN/OUT History Excel
      generatingExcelHistory: false,
      excelHistoryFilters: {
        date: '',
        eventType: '',
        roleGroup: '',
        role: '',
        search: ''
      },
      // Search Person autocomplete
      excelSearchResults: [],
      excelSearchOpen: false,
      excelSearchLoading: false,
      excelSearchDebounce: null,
      // Individual Personnel Report
      generatingIndividualReport: false,
      individualReportFilters: {
        personSearch: '',
        selectedPerson: null,
        date: ''
      },
      individualSearchResults: [],
      individualSearchOpen: false,
      individualSearchLoading: false,
      individualSearchDebounce: null,
      individualReportMessage: '',
      individualReportMessageType: 'success',
      // Personnel Photo Export
      generatingPhotoReport: false,
      photoExportMode: 'all'
    };
  },
  computed: {
    isCommitteeSelected() {
      const selectedGroup = this.roleGroups.find(
        g => String(g.rolegroupid) === this.idCardFilterRoleGroup
      );
      return selectedGroup?.rolegroupname === 'Committee';
    }
  },
  async mounted() {
    document.addEventListener('click', this.closeExcelSearchOnClickOutside);
    // Load event types and roleGroups + roles (new structure)
    try {
      await loadEventTypesFromAPI();
      const rolesResp = await roleAPI.getAll();
      if (rolesResp.data && rolesResp.data.success) {
        this.roleGroups = rolesResp.data.grouped || [];
        this.allRoles = (rolesResp.data.roles || []).map((r) => ({
          value: r.roleid,
          label: r.rolename,
          rolegroupid: r.rolegroupid
        }));
      }
    } catch (e) {
      // keep empty (filters will still work for event/status)
      console.warn('Failed to load roles for GenerateFiles filters:', e);
    }

    // If navigated here with a personnel query param, print that single card
    const personId = this.$route.query.personnel;
    if (personId) {
      try {
        await this.generateSingleIdCard(personId);
      } catch (e) {
        console.error('Automatic single ID card print failed:', e);
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeExcelSearchOnClickOutside);
    if (this.excelSearchDebounce) clearTimeout(this.excelSearchDebounce);
    if (this.individualSearchDebounce) clearTimeout(this.individualSearchDebounce);
  },

  
  methods: {
    // Expose shared helpers so they can be used in templates
    getImageUrl,
    getProfileImageUrl,
    getInitials,
    rolesByGroup(rolegroupid) {
      const gid = String(rolegroupid || '');
      if (!gid) return [];
      return (this.allRoles || []).filter((r) => String(r.rolegroupid) === gid);
    },
    async generateIdCards() {
      this.generating = true;
      this.message = '';
      try {
        // existing implementation for filters
        // ... not modified here ...
        // code already handles filtered printing
        // unchanged

        // (the original body remains; nothing to do)
      } catch (error) {
        console.error('Error generating ID cards:', error);
        this.showMessage('Error generating ID cards: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.generating = false;
      }
    },
    async exportPersonnel() {
      this.exporting = true;
      this.message = '';
      try {
        const response = await personnelAPI.getAll({});
        const personnel = response.data;
        
        if (this.exportFormat === 'csv') {
          this.exportToCSV(personnel);
        } else {
          this.exportToExcel(personnel);
        }
        
        this.showMessage(`Personnel list exported as ${this.exportFormat.toUpperCase()}`, 'success');
      } catch (error) {
        console.error('Error exporting personnel:', error);
        this.showMessage('Error exporting personnel: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.exporting = false;
      }
    },
    async fetchStatusSummary() {
      try {
        const filters = {};
        if (this.statusFilterStatus !== '') {
          filters.status = this.statusFilterStatus;
        }
        if (this.statusFilterEventType !== '') {
          filters.eventType = this.statusFilterEventType;
        }
        if (this.statusFilterRoleGroup !== '') {
          filters.roleGroup = this.statusFilterRoleGroup;
        }
        if (this.statusFilterRole !== '') {
          filters.role = this.statusFilterRole;
        }

        const response = await personnelAPI.getAll(filters);
        const personnel = Array.isArray(response.data) ? response.data : [];
        const inCount = personnel.filter(p => (p.personnelStatus === 1 || String(p.statusName || '').toLowerCase() === 'in')).length;
        const outCount = personnel.filter(p => (p.personnelStatus === 0 || String(p.statusName || '').toLowerCase() === 'out')).length;

        this.statusSummary = {
          in: inCount,
          out: outCount,
          total: personnel.length
        };
      } catch (error) {
        console.error('Error fetching status summary:', error);
        this.statusSummary = { in: 0, out: 0, total: 0 };
      }
    },

    onStatusFilterChange() {
      this.statusFilterRole = '';
      this.fetchStatusSummary();
    },

    async exportPersonnelStatus() {
      this.exportingStatus = true;
      this.message = '';
      await this.fetchStatusSummary();
      try {
        const filters = {};
        if (this.statusFilterStatus !== '') {
          filters.status = this.statusFilterStatus;
        }
        if (this.statusFilterEventType !== '') {
          filters.eventType = this.statusFilterEventType;
        }
        if (this.statusFilterRoleGroup !== '') {
          filters.roleGroup = this.statusFilterRoleGroup;
        }
        if (this.statusFilterRole !== '') {
          filters.role = this.statusFilterRole;
        }

        const response = await personnelAPI.exportPersonnelStatusExcel(filters);
        const blob = response.data;
        const disposition = response.headers['content-disposition'];
        let filename = `Personnel-Status-${new Date().toISOString().split('T')[0]}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match) filename = match[1];
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('Personnel status Excel downloaded', 'success');
      } catch (error) {
        console.error('Error generating personnel status:', error);
        let msg = error.message;
        if (error.response?.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            msg = json.error || json.message || msg;
          } catch (_) {
            msg = 'Export failed';
          }
        } else if (error.response?.data?.error) {
          msg = error.response.data.error;
        } else if (error.response?.data?.message) {
          msg = error.response.data.message;
        }
        this.showMessage(msg || 'Error downloading Excel', 'error');
      } finally {
        this.exportingStatus = false;
      }
    },
    exportToCSV(personnel) {
      const headers = ['ID', 'First Name', 'Middle Name', 'Last Name', 'Role', 'Event Type', 'Status'];
      const rows = personnel.map(p => [
        p.personnelID,
        p.fname || '',
        p.mname || '',
        p.lname || '',
        p.roleName || '',
        p.eventTypeName || '',
        p.statusName || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `personnel_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    exportToExcel(personnel) {
      // For Excel, we'll export as CSV for now (can be enhanced with a library like xlsx)
      this.exportToCSV(personnel);
      this.showMessage('Excel export uses CSV format. For full Excel support, please install xlsx library.', 'info');
    },
    async generateReport() {
      this.generatingReport = true;
      this.message = '';
      try {
        const filters = {};
        if (this.reportFilters.roleGroup !== '') filters.roleGroup = this.reportFilters.roleGroup;
        if (this.reportFilters.role !== '') filters.role = this.reportFilters.role;
        if (this.reportFilters.eventType !== '') filters.eventType = this.reportFilters.eventType;
        
        const response = await personnelAPI.getAll(filters);
        const personnel = response.data;
        
        // Generate a simple text report
        const report = this.generateTextReport(personnel);
        
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `personnel_report_${new Date().toISOString().split('T')[0]}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('Report generated successfully', 'success');
      } catch (error) {
        console.error('Error generating report:', error);
        this.showMessage('Error generating report: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.generatingReport = false;
      }
    },
    generateTextReport(personnel) {
      let report = 'PERSONNEL REPORT\n';
      report += '='.repeat(50) + '\n';
      report += `Generated: ${new Date().toLocaleString()}\n`;
      report += `Total Records: ${personnel.length}\n`;
      report += '='.repeat(50) + '\n\n';
      
      personnel.forEach((p, index) => {
        report += `${index + 1}. ${p.fullName}\n`;
        report += `   ID: ${p.personnelID}\n`;
        report += `   Role: ${p.roleName}\n`;
        report += `   Event Type: ${p.eventTypeName}\n`;
        report += `   Status: ${p.statusName}\n`;
        report += '\n';
      });
      
      return report;
    },
    async printQRCodes() {
      this.generatingQR = true;
      this.message = '';
      try {
        // Fetch all personnel
        const response = await personnelAPI.getAll({});
        const personnel = response.data;
        
        if (personnel.length === 0) {
          this.showMessage('No personnel found to generate QR codes', 'error');
          return;
        }
        
        // Generate printable HTML
        const html = this.generatePrintableQRHTML(personnel);
        
        // Open in new window for printing (or use iframe if popup blocked)
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          this.printViaIframe(html);
        } else {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }
        
        this.showMessage(`Generated printable QR codes for ${personnel.length} personnel`, 'success');
      } catch (error) {
        console.error('Error generating QR codes:', error);
        this.showMessage('Error generating QR codes: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.generatingQR = false;
      }
    },
    generatePrintableQRHTML(personnel) {
      const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api';
      const baseUrl = API_BASE_URL.replace(/\/api$/, '');
      
      // Group personnel into rows of 4 (4 columns × 6 rows = 24 QR codes per page)
      const COLS_PER_ROW = 4;
      const rows = [];
      for (let i = 0; i < personnel.length; i += COLS_PER_ROW) {
        rows.push(personnel.slice(i, i + COLS_PER_ROW));
      }
      
      let qrCardsHTML = '';
      const ROWS_PER_PAGE = 6;
      rows.forEach((row, rowIndex) => {
        if (rowIndex > 0 && rowIndex % ROWS_PER_PAGE === 0) {
          qrCardsHTML += '<div class="qr-page-break"></div>';
        }
        qrCardsHTML += '<div class="qr-row">';
        row.forEach(person => {
          const qrUrl = person.qrcodeUrl 
            ? (person.qrcodeUrl.startsWith('http') || person.qrcodeUrl.startsWith('data:') 
                ? person.qrcodeUrl 
                : `${baseUrl}${person.qrcodeUrl}`)
            : '';
          const name = (person.fullName || `${(person.fname || '')} ${(person.mname || '')} ${(person.lname || '')}`.trim()) || '—';
          let role = (person.roleName || '').trim();
          const roleGroupName = String(person.rolegroupname || '').toLowerCase();
          const isOfficialOrOfficiating =
            Number(person.rolegroupid) === 3 ||
            Number(person.rolegroupid) === 5 ||
            /official|officiat/.test(roleGroupName);
          if (isOfficialOrOfficiating) {
            const roleType = String(person.roleType || '').trim();
            if (roleType) {
              role = roleType;
            }
          }
          const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          qrCardsHTML += `
            <div class="qr-card">
              <div class="qr-code-container">
                ${qrUrl ? `<img src="${qrUrl}" alt="QR Code" class="qr-image" />` : '<div class="qr-placeholder">No QR Code</div>'}
              </div>
              <div class="qr-name">${esc(name)}</div>
              ${role ? `<div class="qr-role">${esc(role)}</div>` : ''}
            </div>
          `;
        });
        // Fill empty slots if row has fewer items
        for (let j = row.length; j < COLS_PER_ROW; j++) {
          qrCardsHTML += '<div class="qr-card qr-card-empty"></div>';
        }
        qrCardsHTML += '</div>';
      });
      
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Print QR Codes - ${new Date().toLocaleDateString()}</title>
  <style>
        /* Officials roleid=30, rolegroupid=3 custom roletype margin/font */
        .id-event-type.official-30-roletype {
          margin-top: 55px !important;
          font-size: 20px !important;
          color: #1976d2 !important;
          font-weight: 700 !important;
          letter-spacing: 1px !important;
        }

        /* Officials roleid=30, rolegroupid=3 custom city margin/font */
        .id-card-city.official-30-city {
          margin-top: 50px !important;
          font-size: 28px !important;
          color: #d32f2f !important;
          font-weight: 700 !important;
          letter-spacing: 1.5px !important;
        }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 0.5cm;
    }
    
    body {
      font-family: Arial, sans-serif;
      padding: 10px;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    
    .header h1 {
      font-size: 20px;
      color: #2c3e50;
      margin-bottom: 2px;
    }
    
    .header p {
      color: #666;
      font-size: 14px;
    }
    
    .qr-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
      page-break-inside: avoid;
    }
    
    .qr-card {
      flex: 1;
      max-width: 24%;
      text-align: center;
      padding: 4px;
      border: 1px solid #ddd;
      border-radius: 3px;
      margin: 0 1px;
    }
    
    .qr-card-empty {
      border: none;
      visibility: hidden;
    }
    
    .qr-page-break {
      page-break-before: always;
    }
    
    .qr-code-container {
      width: 50px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 4px;
      min-height: 110px;
    }
    
    .qr-image {
      max-width: 100%;
      width: 120px;
      height: 120px;
      object-fit: contain;
    }
    
    .qr-placeholder {
      width: 110px;
      height: 110px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 11px;
      border: 1px dashed #ccc;
    }
    
    .qr-name {
      font-size: 9px;
      font-weight: 600;
      color: #2c3e50;
      word-wrap: break-word;
      line-height: 1.15;
      padding: 1px 0 0;
    }
    
    .qr-role {
      font-size: 8px;
      font-weight: 500;
      color: #666;
      word-wrap: break-word;
      line-height: 1.1;
      padding: 0 0 1px;
    }
    
    @media print {
      body {
        padding: 5px;
      }
      
      .header {
        margin-bottom: 6px;
      }
      
      .header h1 {
        font-size: 18px;
      }
      
      .header p {
        font-size: 11px;
      }
      
      .qr-row {
        margin-bottom: 4px;
      }
      
      .qr-card {
        border: 1px solid #ccc;
        max-width: 24%;
      }
      
      .qr-name {
        font-size: 8px;
      }
      
      .qr-role {
        font-size: 7px;
      }
      
      @page {
        margin: 0.5cm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Personnel QR Codes</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
  ${qrCardsHTML}
</body>
</html>
      `;
    },
    // Fallback when window.open is blocked: print via hidden iframe
    printViaIframe(html) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('style', 'position:absolute;width:0;height:0;border:none;left:-9999px;');
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        this.showMessage('Print failed: could not create print preview. Please allow popups for this site and try again.', 'error');
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.print();
          } finally {
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }
        }, 500);
      };
    },
    async printIdCards() {
      this.generatingIdCards = true;
      this.message = '';
      try {
        // Build filters for printing ID cards
        const filters = {};

        if (this.idCardPrintMode === 'filtered') {
          if (
            this.idCardFilterRoleGroup === '' &&
            this.idCardFilterRole === '' &&
            this.idCardFilterEventType === '' &&
            this.idCardFilterStatus === ''
          ) {
            alert('Please select at least one filter or choose "All personnel".');
            this.generatingIdCards = false;
            return;
          }

          if (this.idCardFilterRoleGroup !== '') {
            filters.roleGroup = this.idCardFilterRoleGroup;
          }
          if (this.idCardFilterRole !== '') {
            filters.role = this.idCardFilterRole;
          }

          if (this.idCardFilterEventType !== '') {
            filters.eventType = this.idCardFilterEventType;
          }

          if (this.idCardFilterStatus !== '') {
            filters.status = this.idCardFilterStatus;
          }
        }

        // Fetch personnel to print (all or filtered)
        const response = await personnelAPI.getAll(filters);
        const personnel = response.data;
        
        if (personnel.length === 0) {
          this.showMessage('No personnel found to generate ID cards for the selected criteria', 'error');
          return;
        }
        
        // Process personnel data for display text formatting
        const processedPersonnel = this.processPersonnelForIdCards(personnel);
        
        // Generate printable HTML
        const html = this.generatePrintableIdCardHTML(processedPersonnel);
        
        // Open in new window for printing (or use iframe if popup blocked)
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          this.printViaIframe(html);
        } else {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }
        
        this.showMessage(`Generated printable ID cards for ${personnel.length} personnel`, 'success');
      } catch (error) {
        console.error('Error generating ID cards:', error);
        this.showMessage('Error generating ID cards: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.generatingIdCards = false;
      }
    },
    // Process personnel data for ID card display text formatting
    processPersonnelForIdCards(personnel) {
      return personnel.map(person => {
        const processedPerson = { ...person };
        // Get the info text (committee label, role type, or event type)
        // Treat officiating group (rolegroupid=5) like officials: use roleType when available.
        const isOfficial =
          Number(person.rolegroupid) === 3 ||
          Number(person.rolegroupid) === 5 ||
          /official|officiat/i.test(String(person.rolegroupname || ''));

        let infoText = '';
        if (isOfficial) {
          // Officials should display their roleType (e.g., "Chairman") rather than event type
          infoText = String(person.roleType || person.roleName || person.eventTypeName || '').trim();
        } else if (person.rolegroupname && String(person.rolegroupname).toLowerCase().includes('committee')) {
          const roleName = String(person.roleName || '').trim();
          const roleType = String(person.roleType || '').trim();
          // Avoid duplication when roleName already includes the roleType
          if (
            roleType &&
            roleName.toLowerCase().endsWith(` - ${roleType.toLowerCase()}`)
          ) {
            infoText = roleName;
          } else {
            infoText = roleName + (roleType ? ' - ' + roleType : '');
          }
        } else if (person.roleName && person.roleName.toLowerCase() === 'trainer') {
          infoText = person.roleName;
        } else {
          infoText = person.eventTypeName || '';
        }
        // Apply special formatting for long text
        let displayText = infoText;
        if (displayText) {
          const textUpper = displayText.toUpperCase();
          if (textUpper.includes('EMERGENCY') && textUpper.includes('RESPONSE')) {
            displayText = displayText.replace(/EMERGENCY\s+RESPONSE/gi, 'EMERGENCY<br/>RESPONSE');
          }
          if (/^athlete management team\s*-\s*/i.test(displayText)) {
            displayText = displayText.replace(/^(Athlete Management Team\s*-\s*)(.*)$/i,
              '$1<br/><span class="large">$2</span>');
          }
          if (/^accommodation and billeting\s*-\s*/i.test(displayText)) {
            displayText = displayText.replace(/^(Accommodation and Billeting)\s*-\s*(.*)$/i,
              '$1<br/>- $2');
          }
          // Sound System and Technical Support / Lights and LED Wall (roleid 19) – insert a line break
          if (/sound system and technical support\s*\/\s*lights and led wall/i.test(displayText)) {
            displayText = displayText.replace(/sound system and technical support\s*\/\s*lights and led wall/i,
              'Sound System and Technical Support<br/>Lights and LED Wall');
          }

          // Food and Nutrition – break between label and member for better spacing
          if (/food\s*and\s*nutrition\s*-\s*member/i.test(displayText)) {
            displayText = displayText.replace(/food\s*and\s*nutrition\s*-\s*member/i,
              'Food and Nutrition<br/>- Member');
          }

          // Transportation, Safety and Security (roleid 20) – smaller font + line break
          if (/transportation\s*,?\s*safety\s*and\s*security/i.test(displayText)) {
            displayText = displayText.replace(/transportation\s*,?\s*safety\s*and\s*security/i,
              'Transportation<br/>Safety and Security');
          }
        }
        // Custom font size for Dance Sports - Latin (id=29) and Modern (id=31)
        if ((person.eventType === 29 || person.eventType === 31) && !processedPerson.rolegroupname?.toLowerCase().includes('committee')) {
          displayText = `<span style="font-size: 16px;">${displayText}</span>`;
        }
        // Custom font size for Taekwondo-Kyurogi (id=38) and Taekwondo-Poomsae (id=39)
        if ((person.eventType === 38 || person.eventType === 39) && !processedPerson.rolegroupname?.toLowerCase().includes('committee')) {
          displayText = `<span style="font-size: 16px;">${displayText}</span>`;
        }
        if ((person.eventType === 27 || person.eventType === 37) && !processedPerson.rolegroupname?.toLowerCase().includes('committee')) {
          displayText = `<span style="font-size: 16px;">${displayText}</span>`;
        }

        if ((person.eventType === 33 || person.eventType === 34 || person.eventType === 35 || person.eventType === 32 ) && !processedPerson.rolegroupname?.toLowerCase().includes('committee')) {
          displayText = `<span style="font-size: 17px;">${displayText}</span>`;
        }

        // Allow custom styling for specific committee labels (e.g., 'Uniforms and Equipment' roleid=21)
        if (person.roleid === 21 || person.role === 21 || person.roleid === 11 || person.role === 11) {
          processedPerson.infoClassOverride = 'uniforms-equipment';
        }

        // Custom styling for Publicity, Media, and Documentation (roleid=16)
        if (person.roleid === 16 || person.role === 16) {
          processedPerson.infoClassOverride = 'publicity-media';
        }
        // Custom styling for Medical (roleid = 13)
        // Note: role/roleid sometimes arrive as strings from the API.
        if (Number(person.roleid) === 13 || Number(person.role) === 13) {
          processedPerson.infoClassOverride = 'medical-rescue';
        }

        // Custom styling for Food and Nutrition (roleid = 12)
        if (Number(person.roleid) === 12 || Number(person.role) === 12) {
          processedPerson.infoClassOverride = 'food-nutrition';
        }

        // Custom styling for Sound System and Technical Support / Lights and LED Wall (roleid = 19)
        if (Number(person.roleid) === 19 || Number(person.role) === 19) {
          processedPerson.infoClassOverride = 'sound-system-tech';
        }

        // Custom styling for Transportation, Safety and Security (roleid = 20)
        if (Number(person.roleid) === 20 || Number(person.role) === 20) {
          processedPerson.infoClassOverride = 'transportation-security';
        }

        // Custom styling for Clean and Green (roleid = 49)
        if (Number(person.roleid) === 49 || Number(person.role) === 49) {
          processedPerson.infoClassOverride = 'clean-green';
        }
// Custom styling for Officials with roleid=30
        // (Some data may not include rolegroupid, so we rely only on roleid.)
        if (Number(person.roleid) === 30 || Number(person.role) === 30) {
            processedPerson.infoClassOverride = 'official-30-roletype';
            processedPerson.cityClassOverride = 'official-30-city';
          }

        processedPerson.processedInfoText = displayText;
        return processedPerson;
      });
    },
    // --- new helper for printing a single personnel record ---
    async generateSingleIdCard(personnelID) {
      this.generatingIdCards = true;
      this.message = '';
      try {
        const resp = await personnelAPI.getById(personnelID);
        const person = resp.data;
        if (!person) {
          this.showMessage('Personnel not found', 'error');
          return;
        }
        // Process personnel data for display text formatting
        const processedPersonnel = this.processPersonnelForIdCards([person]);
        const html = generatePrintableIdCardHTML(processedPersonnel, this.allRoles);
        const w = window.open('', '_blank');
        if (!w) {
          this.printViaIframe(html);
        } else {
          w.document.write(html);
          w.document.close();
          w.onload = () => setTimeout(() => w.print(), 500);
        }
        this.showMessage(`Generated printable ID card for ${person.fullName}`, 'success');
      } catch (e) {
        console.error('Error printing single ID card:', e);
        this.showMessage('Error printing ID card: ' + (e.response?.data?.error || e.message), 'error');
      } finally {
        this.generatingIdCards = false;
      }
    },

    async generateTimestampReport() {
      this.generatingTimestamp = true;
      this.message = '';
      try {
        // Build filters for the API call
        const filters = {};
        // Use single date for whole day (dateFrom and dateTo are the same)
        if (this.timestampFilters.date) {
          filters.dateFrom = this.timestampFilters.date;
          filters.dateTo = this.timestampFilters.date;
        }
        if (this.timestampFilters.eventType !== '') {
          filters.eventType = this.timestampFilters.eventType;
        }
        if (this.timestampFilters.role !== '') {
          filters.role = this.timestampFilters.role;
        }
        if (this.timestampFilters.search) {
          filters.search = this.timestampFilters.search.trim();
        }
        filters.limit = 5000; // Allow larger reports

        // Fetch history data
        const response = await personnelAPI.getAllHistory(filters);
        const history = response.data.history || [];

        if (history.length === 0) {
          this.showMessage('No records found for the selected filters', 'error');
          return;
        }

        // Generate printable HTML report
        const html = this.generateTimestampReportHTML(history);

        // Open in new window for printing (or use iframe if popup blocked)
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          this.printViaIframe(html);
        } else {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }

        this.showMessage(`Generated In/Out timestamp report with ${history.length} records`, 'success');
      } catch (error) {
        console.error('Error generating timestamp report:', error);
        this.showMessage('Error generating report: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        this.generatingTimestamp = false;
      }
    },
    onExcelSearchFocus() {
      this.excelSearchOpen = true;
      if (this.excelHistoryFilters.search.trim()) {
        this.fetchExcelSearchPersonnel(this.excelHistoryFilters.search.trim());
      } else {
        this.excelSearchResults = [];
      }
    },
    onExcelSearchInput() {
      if (this.excelSearchDebounce) clearTimeout(this.excelSearchDebounce);
      const term = (this.excelHistoryFilters.search || '').trim();
      if (!term) {
        this.excelSearchResults = [];
        this.excelSearchOpen = true;
        return;
      }
      this.excelSearchDebounce = setTimeout(() => {
        this.excelSearchDebounce = null;
        this.fetchExcelSearchPersonnel(term);
      }, 300);
    },
    async fetchExcelSearchPersonnel(term) {
      this.excelSearchLoading = true;
      this.excelSearchOpen = true;
      try {
        const res = await personnelAPI.getAll({ search: term });
        this.excelSearchResults = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch (e) {
        this.excelSearchResults = [];
      } finally {
        this.excelSearchLoading = false;
      }
    },
    selectExcelSearchPerson(p) {
      const name = p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ').trim();
      this.excelHistoryFilters.search = name || `ID: ${p.personnelID}`;
      this.excelSearchOpen = false;
      this.excelSearchResults = [];
    },
    closeExcelSearchOnClickOutside(e) {
      if (this.excelSearchOpen && !e.target.closest('.search-person-wrap')) {
        this.excelSearchOpen = false;
      }
    },
    async generateTimeInOutExcel() {
      if (!this.excelHistoryFilters.date) {
        this.showMessage('Please select a date', 'error');
        return;
      }
      this.generatingExcelHistory = true;
      this.message = '';
      try {
        const filters = {
          date: this.excelHistoryFilters.date
        };
        if (this.excelHistoryFilters.eventType !== '') filters.eventType = this.excelHistoryFilters.eventType;
        if (this.excelHistoryFilters.role !== '') filters.role = this.excelHistoryFilters.role;
        if (this.excelHistoryFilters.search) filters.search = this.excelHistoryFilters.search.trim();

        const response = await personnelAPI.exportTimeInOutExcel(filters);
        const blob = response.data;
        const disposition = response.headers['content-disposition'];
        let filename = `Time-IN-OUT-History-${this.excelHistoryFilters.date}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match) filename = match[1];
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showMessage('Excel file downloaded', 'success');
      } catch (error) {
        console.error('Error generating Time IN/OUT Excel:', error);
        let msg = error.message;
        if (error.response?.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            msg = json.error || json.message || msg;
          } catch (_) {
            msg = error.response.status === 400 ? 'Date is required' : 'Export failed';
          }
        } else if (error.response?.data?.error) {
          msg = error.response.data.error;
        } else if (error.response?.data?.message) {
          msg = error.response.data.message;
        }
        this.showMessage(msg || 'Error downloading Excel', 'error');
      } finally {
        this.generatingExcelHistory = false;
      }
    },
    onIndividualSearchFocus() {
      this.individualSearchOpen = true;
      if (this.individualReportFilters.personSearch.trim()) {
        this.fetchIndividualSearchPersonnel(this.individualReportFilters.personSearch.trim());
      } else {
        this.individualSearchResults = [];
      }
    },
    onIndividualSearchInput() {
      if (this.individualSearchDebounce) clearTimeout(this.individualSearchDebounce);
      const term = (this.individualReportFilters.personSearch || '').trim();
      if (!term) {
        this.individualSearchResults = [];
        this.individualSearchOpen = true;
        return;
      }
      this.individualSearchDebounce = setTimeout(() => {
        this.individualSearchDebounce = null;
        this.fetchIndividualSearchPersonnel(term);
      }, 300);
    },
    async fetchIndividualSearchPersonnel(term) {
      this.individualSearchLoading = true;
      this.individualSearchOpen = true;
      try {
        const res = await personnelAPI.getAll({ search: term });
        this.individualSearchResults = Array.isArray(res.data) ? res.data.slice(0, 20) : [];
      } catch (e) {
        this.individualSearchResults = [];
      } finally {
        this.individualSearchLoading = false;
      }
    },
    selectIndividualSearchPerson(p) {
      this.individualReportFilters.selectedPerson = p;
      this.individualReportFilters.personSearch = p.fullName || [p.fname, p.mname, p.lname].filter(Boolean).join(' ').trim();
      this.individualSearchOpen = false;
      this.individualSearchResults = [];
    },
    clearIndividualSelection() {
      this.individualReportFilters.selectedPerson = null;
      this.individualReportFilters.personSearch = '';
      this.individualSearchResults = [];
    },
    async generateIndividualReport() {
      if (!this.individualReportFilters.selectedPerson) {
        this.individualReportMessage = 'Please select a personnel';
        this.individualReportMessageType = 'error';
        return;
      }

      this.generatingIndividualReport = true;
      this.individualReportMessage = '';
      try {
        const filters = {};
        if (this.individualReportFilters.date) {
          filters.date = this.individualReportFilters.date;
        }

        const response = await personnelAPI.exportIndividualTimeInOut(
          this.individualReportFilters.selectedPerson.personnelID,
          filters
        );
        const blob = response.data;
        const disposition = response.headers['content-disposition'];
        let filename = `Individual-Report-${this.individualReportFilters.selectedPerson.personnelID}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match) filename = match[1];
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.individualReportMessage = '✓ Individual report downloaded successfully';
        this.individualReportMessageType = 'success';
        // Clear message after 5 seconds
        setTimeout(() => {
          this.individualReportMessage = '';
        }, 5000);
      } catch (error) {
        console.error('Error generating individual report:', error);
        let msg = error.message;
        if (error.response?.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            msg = json.error || json.message || msg;
          } catch (_) {
            msg = 'Report generation failed';
          }
        } else if (error.response?.data?.error) {
          msg = error.response.data.error;
        } else if (error.response?.data?.message) {
          msg = error.response.data.message;
        }
        this.individualReportMessage = '✗ ' + (msg || 'Error generating report');
        this.individualReportMessageType = 'error';
      } finally {
        this.generatingIndividualReport = false;
      }
    },
    generateTimestampReportHTML(history) {
      // Group records by personnel
      const personnelMap = new Map();
      history.forEach(record => {
        const key = record.personnelID;
        if (!personnelMap.has(key)) {
          personnelMap.set(key, {
            personnelID: record.personnelID,
            fullName: record.fullName,
            roleName: record.roleName,
            eventTypeName: record.eventTypeName,
            records: []
          });
        }
        personnelMap.get(key).records.push({
          status: record.status,
          statusName: record.statusName,
          timestamp: record.timestamp
        });
      });

      // Build filters description
      let filterDesc = [];
      if (this.timestampFilters.date) filterDesc.push(`Date: ${this.timestampFilters.date}`);
      if (this.timestampFilters.eventType !== '') {
        const evt = this.eventTypes.find(e => e.value === this.timestampFilters.eventType);
        if (evt) filterDesc.push(`Event: ${evt.label}`);
      }
      if (this.timestampFilters.role !== '') {
        const r = this.allRoles.find(r => r.value === this.timestampFilters.role);
        if (r) filterDesc.push(`Role: ${r.label}`);
      }
      if (this.timestampFilters.search) filterDesc.push(`Search: ${this.timestampFilters.search}`);
      const filterText = filterDesc.length > 0 ? filterDesc.join(' | ') : 'All Records';

      // Format date/time
      const formatDateTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      };

      // Build table rows grouped by person
      let tableRows = '';
      personnelMap.forEach((person) => {
        // Sort records by timestamp descending
        person.records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const recordCount = person.records.length;
        person.records.forEach((rec, idx) => {
          tableRows += `
            <tr>
              ${idx === 0 ? `<td rowspan="${recordCount}" class="person-cell">${person.personnelID}</td>` : ''}
              ${idx === 0 ? `<td rowspan="${recordCount}" class="person-cell">${person.fullName}</td>` : ''}
              ${idx === 0 ? `<td rowspan="${recordCount}" class="person-cell">${person.roleName || ''}</td>` : ''}
              <td class="status-${rec.status === 1 ? 'in' : 'out'}">${rec.statusName}</td>
              <td>${formatDateTime(rec.timestamp)}</td>
            </tr>
          `;
        });
      });

      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>In/Out Timestamp Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      background: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #42b983;
    }
    .header h1 {
      color: #2c3e50;
      font-size: 24px;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .header .filters {
      margin-top: 10px;
      font-size: 12px;
      color: #888;
    }
    .summary {
      margin-bottom: 15px;
      font-size: 14px;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #42b983;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }
    .person-cell {
      background: #f9f9f9;
      font-weight: 500;
    }
    .status-in {
      color: #28a745;
      font-weight: 600;
    }
    .status-out {
      color: #dc3545;
      font-weight: 600;
    }
    tr:hover td {
      background: #f5f5f5;
    }
    @media print {
      body { padding: 10px; }
      .header { border-bottom: 1px solid #333; }
      th { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .status-in { color: #155724 !important; }
      .status-out { color: #721c24 !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>In/Out Timestamp Report</h1>
    <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
    <div class="filters">${filterText}</div>
  </div>
  <div class="summary">
    Total Personnel: ${personnelMap.size} | Total Records: ${history.length}
  </div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Full Name</th>
        <th>Role</th>
        <th>Status</th>
        <th>Date & Time</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>
      `;
    },
    generatePrintableIdCardHTML(personnel) {
      const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api';
      const baseUrl = API_BASE_URL.replace(/\/api$/, '');
      const frontBaseUrl = window.location.origin; // used for font URLs

      // Helper function to map roles to template backgrounds (front of ID)
      const getRoleTemplate = (roleId, roleName, roleGroupName) => {
        // If this role belongs to a 'Committee' group always use the
        // management template (e.g. "Athlete Management Team" should
        // render with the management design even though it contains
        // the word 'athlete').
        if (roleGroupName && String(roleGroupName).toLowerCase().includes('committee')) {
          return 'management.png';
        }
        // Officials and Officiating should always use the management design,
        // even if their role name matches sports keywords.
        if (roleGroupName && /official|officiat/i.test(String(roleGroupName))) {
          return 'management.png';
        }

        let roleIdNum = Number(roleId);
        
        if (roleIdNum === 1) return 'athlete.png';
        if (roleIdNum === 2) return 'asstcoach.png';
        if (roleIdNum === 3) return 'chaperon.png';
        if (roleIdNum === 4) return 'coach.png';
        
        const roleNameLower = String(roleName || '').toLowerCase();
        if (roleNameLower.includes('athlete')) return 'athlete.png';
        if (roleNameLower.includes('asst') || roleNameLower.includes('assistant')) return 'asstcoach.png';
        if (roleNameLower.includes('chaperon') || roleNameLower.includes('chaperone')) return 'chaperon.png';
        if (roleNameLower.includes('coach')) return 'coach.png';
        
        return 'management.png';
      };

      // Back of ID: same role mapping but with *back.png (e.g. coach.png -> coachback.png)
      const getRoleTemplateBack = (roleId, roleName, roleGroupName) => {
        const front = getRoleTemplate(roleId, roleName, roleGroupName);
        return front.replace(/\.png$/, 'back.png');
      };
      
      // Group personnel into pages of 2:
      // Each person prints twice per row (duplicate pair) using the same
      // role-based template for both copies.
      const peoplePerPage = 2;
      const pages = [];
      for (let i = 0; i < personnel.length; i += peoplePerPage) {
        pages.push(personnel.slice(i, i + peoplePerPage));
      }
      
      let pagesHTML = '';
      const renderCard = (person, mode = 'photo') => {
        // mode: 'photo' shows picture + name/role, 'qr' shows QR code only
        if (!person) return '<div class="id-card id-card-empty"></div>';

        // Fix: define inline style variables (empty by default, or customize as needed)
        const roletypeInline = '';
        const cityInline = '';

        const photoUrl = person.pictureUrl
          ? (person.pictureUrl.startsWith('http') || person.pictureUrl.startsWith('data:')
              ? person.pictureUrl
              : `${baseUrl}${person.pictureUrl}`)
          : '';

        const qrUrl = person.qrcodeUrl
          ? (person.qrcodeUrl.startsWith('http') || person.qrcodeUrl.startsWith('data:')
              ? person.qrcodeUrl
              : `${baseUrl}${person.qrcodeUrl}`)
          : '';

        const fullName =
          person.fullName ||
          `${person.fname || ''} ${person.mname || ''} ${person.lname || ''}`.trim();
        const isOfficial =
          Number(person?.rolegroupid) === 3 ||
          Number(person?.rolegroupid) === 5 ||
          /official|officiat/i.test(String(person?.rolegroupname || ''));
        // Use same logic as backend: prefer legacy role for display (role=2 -> Asst. Coach), then roleid
        const roleIdForDisplay = person.role != null && person.role !== '' ? Number(person.role) : person.roleid;
        const isVisitor = Number(person.roleid) === 45 || Number(roleIdForDisplay) === 45;
        const isDisciplineReligion = roleIdForDisplay === 10;
        const isCredentialsResults = roleIdForDisplay === 26;
        const isCleanGreen = roleIdForDisplay === 49;
        const roleName =
          (this.allRoles.find((r) => r.value === roleIdForDisplay)?.label) || person.roleName || '';
        const eventTypeName = person.eventTypeName || '';
        const roleType = person.roleType || '';
        // Allow per-person override for the printed city label.
        const cityText = person.city || person.location || 'Lapu - Lapu City';

        // Always use new role-based template. Pass role group so that
        // committee entries (e.g. Athlete Management Team) use the
        // management design even if the role name contains 'athlete'.
        const roleTemplate = getRoleTemplate(roleIdForDisplay, roleName, person.rolegroupname);
        const roleTemplateBack = getRoleTemplateBack(roleIdForDisplay, roleName, person.rolegroupname);
        const bgUrl = `${baseUrl}/assets/${roleTemplate}`;
        const bgUrlBack = `${baseUrl}/assets/${roleTemplateBack}`;

        // For management cards we prefer to display the committee role instead
        // of the event type.  The template filename is "management.png" in that
        // case, so we check for it here.  Also append roleType when present.
        const isManagement = roleTemplate === 'management.png';
        const committeeLabel = roleName + (roleType ? ' - ' + roleType : '');
        // Add line break after EMERGENCY for long disaster text
        // and special break for Athlete Management Team labels
        let infoText = isManagement ? committeeLabel : eventTypeName;
        if (infoText) {
          const textUpper = infoText.toUpperCase();
          if (textUpper.includes('EMERGENCY') && textUpper.includes('RESPONSE')) {
            // Replace EMERGENCY RESPONSE with EMERGENCY<br/>RESPONSE (case-insensitive)
            infoText = infoText.replace(/EMERGENCY\s+RESPONSE/gi, 'EMERGENCY<br/>RESPONSE');
          }
          // break off roleType on its own line when committee is Athlete Management Team
          if (/^athlete management team\s*-\s*/i.test(infoText)) {
            // also wrap the roleType portion in a span so we can enlarge it
            infoText = infoText.replace(/^(Athlete Management Team\s*-\s*)(.*)$/i,
              '$1<br/><span class="large">$2</span>');
          }
        }

        // Adjust name size for long names so text does not overlap graphics.
        const nameLength = fullName.length;
        // shrink earlier so medium-length names stay readable
        const nameClass =
          nameLength > 45 ? 'id-name id-name-xxl' :
          nameLength > 30 ? 'id-name id-name-xl' :
          nameLength > 20 ? 'id-name id-name-long' :
          'id-name';

        let infoClass = 'id-event-type';
        if (isManagement) {
          infoClass += ' management';

          // Custom: add medical-rescue class for roleid 13
          if (roleIdForDisplay === 13) {
            infoClass += ' medical-rescue';
          }

          // Special role overrides: check these first before shrink/tiny logic
          // Accommodation and Billeting: larger font for better visibility
          if (roleIdForDisplay === 6 || (infoText && infoText.toUpperCase().includes('ACCOMMODATION AND BILLETING'))) {
            infoClass += ' accommodation-billeting';
          }
          // Discipline and Religion: larger font for long text
          if (roleIdForDisplay === 10 || (infoText && infoText.toUpperCase().includes('DISCIPLINE AND RELIGION'))) {
            infoClass += ' discipline-religion';
          }

          // Credentials and Results: adjust fontsize specifically for this committee
          if (isCredentialsResults) {
            infoClass += ' credentials-results';
          }

          // Officials (rolegroup 3): use separate length-based sizing classes
          // so you can tune officials without affecting committee/management.
          if (isOfficial) {
            const len = committeeLabel.length;
            if (len <= 18) infoClass += ' official-short';
            else if (len <= 26) infoClass += ' official-medium';
            else infoClass += ' official-long';
          } else {
            // Medical (roleid 13) and Sound System Tech (roleid 19):
            // keep custom sizing/margins stable by not auto-applying shrink/tiny.
            if (roleIdForDisplay !== 13 && roleIdForDisplay !== 19) {
              if (nameClass.includes('xl') || nameClass.includes('xxl') || committeeLabel.length > 25) {
                infoClass += ' shrink';
              }
              // Apply tiny class for long disaster management text or roleid 9
              if (roleIdForDisplay === 9 || (infoText && infoText.toUpperCase().includes('DISASTER PREPAREDNESS'))) {
                infoClass += ' tiny';
              }
              // Trainer labels should be large (same as name font size)
              if (infoText && infoText.trim().toUpperCase() === 'TRAINER') {
                infoClass += ' large';
              } else if (committeeLabel.length <= 20) {
                // Short roletype (e.g. City Mayor, Chairman) get larger font so they're readable
                infoClass += ' short-roletype';
              }
            }
          }
        }
        // Visitor role (roleid 45): slightly larger font for the roletype line
        if (isVisitor) {
          infoClass += ' visitor-roletype';
        }

        if (mode === 'back') {
          // Back of ID: role back template (e.g. coachback.png) with QR code
          return `
            <div class="id-card">
              <div class="id-card-background" style="background-image: url('${bgUrlBack}')">
                <div class="id-card-content${isOfficial ? ' official-card' : ''}">
                  <div class="id-qr-large-container">
                    ${
                      qrUrl
                        ? `<img src="${qrUrl}" alt="QR Code" class="id-qr-code-large" />`
                        : '<div class="id-qr-placeholder-large">No QR</div>'
                    }
                  </div>
                </div>
              </div>
            </div>
          `;
        }

        // Photo mode (default)
        return `
          <div class="id-card">
            <div class="id-card-background" style="background-image: url('${bgUrl}')">
              <div class="id-card-content${isOfficial ? ' official-card' : ''}">
                <div class="id-photo-container">
                  ${
                    // Visitors (roleid 45) always show initials instead of a photo
                    isVisitor
                      ? `<div class="id-photo-placeholder visitor-initials">${getInitials(fullName)}</div>`
                      : photoUrl
                        ? `<img src="${photoUrl}" alt="${fullName}" class="id-photo" />`
                        : '<div class="id-photo-placeholder">No Photo</div>'
                  }
                </div>
                <div class="${nameClass}">${fullName}</div>
                ${person.processedInfoText ? `<div class="${[person.infoClassOverride, infoClass].filter(Boolean).join(' ')}" style="${roletypeInline}">${person.processedInfoText}</div>` : ''}
                <div class="id-card-city${isVisitor ? ' visitor-city' : ''}${isDisciplineReligion ? ' discipline-religion-city' : ''}${isCredentialsResults ? ' credentials-results-city' : ''}${isCleanGreen ? ' clean-green-city' : ''}${person.cityClassOverride ? ' ' + person.cityClassOverride : ''}" style="${cityInline}">${cityText}</div>
              </div>
            </div>
          </div>
        `;
      };

      // Layout: ID1 (front) | ID1 (back), ID2 (front) | ID2 (back)
      // e.g. coach.png + coachback.png for person 1, asstcoach.png + asstcoachback.png for person 2
      pages.forEach((pagePersonnel) => {
        const padded = [...pagePersonnel];
        while (padded.length < peoplePerPage) padded.push(null);

        pagesHTML += `
          <div class="id-card-page">
            ${renderCard(padded[0], 'photo')}
            ${renderCard(padded[0], 'back')}
            ${renderCard(padded[1], 'photo')}
            ${renderCard(padded[1], 'back')}
          </div>
        `;
      });
      
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Print ID Cards - ${new Date().toLocaleDateString()}</title>
  <style>
    /* Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @font-face {
      font-family: 'Neue Machina';
      src:
        url('${frontBaseUrl}/fonts/NeueMachina-Regular.woff2') format('woff2'),
        url('${frontBaseUrl}/fonts/NeueMachina-Regular.woff') format('woff');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      /* Long bond paper */
      size: 8.5in 13in;
      /* smaller margins to increase usable space and reduce bottom gap */
      margin: 0.35in;
    }
    
    body {
      font-family: Arial, sans-serif;
      background: white;
    }
    
    .id-card-page {
      width: 100%;
      /* reduce height so page is fully used and bottom gap disappears */
      height: 11.8in;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      /* tighter gap to pack cards closer together */
      gap: 0.15in;
      page-break-after: always;
      padding: 0;
    }
    
    .id-card-page:last-child {
      page-break-after: auto;
    }
    
    .id-card {
      width: 100%;
      height: 100%;
      position: relative;
      page-break-inside: avoid;
    }
    
    .id-card-empty {
      visibility: hidden;
    }
    
    .id-card-background {
      width: 100%;
      height: 95%;
      /* ensure the background image always fits the card dimensions */
      background-size: 100% 100%;
      background-position: center center;
      background-repeat: no-repeat;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      border: 1px solid #1976d2;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .id-card-background::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* Light overlay to keep text readable over template */
      background: rgba(255, 255, 255, 0.15);
      pointer-events: none;
    }
    
    .id-card-content {
      position: relative;
      z-index: 1;
      padding: 10px;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .id-photo-container {
      width: 100%;
      max-width: 140px;
      /* move photo up a bit to free vertical space */
      margin-top: 132px;
      margin-bottom: 5px;
      margin-left: -90px;
      display: flex;
      justify-content: center;
    }
    
    .id-photo {
      width: 100%;
      max-width: 170px;
      height: 170px;
      object-fit: cover;
     
      border-radius: 4px;
      background: white;
    }
    
    .id-photo-placeholder {
      width: 160px;
      height: 180px;
      background: #f0f0f0;
      border: 2px solid #000;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 11px;
    }

    .id-photo-placeholder.visitor-initials {
      width: 100%;
      max-width: 170px;
      height: 170px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #42b983 0%, #2c7a6d 100%);
      border-radius: 4px;
      font-size: 48px;
      font-weight: 700;
      color: white;
      font-family: 'Inter', Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: none;
    }
    
    .id-name {
      font-size: 18px;
      font-weight: 700;
      font-family: 'Inter', Arial, sans-serif;
      color: #000000;
      text-align: center;
      margin-top: 40px;
      margin-right: 85px;
      text-transform: uppercase;
      text-shadow: none;
      letter-spacing: 0.2px;
      width: 100%;
      line-height: 1.2;
      word-break: break-word;
      overflow-wrap: break-word;
      /* extra vertical allowance before clipping */
      max-height: 5.2em;
      overflow: hidden;
    }
    
    /* Slightly smaller font for long names */
    .id-name-long {
      font-size: 14px;
   
    }
    
    /* Smaller for very long names */
    .id-name-xl {
      font-size: 11px;

    }

    /* Smallest for extremely long names */
    .id-name-xxl {
      font-size: 8px;
 
    }
    
    .id-role {
      font-size: 20px;
      color: #000000;
      text-align: center;
      margin-bottom: 4px;
      font-weight: 500;
      font-family: 'Inter', Arial, sans-serif;
      text-shadow: none;
    }
    
    .id-event-type {
      font-size: 25px;
      font-weight: 600;
      font-family: 'Inter', Arial, sans-serif;
      color: #ff9800;
      text-align: center;
      margin-right: 75px;
      margin-top: 37px;
      margin-bottom: 0px;
      text-transform: uppercase;
      text-shadow: none;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }

    /* simpler style used on management cards (committees with roleType) */
    .id-event-type.management {
      font-size: 12px;
      font-weight: 600;
      margin-right: 75px;
      margin-bottom: 10px;
      color: #000000;
      text-shadow: none;
      line-height: 1.2;
      word-break: break-word;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      max-width: 70ch;
    }

    /* shrink further when paired with an already-small name */
    .id-event-type.management.shrink {
      font-size: 11px;
      word-break: break-word;
    }

    /* tiny style for roleid 9 - extremely small with aggressive wrapping */
    .id-event-type.management.tiny {
      font-size: 9px;
      word-break: break-all;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      line-height: 1.1;
      max-width: 70ch;
    }

    /* large label (e.g. TRAINER) should match the name font size */
    .id-event-type.management.large {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
      line-height: 1.2;
    }

    /* Short roletype (e.g. City Mayor, Chairman): bigger font so few letters aren't tiny */
    .id-event-type.management.short-roletype {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
    }

    /* Custom spacing for Uniforms and Equipment (allows tweaking margin without affecting others) */
    .id-event-type.uniforms-equipment {
      margin-top: 10px; /* adjust as needed */
      /* feel free to add additional styling here */
      margin-top:50px;
    }

    /* Custom spacing for Publicity, Media, and Documentation (roleid=16) */
    .id-event-type.publicity-media {
      margin-top: 40px; 

    }
    /* Custom spacing for medical (roleid=13) */
    .id-event-type.medical-rescue {
      margin-top: 45px; 
      font-size: 10px;

    }

    /* Ensure medical-rescue wins even if other sizing classes are present */
    .id-event-type.management.medical-rescue,
    .id-event-type.management.shrink.medical-rescue,
    .id-event-type.management.tiny.medical-rescue,
    .id-event-type.management.short-roletype.medical-rescue {
      font-size: 13px;
      margin-top: 39px;
      margin-bottom: 6px;
    }

    /* Visitor role only: slightly bigger font for the VISITOR roletype text */
    .id-event-type.visitor-roletype {
      font-size: 15px;
      font-weight: 600;
      margin-top: 40px;
      line-height: 1.2;
    }

    /* Custom styling for Sound System and Technical Support / Lights and LED Wall (roleid=19) */
    .id-event-type.sound-system-tech {
      margin-top: 40px;
      font-size: 13px;
      line-height: 1.25;
      max-width: 80ch;
    }

    /* Custom styling for Transportation, Safety and Security (roleid=20) */
    .id-event-type.transportation-security {
      margin-top: 40px;
      font-size: 14px;
      line-height: 1.25;
      max-width: 80ch;
    }

    /* Custom styling for Food and Nutrition (roleid=12) */
    .id-event-type.food-nutrition,
    .id-event-type.management.food-nutrition {
      margin-top: 40px;
      font-size: 10px;
      line-height: 1.25;
      max-width: 80ch;
      margin-bottom: 5px;
      margin-right: 80px;
    }
    .id-event-type.food-nutrition + .id-card-city,
    .id-event-type.management.food-nutrition + .id-card-city {
      margin-bottom: 15px;
    }

    /* Custom styling for Clean and Green (roleid=49) */
    .id-event-type.clean-green,
    .id-event-type.management.clean-green {
      margin-top: 45px;
      font-size: 15px;
      line-height: 1.2;
      max-width: 80ch;
    }

    /* Ensure clean-green wins even if other sizing classes are present */
    .id-event-type.management.shrink.clean-green,
    .id-event-type.management.tiny.clean-green,
    .id-event-type.management.short-roletype.clean-green {
      font-size: 15px;
      line-height: 1.2;
    }

    /* Custom styling for Officials (roleid=30) */
    .id-event-type.official-30-roletype {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    /* Ensure officials (roleid=30) win even if other sizing classes are present */
    .id-event-type.management.shrink.official-30-roletype,
    .id-event-type.management.tiny.official-30-roletype,
    .id-event-type.management.short-roletype.official-30-roletype {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .id-card-city.official-30-city {
      margin-top: 22px;
      margin-bottom: 10px;
      font-size: 25px;
      font-weight: 300;
    }

    /* Ensure sound-system-tech wins even if other sizing classes are present */
    .id-event-type.management.sound-system-tech,
    .id-event-type.management.shrink.sound-system-tech,
    .id-event-type.management.tiny.sound-system-tech,
    .id-event-type.management.short-roletype.sound-system-tech {
      margin-top: 40px;
      font-size: 10px;
      line-height: 1.25;
    }

    /* Ensure transportation-security wins even if other sizing classes are present */
    .id-event-type.management.transportation-security,
    .id-event-type.management.shrink.transportation-security,
    .id-event-type.management.tiny.transportation-security,
    .id-event-type.management.short-roletype.transportation-security {
      margin-top: 40px;
      font-size: 10px;
      line-height: 1.25;
    }

    /* Accommodation and Billeting: larger font for better visibility */
    .id-event-type.accommodation-billeting {
      font-size: 10px;
      font-weight: 700;
      line-height: 1.3;
      max-width: 80ch;
    }
    
    /* Ensure accommodation-billeting overrides all shrink/tiny variants */
    .id-event-type.management.shrink.accommodation-billeting,
    .id-event-type.management.tiny.accommodation-billeting,
    .id-event-type.management.short-roletype.accommodation-billeting {
      font-size: 12px;
      font-weight: 700;
    }

    /* Discipline and Religion: larger font for long text */
    .id-event-type.discipline-religion {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
      max-width: 80ch;
    }
    
    /* Ensure discipline-religion overrides shrink/tiny variants */
    .id-event-type.management.shrink.discipline-religion,
    .id-event-type.management.tiny.discipline-religion {
      font-size: 14px;
      margin-bottom: -3px;
      font-weight: 600;
    }

    /* Officials (rolegroup 3) - position overrides.
       Adjust these values to move ONLY Officials without affecting other roles. */
    .official-card .id-photo-container {
      /* Adjust margins here if needed */
    }
    .official-card .id-name {
      /* Adjust name position/size here if needed */
    }
    .official-card .id-event-type,
    .official-card .id-event-type.management {
      /* Adjust roletype position/size here if needed */
      margin-top: 45px;
    }
    .official-card .id-card-city {
      /* Adjust city label position/size here if needed */
    }

    /* Officials-only length sizing (edit font-size here) */
    .official-card .id-event-type.management.official-short {
      font-size: 16px;
      font-weight: 600;
    }
    .official-card .id-event-type.management.official-medium {
      font-size: 14px;
      font-weight: 600;
    }
    .official-card .id-event-type.management.official-long {
      font-size: 12px;
      font-weight: 600;
    }

    /* "Lapu - Lapu City" below roletype — adjust position and font here */
    .id-card-city {
      font-size: 25px;
      font-weight: 500;
      font-family: 'Inter', Arial, sans-serif;
      color: black;
      text-align: center;
      margin-top: 30px;
      margin-right: 75px;
      margin-bottom: 0;
      letter-spacing: 0.3px;
      line-height: 1.2;
    }

    /* Visitor cards can have their own spacing so the city label can be moved if needed */
    .id-card-city.visitor-city {
      margin-top: 100px;
    }

    /* Discipline & Religion (roleid=10) uses a longer label, so pull the city text up a bit */
    .id-card-city.discipline-religion-city {
      margin-top: 35px;
    }

    /* Clean and Green (roleid=49): allows custom top spacing for city text */
    .id-card-city.clean-green-city {
      margin-top: 35px;
    }

    /* Credentials and Results (roleid=26) needs custom city positioning */
    .id-card-city.credentials-results-city {
      margin-top: 30px;
    }

    /* Credentials and Results (roleid=26) should have a smaller roletype font to fit the template */
    .id-event-type.management.credentials-results {
      font-size: 14px;
      margin-bottom: 1px;
    }
    
    .id-footer {
      margin-top: auto;
      width: 100%;
      display: flex;
      justify-content: flex-start;
      align-items: flex-end;
      padding-bottom: 8px;
    }
    
    .id-qr-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .id-qr-code {
      width: 150px;
      height: 150px;
      border: 2px solid #000;
      border-radius: 4px;
      background: white;
      padding: 4px;
      object-fit: contain;
    }
    
    .id-qr-placeholder {
      width: 150px;
      height: 150px;
      background: #f0f0f0;
      border: 2px solid #000;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 9px;
    }

    .id-qr-large-container {
      width: 100%;
      height: 100%;
      display: flex;
      margin-bottom: 77px;
      margin-right: 90px;
      align-items: center;
      justify-content: center;
      /* reduce padding so qr code can grow to match photo height */
      padding: 3px;
    }

    .id-qr-code-large {
      /* match the photo dimensions used elsewhere */
      max-width: 200px;
      max-height: 200px;
      width: 100%;
      height: 100%;
      border: 2px solid #000;
      margin-top: 200px;
      border-radius: 4px;
      background: white;
      padding: 4px;
      object-fit: contain;
    }

    .id-qr-placeholder-large {
      width: 250px;
      height: 250px;
      background: #f0f0f0;
      border: 2px solid #000;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
    }
    
    @media print {
      body {
        background: white;
      }
      
      .id-card-page {
        page-break-after: always;
      }
      
      .id-card-page:last-child {
        page-break-after: auto;
      }
      
      @page {
        size: 8.5in 13in;
        margin: 0.35in;
      }
    }
  </style>
</head>
<body>
  ${pagesHTML}
</body>
</html>
      `;
    },
    async exportPersonnelPhotoReport() {
      this.generatingPhotoReport = true;
      this.message = '';
      try {
        // Fetch all personnel
        const response = await personnelAPI.getAll({});
        let personnel = response.data;
        
        if (personnel.length === 0) {
          this.showMessage('No personnel found', 'error');
          this.generatingPhotoReport = false;
          return;
        }
        
        // Filter based on selected mode
        if (this.photoExportMode === 'with-photo') {
          personnel = personnel.filter(p => p.picture && String(p.picture).trim() !== '');
        } else if (this.photoExportMode === 'without-photo') {
          personnel = personnel.filter(p => !p.picture || String(p.picture).trim() === '');
        }
        
        if (personnel.length === 0) {
          this.showMessage(
            `No personnel found matching the selected filter (${this.photoExportMode})`,
            'error'
          );
          this.generatingPhotoReport = false;
          return;
        }
        
        // Generate Excel file using dynamic import
        const ExcelJS = await import('exceljs');
        const fileSaver = await import('file-saver');
        
        const Workbook = ExcelJS.Workbook;
        const workbook = new Workbook();
        const sheet = workbook.addWorksheet('Personnel Photos');
        
        // Set up headers
        const headers = [
          'ID',
          'First Name',
          'Middle Name',
          'Last Name',
          'Full Name',
          'Role',
          'Role Type',
          'Event Type',
          'Photo Status',
          'Status',
          'Date Created'
        ];
        
        sheet.addRow(headers);
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B983' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'center' };
        
        // Add data rows
        personnel.forEach((p) => {
          const hasPhoto = p.picture && String(p.picture).trim() !== '' ? 'YES' : 'NO';
          const dateCreated = p.created_at 
            ? new Date(p.created_at).toLocaleDateString() 
            : '';
          
          sheet.addRow([
            p.personnelID || '',
            p.fname || '',
            p.mname || '',
            p.lname || '',
            p.fullName || `${p.fname || ''} ${p.mname || ''} ${p.lname || ''}`.trim(),
            p.roleName || '',
            p.roleType || '',
            p.eventTypeName || '',
            hasPhoto,
            p.statusName || (p.personnelStatus === 1 ? 'IN' : 'OUT'),
            dateCreated
          ]);
        });
        
        // Adjust column widths
        sheet.getColumn(1).width = 8;
        sheet.getColumn(2).width = 14;
        sheet.getColumn(3).width = 14;
        sheet.getColumn(4).width = 14;
        sheet.getColumn(5).width = 20;
        sheet.getColumn(6).width = 16;
        sheet.getColumn(7).width = 12;
        sheet.getColumn(8).width = 14;
        sheet.getColumn(9).width = 12;
        sheet.getColumn(10).width = 10;
        sheet.getColumn(11).width = 14;
        
        // Freeze the header row
        sheet.freezePane = 'A2';
        
        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `personnel_photos_${this.photoExportMode}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        fileSaver.saveAs(blob, filename);
        
        this.showMessage(
          `Excel report generated successfully (${personnel.length} personnel)`,
          'success'
        );
      } catch (error) {
        console.error('Error exporting photo report:', error);
        this.showMessage(
          'Error: ' + (error.response?.data?.error || error.message),
          'error'
        );
      } finally {
        this.generatingPhotoReport = false;
      }
    },
    showMessage(text, type = 'success') {
      this.message = text;
      this.messageType = type;
      setTimeout(() => {
        this.message = '';
      }, 5000);
    }
  }
  
};
</script>

<style scoped>
.generate-files-view {
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 32px;
}

.subtitle {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.generate-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.option-card {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.option-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.option-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.option-icon {
  font-size: 32px;
}

.option-header h2 {
  color: #2c3e50;
  margin: 0;
  font-size: 20px;
}

.option-description {
  color: #666;
  margin: 0 0 20px 0;
  font-size: 14px;
  line-height: 1.5;
}

.option-filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-select,
.export-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}

.option-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.status-export-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
  font-size: 14px;
}

.status-export-filter label {
  font-weight: 600;
  color: #555;
}

.status-export-filter .filter-select {
  max-width: 220px;
}

.idcard-mode {
  display: flex;
  gap: 16px;
  margin: 10px 0 15px;
  font-size: 14px;
}

.idcard-mode label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.idcard-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.photo-export-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.photo-export-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
}

.photo-export-options input[type="radio"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.timestamp-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.timestamp-filters .filter-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timestamp-filters .filter-row label {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.timestamp-filters .filter-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.timestamp-filters .search-row {
  grid-column: span 2;
}

.timestamp-filters .search-input {
  width: 100%;
}

.search-person-row .filter-row {
  flex-direction: column;
  align-items: stretch;
}

.search-person-wrap {
  position: relative;
  width: 100%;
}

.search-person-loading {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  z-index: 10;
}

.search-person-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 240px;
  overflow-y: auto;
  z-index: 10;
}

.search-person-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  transition: background 0.15s;
}

.search-person-item:last-child {
  border-bottom: none;
}

.search-person-item:hover {
  background: #e8f5e9;
}

.search-person-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: #f0f0f0;
}

.search-person-photo-container {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
}

.search-person-photo-container.initials-container {
  background: linear-gradient(135deg, #42b983 0%, #35a372 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-person-photo-container .initials {
  font-size: 14px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.search-person-text {
  min-width: 0;
}

.search-person-name {
  display: block;
  font-weight: 600;
  color: #2c3e50;
}

.search-person-meta {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.search-person-empty {
  padding: 12px;
  color: #666;
  font-size: 13px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #42b983;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #35a372;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  padding: 15px 20px;
  border-radius: 4px;
  margin-top: 20px;
  font-weight: 500;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.message.info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.selected-person-display {
  margin: 12px 0;
  padding: 12px;
  background: #e8f5e9;
  border: 1px solid #4caf50;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-person-info {
  flex: 1;
  font-size: 13px;
  color: #2e7d32;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.selected-person-id {
  color: #558b2f;
  font-size: 12px;
}

.btn-remove {
  padding: 4px 8px;
  background-color: #ff5252;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-remove:hover {
  background-color: #ff1744;
}

.card-notification {
  padding: 12px 15px;
  border-radius: 4px;
  margin: 0 0 15px 0;
  font-size: 13px;
  font-weight: 600;
  border-left: 4px solid;
  animation: slideIn 0.3s ease-out;
}

.notification-success {
  background-color: #d4edda;
  color: #155724;
  border-left-color: #28a745;
}

.notification-error {
  background-color: #f8d7da;
  color: #721c24;
  border-left-color: #dc3545;
}

.notification-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border-left-color: #17a2b8;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .generate-options {
    grid-template-columns: 1fr;
  }

  .option-actions {
    flex-direction: column;
  }

  .export-select {
    width: 100%;
  }
}
</style>
