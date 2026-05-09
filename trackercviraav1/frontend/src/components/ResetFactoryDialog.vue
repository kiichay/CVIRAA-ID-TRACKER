<template>
  <div class="reset-factory-modal" v-if="show" @click.self="cancel">
    <div class="reset-factory-modal-content" @click.stop>
      <div class="reset-factory-modal-header">
        <h2>Reset Factory - Delete Personnel Records</h2>
        <button class="close-btn" @click="cancel" :disabled="isProcessing">×</button>
      </div>

      <div class="reset-factory-modal-body">
        <!-- Warning Message -->
        <div class="warning-section">
          <div class="warning-icon">⚠️</div>
          <div class="warning-message">
            <strong>Warning:</strong> This will permanently delete all selected personnel records and profile pictures. 
            A backup PDF will be generated first.
          </div>
        </div>

        <!-- Role Filter Selection -->
        <div v-if="!isProcessing" class="filter-section">
          <label for="reset-role-filter" class="filter-label">Select Personnel to Delete:</label>
          <select 
            id="reset-role-filter" 
            v-model="selectedRoleFilter" 
            class="role-filter-select"
            @change="onFilterChange"
          >
            <option value="all">All Personnel</option>
            <optgroup v-for="group in roleGroups" :key="group.rolegroupid" :label="group.rolegroupname">
              <option :value="`roleGroup_${group.rolegroupid}`">
                All {{ group.rolegroupname }}
              </option>
              <option 
                v-for="role in getRolesByGroup(group.rolegroupid)" 
                :key="role.value"
                :value="`role_${role.value}`"
              >
                — {{ role.label }}
              </option>
            </optgroup>
          </select>
          <div class="filter-info">
            {{ getFilterDescription() }}
          </div>
        </div>

        <!-- Progress Indicator -->
        <div v-if="isProcessing" class="progress-section">
          <div class="spinner"></div>
          <div class="progress-message">{{ progressMessage }}</div>
        </div>

        <!-- Success/Error Message -->
        <div v-if="resultMessage" :class="['result-message', resultType]">
          {{ resultMessage }}
        </div>
        <div v-if="resultType === 'success' && backupFile" class="backup-file-info">
          <strong>Backup file:</strong> {{ backupFile }}
          <button @click="downloadBackup" class="btn btn-sm btn-link">Download PDF</button>
        </div>
      </div>

      <!-- Modal Footer with Buttons -->
      <div class="reset-factory-modal-footer">
        <button 
          @click="cancel" 
          class="btn btn-cancel"
          :disabled="isProcessing"
        >
          Cancel
        </button>
        <button 
          v-if="!isProcessing && !resultMessage"
          @click="confirmReset" 
          class="btn btn-danger"
        >
          Confirm & Reset
        </button>
        <button 
          v-if="resultMessage && resultType === 'success'"
          @click="cancel" 
          class="btn btn-primary"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { personnelAPI } from '@/services/api';

