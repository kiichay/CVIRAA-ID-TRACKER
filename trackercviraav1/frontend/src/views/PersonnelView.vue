<template>
  <div class="personnel-view">
    <div class="header">
      <h1>Personnel Management</h1>
      <button @click="showAddForm = true" class="btn btn-primary">Add New Personnel</button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <!-- Roles Dropdown with Nested Menu -->
      <div class="filter-dropdown-wrapper" @mouseleave="startRoleCloseTimer" @mouseenter="cancelRoleCloseTimer">
        <button 
          type="button"
          @mouseenter="showRoleMenu = true; cancelRoleCloseTimer()"
          class="filter-select role-dropdown-btn"
        >
          {{ getSelectedRoleLabel() || 'Roles' }}
          <span class="dropdown-arrow">▼</span>
        </button>
        <!-- Nested Menu for Role Groups -->
        <div v-if="showRoleMenu" class="role-nested-menu" @mouseenter="showRoleMenu = true; cancelRoleCloseTimer()" @mouseleave="startRoleCloseTimer" @click.stop>
          <div 
            v-for="group in roleGroups" 
            :key="group.rolegroupid"
            class="role-group-item"
            @mouseenter="hoveredRoleGroup = group.rolegroupid; cancelRoleCloseTimer()"
            @mouseleave="hoveredRoleGroup = null; startRoleCloseTimer()"
          >
            <div class="role-group-label">{{ group.rolegroupname }}</div>
            <div v-if="hoveredRoleGroup === group.rolegroupid" class="role-children-menu" @mouseenter="cancelRoleCloseTimer()" @mouseleave="startRoleCloseTimer()">
              <div 
                v-for="role in getRolesByGroup(group.rolegroupid)"
                :key="role.value"
                class="role-child-item"
                :class="{ 'selected': filterRole == role.value }"
                @click="selectRole(role.value)"
              >
                {{ role.label }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <select v-model="filterEventType" @change="onFilterChange" class="filter-select">
        <option value="">Events</option>
        <option v-for="event in eventTypes" :key="event.value" :value="event.value">
          {{ event.label }}
        </option>
      </select>
      <select v-model="filterStatus" @change="onFilterChange" class="filter-select">
        <option value="">Status</option>
        <option value="1">In</option>
        <option value="0">Out</option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by name or ID..."
        class="search-input"
        @input="onSearchInput"
      />
      <button @click="resetFilters" class="btn btn-reset">Reset Filters</button>
    </div>

    <!-- Personnel Table -->
    <div class="table-container">
      <div v-if="!hasActiveFilter" class="choose-filter-message">
        Choose at least one filter (Role, Event Type, or Status) to display records.
      </div>
      <div v-else>
        <!-- record count indicator -->
        <div class="record-count">
          Showing {{ recordCount }} record<span v-if="recordCount !== 1">s</span>
        </div>
        <table class="personnel-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Photo</th>
            <th>Name</th>
            <th>Role</th>
            <th>Event Type</th>
            <th>Status</th>
            <th>QR Code</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="loading">Loading...</td>
          </tr>
          <tr v-else-if="personnelList.length === 0">
            <td colspan="8" class="no-data">No personnel found</td>
          </tr>
          <tr v-else v-for="person in displayedPersonnelList" :key="person.personnelID">
            <td>{{ person.personnelID }}</td>
            <td>
              <img
                v-if="person.pictureUrl"
                :src="getImageUrl(person.pictureUrl, person.updated_at || person.created_at)"
                :alt="person.fullName"
                class="profile-img profile-img-clickable"
                title="Click to preview and copy"
                @click="openPhotoPreview(person)"
              />
              <div v-else class="initials-container">
                <span class="initials">{{ getInitials(person.fullName) }}</span>
              </div>
            </td>
            <td>{{ person.fullName }}</td>
            <td>{{ person.roleName }}</td>
            <td>{{ person.eventTypeName }}</td>
            <td>
              <span :class="['status-badge', person.personnelStatus === 1 ? 'status-in' : 'status-out']">
                {{ person.statusName }}
              </span>
            </td>
            <td>
              <img
                v-if="person.qrcodeUrl"
                :src="qrSrc(person)"
                alt="QR Code"
                class="qr-img"
                @click="showQRCode(person)"
                @error="handleQrError(person)"
              />
              <span v-else>No QR</span>
            </td>
            <td>
              <button @click="editPersonnel(person)" class="btn btn-sm btn-edit">Edit</button>
              <button @click="deletePersonnel(person.personnelID)" class="btn btn-sm btn-delete">Delete</button>
              <button @click="viewIdCard(person.personnelID)" class="btn btn-sm btn-view">ID Card</button>
              <button @click="viewHistory(person.personnelID)" class="btn btn-sm btn-history">History</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- end of filter-content wrapper -->
    </div>

    <!-- Add/Edit Form Modal -->
    <div v-if="showAddForm || editingPersonnel" class="modal-overlay" @click="closeForm">
      <div class="modal-content" @click.stop>
        <PersonnelForm
          :personnel="editingPersonnel"
          @save="handleSave"
          @cancel="closeForm"
        />
      </div>
    </div>

    <!-- QR Code Modal -->
    <div v-if="selectedQRCode" class="modal-overlay" @click="selectedQRCode = null">
      <div class="modal-content qr-modal" @click.stop>
        <h2>QR Code</h2>
        <img :src="getImageUrl(selectedQRCode)" alt="QR Code" class="qr-large" />
        <button @click="selectedQRCode = null" class="btn btn-primary">Close</button>
      </div>
    </div>

    <!-- Photo Preview Modal -->
    <div v-if="photoPreviewOpen" class="modal-overlay" @click="closePhotoPreview">
      <div class="modal-content photo-modal" @click.stop>
        <h2>Photo Preview</h2>
        <div class="photo-preview-meta">
          <div class="photo-preview-name">{{ photoPreviewPerson?.fullName || '' }}</div>
          <div class="photo-preview-id" v-if="photoPreviewPerson?.personnelID">ID: {{ photoPreviewPerson.personnelID }}</div>
        </div>
        <img
          :src="photoPreviewUrl"
          :alt="photoPreviewPerson?.fullName || 'Photo'"
          class="photo-large"
        />
        <div class="photo-modal-actions">
          <button @click="copyPhotoImage" class="btn btn-primary" :disabled="photoCopying || !photoPreviewUrl">
            {{ photoCopying ? 'Copying...' : 'Copy Image' }}
          </button>
          <button @click="copyPhotoLink" class="btn btn-outline" :disabled="!photoPreviewUrl">Copy Link</button>
          <button @click="openPhotoInNewTab" class="btn btn-outline" :disabled="!photoPreviewUrl">Open</button>
          <button @click="closePhotoPreview" class="btn btn-reset">Close</button>
        </div>
        <div v-if="photoCopyMessage" class="copy-message">{{ photoCopyMessage }}</div>
      </div>
    </div>

    <!-- Status History Modal -->
    <StatusHistoryModal
      :show="showHistoryModal"
      :personnelID="selectedPersonnelID"
      @close="closeHistoryModal"
    />

    <!-- ID Card Modal -->
    <IdCardView :idCard="selectedIdCard" @close="closeIdCard" />
  </div>
</template>

<script>
import { personnelAPI, eventTypes, getImageUrl, getInitials, loadRolesFromAPI, loadEventTypesFromAPI, roleAPI } from '@/services/api';
import PersonnelForm from '@/components/PersonnelForm.vue';
import StatusHistoryModal from '@/components/StatusHistoryModal.vue';
import IdCardView from '@/components/IdCardView.vue';

export default {
  name: 'PersonnelView',
  components: {
    PersonnelForm,
    StatusHistoryModal,
    IdCardView
  },
  data() {
    return {
      personnelList: [],
      loading: false,
      searchDebounceTimer: null,
      showAddForm: false,
      editingPersonnel: null,
      selectedQRCode: null,
      selectedIdCard: null,
      showHistoryModal: false,
      selectedPersonnelID: null,
      qrFixing: {},
      photoPreviewOpen: false,
      photoPreviewPerson: null,
      photoPreviewUrl: '',
      photoCopying: false,
      photoCopyMessage: '',
      searchQuery: '',
      filterRole: '',
      filterEventType: '',
      filterStatus: '',
      roleGroups: [],
      allRoles: [],
      showRoleMenu: false,
      hoveredRoleGroup: null,
      eventTypes: [],
      roleMenuCloseTimer: null
    };
  },
  async mounted() {
    // Add click outside listener for role menu
    document.addEventListener('click', this.handleClickOutside);
    
    // Load event types and roles from API
    try {
      // Load event types from API and assign to local reactive property
      const loaded = await loadEventTypesFromAPI();
      this.eventTypes = Array.isArray(loaded) ? loaded : eventTypes;
      const rolesResp = await roleAPI.getAll();
      if (rolesResp.data && rolesResp.data.success) {
        // Store grouped roles for nested menu
        this.roleGroups = rolesResp.data.grouped || [];
        // Flatten all roles for direct selection
        this.allRoles = rolesResp.data.roles.map(r => ({
          value: r.roleid,
          label: r.rolename,
          rolegroupid: r.rolegroupid
        }));
      }
    } catch (error) {
      console.warn('Failed to load roles from API:', error);
      // Fallback: try loadRolesFromAPI
      try {
        const loaded = await loadRolesFromAPI();
        this.allRoles = [...(loaded.roles || []), ...(loaded.officials || []), ...(loaded.committees || [])];
      } catch (e) {
        console.error('Failed to load fallback roles:', e);
      }
    }
  },
  computed: {
    hasActiveFilter() {
      const hasSearch = String(this.searchQuery || '').trim() !== '';
      return (
        hasSearch ||
        this.filterRole !== '' ||
        this.filterEventType !== '' ||
        this.filterStatus !== ''
      );
    },
    displayedPersonnelList() {
      // Apply client-side filters as safety net (backend may not filter correctly in some cases)
      let list = this.personnelList || [];

      // Role filter: match personnel whose roleid OR role equals the selected role
      if (this.filterRole !== '' && this.filterRole != null && this.filterRole !== undefined) {
        const roleStr = String(this.filterRole);
        if (!roleStr.startsWith('group_')) {
          const desiredRole = parseInt(roleStr, 10);
          if (!isNaN(desiredRole)) {
            list = list.filter((p) => {
              const rid = p.roleid != null ? parseInt(p.roleid, 10) : null;
              const r = p.role != null ? parseInt(p.role, 10) : null;
              return rid === desiredRole || r === desiredRole;
            });
          }
        }
      }

      // Event type filter
      if (this.filterEventType !== '' && this.filterEventType != null) {
        const desiredEvent = parseInt(this.filterEventType, 10);
        if (!isNaN(desiredEvent)) {
          list = list.filter((p) => parseInt(p.eventType, 10) === desiredEvent);
        }
      }

      // Status filter
      if (this.filterStatus !== '' && this.filterStatus != null && this.filterStatus !== undefined) {
        const desiredStatus = parseInt(this.filterStatus, 10);
        if (!isNaN(desiredStatus)) {
          list = list.filter((p) => parseInt(p.personnelStatus, 10) === desiredStatus);
        }
      }

      return list;
    },
    // number of records currently displayed (after filters/search)
    recordCount() {
      return this.displayedPersonnelList.length;
    }
  },
  beforeUnmount() {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    // Remove click outside listener
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    getInitials,
    onFilterChange() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      if (this.hasActiveFilter) this.loadPersonnel();
    },
    onSearchInput() {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.searchDebounceTimer = null;
        // Allow searching even if no other filters are selected
        if (this.hasActiveFilter) this.loadPersonnel();
      }, 300);
    },
    getRolesByGroup(rolegroupid) {
      const gid = rolegroupid != null ? Number(rolegroupid) : null;
      return this.allRoles.filter(r => r.rolegroupid != null && Number(r.rolegroupid) === gid);
    },
    // delay before closing role menu after mouse leaves
    startRoleCloseTimer() {
      if (this.roleMenuCloseTimer) clearTimeout(this.roleMenuCloseTimer);
      this.roleMenuCloseTimer = setTimeout(() => {
        this.closeRoleMenu();
        this.roleMenuCloseTimer = null;
      }, 3000); // 3 seconds
    },
    cancelRoleCloseTimer() {
      if (this.roleMenuCloseTimer) {
        clearTimeout(this.roleMenuCloseTimer);
        this.roleMenuCloseTimer = null;
      }
    },
    getSelectedRoleLabel() {
      if (!this.filterRole || this.filterRole === '') return '';
      const role = this.allRoles.find(r => r.value == this.filterRole);
      return role ? role.label : '';
    },
    selectRole(roleid) {
      this.filterRole = roleid;
      this.closeRoleMenu();
      this.onFilterChange();
    },
    closeRoleMenu() {
      // cancel any pending timer when closing immediately
      if (this.roleMenuCloseTimer) {
        clearTimeout(this.roleMenuCloseTimer);
        this.roleMenuCloseTimer = null;
      }
      this.showRoleMenu = false;
      this.hoveredRoleGroup = null;
    },
    handleClickOutside(event) {
      // Not needed for hover-based menu, but keeping for cleanup if needed
      const wrapper = event.target.closest('.filter-dropdown-wrapper');
      if (!wrapper && this.showRoleMenu) {
        this.closeRoleMenu();
      }
    },
    async loadPersonnel() {
      if (!this.hasActiveFilter) return;
      this.loading = true;
      try {
        const filters = {};
        if (this.searchQuery) filters.search = this.searchQuery;
        if (this.filterEventType !== '') filters.eventType = this.filterEventType;
        if (this.filterStatus !== '') filters.status = this.filterStatus;
        
        // Handle role filtering - check if it's a roleGroup or specific roleid
        if (this.filterRole !== '' && this.filterRole !== null && this.filterRole !== undefined) {
          const filterRoleStr = String(this.filterRole);
          if (filterRoleStr.startsWith('group_')) {
            // Filter by roleGroup
            const rolegroupid = parseInt(filterRoleStr.replace('group_', ''), 10);
            filters.roleGroup = rolegroupid;
          } else {
            // Filter by specific roleid
            filters.role = this.filterRole;
          }
        }

        const response = await personnelAPI.getAll(filters);
        this.personnelList = response.data;
      } catch (error) {
        console.error('Error loading personnel:', error);
        alert('Error loading personnel: ' + (error.response?.data?.error || error.message));
      } finally {
        this.loading = false;
      }
    },
    qrSrc(person) {
      const url = person?.qrcodeUrl;
      if (!url) return '';
      // Prefer data URLs (fast, reliable). Otherwise fall back to API/static URL.
      if (typeof url === 'string' && url.startsWith('data:')) return url;
      return getImageUrl(url);
    },
    async refreshPersonQr(personnelID) {
      if (!personnelID) return;
      if (this.qrFixing[personnelID]) return;

      this.qrFixing = { ...this.qrFixing, [personnelID]: true };
      try {
        const resp = await personnelAPI.getById(personnelID);
        const fresh = resp?.data;
        const freshQr = fresh?.qrcodeUrl;
        if (!freshQr) return;

        // Update the row in-place
        this.personnelList = (this.personnelList || []).map((p) => {
          if (p.personnelID !== personnelID) return p;
          return { ...p, qrcodeUrl: freshQr };
        });
      } catch (e) {
        // ignore
      } finally {
        const next = { ...this.qrFixing };
        delete next[personnelID];
        this.qrFixing = next;
      }
    },
    handleQrError(person) {
      // If a stored file path is broken, fetch a fresh QR data URL from backend.
      const id = person?.personnelID;
      if (!id) return;
      this.refreshPersonQr(id);
    },
    editPersonnel(personnel) {
      this.editingPersonnel = { ...personnel };
      this.showAddForm = true;
    },
    async deletePersonnel(personnelID) {
      if (!confirm('Are you sure you want to delete this personnel?')) {
        return;
      }
      try {
        await personnelAPI.delete(personnelID);
        alert('Personnel deleted successfully');
        this.loadPersonnel();
      } catch (error) {
        console.error('Error deleting personnel:', error);
        alert('Error deleting personnel: ' + (error.response?.data?.error || error.message));
      }
    },
    showQRCode(personnel) {
      this.selectedQRCode = personnel.qrcodeUrl;
    },
    openPhotoPreview(person) {
      if (!person || !person.pictureUrl) return;
      this.photoPreviewPerson = person;
      this.photoPreviewUrl = getImageUrl(person.pictureUrl, person.updated_at || person.created_at);
      this.photoPreviewOpen = true;
      this.photoCopyMessage = '';
    },
    closePhotoPreview() {
      this.photoPreviewOpen = false;
      this.photoPreviewPerson = null;
      this.photoPreviewUrl = '';
      this.photoCopying = false;
      this.photoCopyMessage = '';
    },
    async copyPhotoLink() {
      try {
        if (!this.photoPreviewUrl) return;
        if (!navigator.clipboard?.writeText) {
          this.photoCopyMessage = 'Copy not supported in this browser.';
          return;
        }
        await navigator.clipboard.writeText(this.photoPreviewUrl);
        this.photoCopyMessage = 'Copied image link.';
      } catch (e) {
        this.photoCopyMessage = 'Copy failed. Try “Open” then copy from new tab.';
      }
    },
    async copyPhotoImage() {
      try {
        if (!this.photoPreviewUrl) return;
        if (!navigator.clipboard?.write || typeof window.ClipboardItem === 'undefined') {
          await this.copyPhotoLink();
          return;
        }
        this.photoCopying = true;
        this.photoCopyMessage = '';

        const resp = await fetch(this.photoPreviewUrl, { mode: 'cors' });
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
        let blob = await resp.blob();

        const contentType = resp.headers.get('content-type') || blob.type || 'image/png';
        if (!String(contentType).startsWith('image/')) {
          blob = new Blob([blob], { type: 'image/png' });
        }

        await navigator.clipboard.write([new window.ClipboardItem({ [contentType]: blob })]);
        this.photoCopyMessage = 'Copied image to clipboard.';
      } catch (e) {
        this.photoCopyMessage = 'Copy image failed. Try “Copy Link” or “Open”.';
      } finally {
        this.photoCopying = false;
      }
    },
    openPhotoInNewTab() {
      if (!this.photoPreviewUrl) return;
      window.open(this.photoPreviewUrl, '_blank', 'noopener,noreferrer');
    },
    async viewIdCard(personnelID) {
      // redirect to Generate Files page, which will automatically print the card
      this.$router.push({ name: 'generate-files', query: { personnel: personnelID } });
    },
    viewHistory(personnelID) {
      this.selectedPersonnelID = personnelID;
      this.showHistoryModal = true;
    },
    closeHistoryModal() {
      this.showHistoryModal = false;
      this.selectedPersonnelID = null;
    },
    closeIdCard() {
      this.selectedIdCard = null;
    },
    handleSave() {
      this.closeForm();
      this.loadPersonnel();
    },
    closeForm() {
      this.showAddForm = false;
      this.editingPersonnel = null;
    },
    resetFilters() {
      this.filterRole = '';
      this.filterEventType = '';
      this.filterStatus = '';
      this.searchQuery = '';
      this.showRoleMenu = false;
      this.hoveredRoleGroup = null;
      this.personnelList = [];
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
    },
    getImageUrl
  }
};
</script>