export default {
  name: 'ResetFactoryDialog',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    roleGroups: {
      type: Array,
      default: () => []
    },
    allRoles: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedRoleFilter: 'all',
      isProcessing: false,
      progressMessage: 'Generating backup PDF...',
      resultMessage: '',
      resultType: '', // 'success' or 'error'
      deletedCount: 0,
      backupFile: ''
    };
  },
  watch: {
    show(newVal) {
      if (!newVal) {
        // Reset state when dialog is closed
        this.selectedRoleFilter = 'all';
        this.isProcessing = false;
        this.progressMessage = 'Generating backup PDF...';
        this.resultMessage = '';
        this.resultType = '';
        this.deletedCount = 0;
      }
    }
  },
  methods: {
    getRolesByGroup(rolegroupid) {
      const gid = rolegroupid != null ? Number(rolegroupid) : null;
      return this.allRoles.filter(r => r.rolegroupid != null && Number(r.rolegroupid) === gid);
    },
    getFilterDescription() {
      if (this.selectedRoleFilter === 'all') {
        return 'All personnel records in the system will be deleted.';
      } else if (this.selectedRoleFilter.startsWith('roleGroup_')) {
        const groupId = parseInt(this.selectedRoleFilter.replace('roleGroup_', ''), 10);
        const group = this.roleGroups.find(g => g.rolegroupid === groupId);
        return `All personnel in the "${group?.rolegroupname || 'Unknown'}" role group will be deleted.`;
      } else if (this.selectedRoleFilter.startsWith('role_')) {
        const roleId = parseInt(this.selectedRoleFilter.replace('role_', ''), 10);
        const role = this.allRoles.find(r => r.value === roleId);
        return `All personnel with the "${role?.label || 'Unknown'}" role will be deleted.`;
      }
      return '';
    },
    onFilterChange() {
      // Update description when filter changes
      this.getFilterDescription();
    },
    async confirmReset() {
      if (!confirm('Are you absolutely sure? This action cannot be undone. A backup PDF will be created.')) {
        return;
      }

      this.isProcessing = true;
      this.resultMessage = '';
      this.resultType = '';
      this.progressMessage = 'Generating backup PDF...';

      try {
        // Build request payload
        const payload = {};
        
        if (this.selectedRoleFilter === 'all') {
          // Delete all - don't include role/roleGroup filters
        } else if (this.selectedRoleFilter.startsWith('roleGroup_')) {
          const groupId = parseInt(this.selectedRoleFilter.replace('roleGroup_', ''), 10);
          payload.roleGroup = groupId;
        } else if (this.selectedRoleFilter.startsWith('role_')) {
          const roleId = parseInt(this.selectedRoleFilter.replace('role_', ''), 10);
          payload.role = roleId;
        }

        // Update progress message
        this.progressMessage = 'Generating backup PDF and deleting records...';

        // Call backend API
        const response = await personnelAPI.resetFactory(payload);

        if (response.data.success) {
          this.deletedCount = response.data.deletedCount || 0;
          this.backupFile = response.data.backupFile || '';
          this.resultType = 'success';
          this.resultMessage = response.data.message || `${this.deletedCount} personnel records deleted successfully.`;
          
          // Emit success event so parent can refresh
          this.$emit('reset-success', {
            deletedCount: this.deletedCount,
            backupFile: response.data.backupFile
          });
        } else {
          this.resultType = 'error';
          this.resultMessage = 'Error: ' + (response.data.error || 'Failed to reset factory');
        }
      } catch (error) {
        console.error('Error during reset factory:', error);
        this.resultType = 'error';
        this.resultMessage = 'Error: ' + (error.response?.data?.error || error.message || 'Failed to reset factory');
      } finally {
        this.isProcessing = false;
      }
    },
    cancel() {
      if (this.isProcessing) {
        return; // Don't allow cancel while processing
      }
      this.$emit('close');
    },
    async downloadBackup() {
      if (!this.backupFile) return;
      
      try {
        const response = await personnelAPI.downloadBackupPDF(this.backupFile);
        
        // Create blob and download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', this.backupFile);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading backup:', error);
        alert('Failed to download backup PDF');
      }
    }
  }
};
</script>

<style scoped>
.reset-factory-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.reset-factory-modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reset-factory-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.reset-factory-modal-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover:not(:disabled) {
  background: #eee;
  color: #333;
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-factory-modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.warning-section {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-message {
  color: #856404;
  line-height: 1.5;
}

.warning-message strong {
  color: #721c24;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
}

.role-filter-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  font-family: inherit;
}

.role-filter-select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

.filter-info {
  margin-top: 8px;
  padding: 10px;
  background: #f0f7ff;
  border-left: 3px solid #0066cc;
  color: #0066cc;
  font-size: 13px;
  border-radius: 2px;
}

.progress-section {
  text-align: center;
  padding: 30px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-message {
  color: #666;
  font-size: 16px;
  font-weight: 500;
}

.result-message {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
  line-height: 1.5;
}

.result-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.backup-file-info {
  padding: 12px;
  background: #e7f3ff;
  border: 1px solid #b3d9ff;
  border-radius: 4px;
  color: #004085;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.btn-link {
  background: none;
  border: none;
  color: #0066cc;
  cursor: pointer;
  text-decoration: underline;
  padding: 2px 8px;
  font-size: 13px;
}

.btn-link:hover {
  color: #0052a3;
}

.reset-factory-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

.btn-cancel:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
}

.btn-primary {
  background: #42b983;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #35a372;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
}
</style>