<style scoped>
.personnel-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin: 0;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input,
.filter-select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  min-width: 150px;
}

.filter-dropdown-wrapper {
  position: relative;
  min-width: 150px;
}

.filter-dropdown-wrapper:hover .role-nested-menu {
  display: block;
}

.role-dropdown-btn {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}

.role-dropdown-btn:hover {
  border-color: #42b983;
}

.role-dropdown-btn:focus {
  outline: none;
  border-color: #42b983;
}

.dropdown-arrow {
  font-size: 10px;
  color: #666;
  margin-left: 8px;
}

.role-nested-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  margin-top: 2px;
  pointer-events: auto;
}

.role-group-item {
  position: relative;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.role-group-item:last-child {
  border-bottom: none;
}

.role-group-item:hover {
  background-color: #f5f5f5;
}

.role-group-label {
  font-weight: 600;
  color: #2c3e50;
}

.role-children-menu {
  position: absolute;
  left: 100%;
  top: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 220px;
  margin-left: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.role-child-item {
  padding: 8px 12px;
  cursor: pointer;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.role-child-item:hover {
  background-color: #e8f5e9;
  color: #2c3e50;
}

.role-child-item.selected {
  background-color: #c8e6c9;
  color: #2c3e50;
  font-weight: 600;
}

.role-child-item:last-child {
  border-bottom: none;
}

.choose-filter-message {
  padding: 48px 24px;
  text-align: center;
  color: #666;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 16px;
}

.choose-filter-message strong {
  color: #42b983;
}

.table-container {
  overflow-x: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.record-count {
  padding: 10px 15px;
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.personnel-table {
  width: 100%;
  border-collapse: collapse;
}

.personnel-table thead {
  background-color: #42b983;
  color: white;
}

.personnel-table th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
}

.personnel-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.personnel-table tbody tr:hover {
  background-color: #f5f5f5;
}

.profile-img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-img-clickable {
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.profile-img-clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.25);
}

.qr-img {
  width: 50px;
  height: 50px;
  cursor: pointer;
  transition: transform 0.2s;
}

.qr-img:hover {
  transform: scale(1.2);
}

.no-image {
  color: #999;
  font-size: 12px;
}

.initials-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #42b983 0%, #2c7a6d 100%);
  flex-shrink: 0;
}

.initials {
  color: white;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge {
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-in {
  background-color: #d4edda;
  color: #155724;
}

.status-out {
  background-color: #f8d7da;
  color: #721c24;
}

.loading,
.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
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

.btn-primary:hover {
  background-color: #35a372;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  margin-right: 5px;
}

.btn-edit {
  background-color: #17a2b8;
  color: white;
}

.btn-edit:hover {
  background-color: #138496;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}

.btn-delete:hover {
  background-color: #c82333;
}

.btn-view {
  background-color: #6c757d;
  color: white;
}

.btn-view:hover {
  background-color: #5a6268;
}

.btn-history {
  background-color: #6f42c1;
  color: white;
}

.btn-history:hover {
  background-color: #5a32a3;
}

.btn-reset {
  background-color: #ffc107;
  color: #212529;
  white-space: nowrap;
}

.btn-reset:hover {
  background-color: #e0a800;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.qr-modal {
  text-align: center;
}

.qr-large {
  width: 300px;
  height: 300px;
  margin: 20px 0;
}

.photo-modal {
  text-align: center;
  max-width: 760px;
}

.photo-preview-meta {
  margin: 8px 0 12px;
  color: #2c3e50;
}

.photo-preview-name {
  font-weight: 700;
}

.photo-preview-id {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.photo-large {
  width: 100%;
  max-width: 620px;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 10px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  margin: 10px 0 14px;
}

.photo-modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.btn-outline {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-outline:hover:not(:disabled) {
  background: #f1f5f9;
}

.copy-message {
  margin-top: 12px;
  font-size: 13px;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .filters {
    flex-direction: column;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .personnel-table {
    font-size: 12px;
  }

  .personnel-table th,
  .personnel-table td {
    padding: 8px;
  }
}
</style>
