<template>
  <div class="personnel-form">
    <h2>{{ editing ? 'Edit Personnel' : 'Add New Personnel' }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>First Name *</label>
        <input
          v-model="formData.fname"
          type="text"
          required
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>Middle Name</label>
        <input
          v-model="formData.mname"
          type="text"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>Last Name *</label>
        <input
          v-model="formData.lname"
          type="text"
          required
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>Role Group *</label>
        <select
          v-model="selectedRoleGroupId"
          required
          class="form-select"
          @change="onRoleGroupChange"
        >
          <option value="">Select Role Group</option>
          <option v-for="g in roleGroups" :key="g.rolegroupid" :value="String(g.rolegroupid)">
            {{ g.rolegroupname }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Role *</label>
        <select
          v-model="formData.roleid"
          required
          class="form-select"
          :disabled="!selectedRoleGroupId"
        >
          <option value="">Select Role</option>
          <option v-for="role in filteredRoles" :key="role.value" :value="role.value">
            {{ role.label }}
          </option>
        </select>
      </div>

      <div v-if="isCommitteeGroup" class="form-group">
        <label>Role Type *</label>
        <select v-model="formData.roleType" required class="form-select" :disabled="!formData.roleid">
          <option value="">Select Role Type</option>
          <option v-for="opt in roleTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>Event Type<span v-if="isEventTypeRequired"> *</span></label>
        <select
          v-model="formData.eventType"
          :required="isEventTypeRequired"
          class="form-select"
          :disabled="!isEventTypeRequired"
        >
          <option value="">{{ isEventTypeRequired ? 'Select Event Type' : 'N/A (not required)' }}</option>
          <option v-for="event in eventTypes" :key="event.value" :value="event.value">
            {{ event.label }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Profile Picture</label>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileChange"
          class="form-input"
        />
        <div v-if="previewImage" class="image-preview">
          <img :src="previewImage" alt="Preview" />
        </div>
        <div v-if="formData.pictureUrl && !previewImage" class="image-preview">
          <img :src="getImageUrl(formData.pictureUrl, personnel?.updated_at || personnel?.created_at)" alt="Current" />
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Saving...' : (editing ? 'Update' : 'Create') }}
        </button>
        <button type="button" @click="$emit('cancel')" class="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>

    <!-- Crop/Edit Modal -->
    <div v-if="showCropModal" class="modal-overlay" @click.self="cancelCrop">
      <div class="modal">
        <div class="modal-header">
          <h3>Edit Photo</h3>
        </div>
        <div class="modal-body">
          <div class="crop-toolbar">
            <label class="crop-label">Size</label>
            <select v-model="selectedCropPresetId" class="form-select crop-select" @change="applyCropPreset">
              <option v-for="p in cropPresets" :key="p.id" :value="p.id">
                {{ p.label }}
              </option>
            </select>
          </div>
          <div class="cropper-wrapper">
            <img
              v-if="cropSrc"
              ref="cropperImage"
              :src="cropSrc"
              alt="Crop"
              class="cropper-image"
            />
          </div>
          <p class="modal-hint">Drag to reposition. Use the corners to zoom.</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" @click="saveCropped" :disabled="!cropSrc">
            Save Crop
          </button>
          <button type="button" class="btn btn-secondary" @click="cancelCrop">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { personnelAPI, roles, officials, committees, eventTypes, getImageUrl, loadRolesFromAPI, loadEventTypesFromAPI } from '@/services/api';
import Cropper from 'cropperjs/dist/cropper.esm.js';
import 'cropperjs/dist/cropper.css';

export default {
  name: 'PersonnelForm',
  props: {
    personnel: {
      type: Object,
      default: null
    }
  },
  emits: ['save', 'cancel'],
  data() {
    return {
      formData: {
        fname: '',
        mname: '',
        lname: '',
        roleid: '',
        role: '', // Keep for backward compatibility
        roleType: '',
        eventType: '',
        picture: null
      },
      previewImage: null,
      previewObjectUrl: null,
      saving: false,
      roles: [],
      allRoles: [], // Flat list (roleid/label/rolegroupid)
      groupedRoles: [], // From API: [{ rolegroupid, rolegroupname, roles: [{roleid, rolename}] }]
      selectedRoleGroupId: '',
      eventTypes,

      // cropper state
      showCropModal: false,
      cropSrc: null,
      cropObjectUrl: null,
      cropper: null,
      pendingOriginalFile: null,
      cropPresets: [
        // Passport size is commonly 35mm x 45mm => aspect ratio 35/45
        { id: 'passport', label: 'Passport (35×45)', aspectRatio: 35 / 45, output: { w: 420, h: 540 } },
        { id: '2x2', label: '2×2', aspectRatio: 1, output: { w: 512, h: 512 } },
        { id: '1x1', label: '1×1', aspectRatio: 1, output: { w: 256, h: 256 } }
      ],
      selectedCropPresetId: '2x2',
      previousPictureFile: null,
      previousPreviewImage: null,
      previousPreviewObjectUrl: null,
      // New picture chosen by user (used on submit so it isn't cleared by watcher when editing)
      pendingPictureFile: null
    };
  },
  computed: {
    editing() {
      return !!this.personnel;
    },
    selectedRoleGroupName() {
      const gid = String(this.selectedRoleGroupId || '');
      const g = (this.groupedRoles || []).find((x) => String(x.rolegroupid) === gid);
      return g?.rolegroupname || '';
    },
    isEventTypeRequired() {
      // Only Sports personnel needs eventType
      return String(this.selectedRoleGroupName).toLowerCase() === 'sports';
    },
    isCommitteeGroup() {
      return String(this.selectedRoleGroupName).toLowerCase() === 'committee';
    },
    // available roleType values for committee members
    roleTypeOptions() {
      return [
        'Chairman',
        'Chairperson',
        'Co-Chairperson',
        'Vice-Chairperson',
        'Division Sports Officer',
        'Technical & Legal Consultants',
        'Technical Assistant',
        'Training and Operations',
        'Member'
      ];
    },
    roleGroups() {
      return Array.isArray(this.groupedRoles) ? this.groupedRoles : [];
    },
    filteredRoles() {
      const groupId = String(this.selectedRoleGroupId || '');
      if (!groupId) return [];
      return (this.allRoles || []).filter((r) => String(r.rolegroupid) === groupId);
    }
  },
  async mounted() {
    // Load roles and event types from API
    try {
      await loadEventTypesFromAPI();
      const loaded = await loadRolesFromAPI();
      this.groupedRoles = loaded.grouped || [];

      // Build a flat list with rolegroupid so we can filter by roleGroup
      const flat = [];
      for (const g of this.groupedRoles) {
        const gid = g?.rolegroupid;
        const rolesArr = Array.isArray(g?.roles) ? g.roles : [];
        for (const r of rolesArr) {
          flat.push({ value: r.roleid, label: r.rolename, rolegroupid: gid });
        }
      }

      // Fallback if backend didn't return grouped for some reason
      this.allRoles = flat.length ? flat : [...(loaded.roles || []), ...(loaded.officials || []), ...(loaded.committees || [])];
      this.roles = loaded.roles || []; // Keep for backward compatibility if needed
    } catch (error) {
      console.warn('Failed to load roles from API, using fallback:', error);
      // Use fallback roles
      this.allRoles = [...roles, ...officials, ...committees];
      this.roles = roles;
    }
  },
  watch: {
    personnel: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          const roleId = newVal.roleid !== undefined && newVal.roleid !== null && newVal.roleid !== ''
            ? newVal.roleid
            : (newVal.role !== undefined && newVal.role !== null && newVal.role !== '' ? newVal.role : '');
          const roleGroupId = newVal.roleGroupId !== undefined && newVal.roleGroupId !== null
            ? newVal.roleGroupId
            : (newVal.rolegroupid !== undefined && newVal.rolegroupid !== null ? newVal.rolegroupid : null);

          // When switching to a different person, clear pending new picture; when same person, keep it
          const isSamePersonnel = this.personnel && newVal.personnelID === this.personnel.personnelID;
          if (!isSamePersonnel) this.pendingPictureFile = null;

          this.formData = {
            fname: newVal.fname || '',
            mname: newVal.mname || '',
            lname: newVal.lname || '',
            roleid: roleId,
            role: newVal.role !== undefined ? newVal.role : '', // Keep for backward compatibility
            roleType: newVal.roleType || '',
            eventType: newVal.eventType !== undefined && newVal.eventType !== null && newVal.eventType !== '' ? newVal.eventType : '',
            picture: isSamePersonnel && this.pendingPictureFile instanceof File ? this.pendingPictureFile : null,
            pictureUrl: newVal.pictureUrl || null
          };

          // Set Role Group from personnel first (so it shows when editing), then fallback to lookup from allRoles
          if (roleGroupId !== null && roleGroupId !== undefined && roleGroupId !== '') {
            this.selectedRoleGroupId = String(roleGroupId);
          } else {
            const match = (this.allRoles || []).find((r) => String(r.value) === String(roleId));
            this.selectedRoleGroupId = match?.rolegroupid !== undefined && match?.rolegroupid !== null ? String(match.rolegroupid) : '';
          }
        } else {
          this.resetForm();
        }
      }
    }
  },
  methods: {
    onRoleGroupChange() {
      // When group changes, force user to pick a role from that group
      this.formData.roleid = '';
      // Keep old-structure fallback empty too
      this.formData.role = '';
      this.formData.roleType = '';
      // Clear eventType when not Sports
      if (!this.isEventTypeRequired) {
        this.formData.eventType = '';
      }
    },
    revokeObjectUrl(url) {
      try {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        // ignore
      }
    },
    destroyCropper() {
      if (this.cropper) {
        try {
          this.cropper.destroy();
        } catch (e) {
          // ignore
        }
        this.cropper = null;
      }
    },
    resetForm() {
      this.formData = {
        fname: '',
        mname: '',
        lname: '',
        roleid: '',
        role: '',
        roleType: '',
        eventType: '',
        picture: null
      };
      this.selectedRoleGroupId = '';
      this.pendingPictureFile = null;
      this.destroyCropper();
      this.showCropModal = false;

      this.revokeObjectUrl(this.previewObjectUrl);
      this.revokeObjectUrl(this.cropObjectUrl);
      this.previewImage = null;
      this.previewObjectUrl = null;
      this.cropSrc = null;
      this.cropObjectUrl = null;
      this.pendingOriginalFile = null;
    },
    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        // Save previous state in case user cancels crop
        this.previousPictureFile = this.formData.picture;
        this.previousPreviewImage = this.previewImage;
        this.previousPreviewObjectUrl = this.previewObjectUrl;

        // Clear current preview to avoid confusion while cropping
        this.previewImage = null;
        this.previewObjectUrl = null;

        this.pendingOriginalFile = file;
        this.openCropModalFromFile(file);
      }
    },
    openCropModalFromFile(file) {
      // Cleanup any previous crop session
      this.destroyCropper();
      this.revokeObjectUrl(this.cropObjectUrl);

      // Default preset on each new selection
      this.selectedCropPresetId = '2x2';

      this.cropObjectUrl = URL.createObjectURL(file);
      this.cropSrc = this.cropObjectUrl;
      this.showCropModal = true;

      this.$nextTick(() => {
        const img = this.$refs.cropperImage;
        if (!img) return;

        const preset = this.cropPresets.find((p) => p.id === this.selectedCropPresetId) || this.cropPresets[0];
        this.cropper = new Cropper(img, {
          viewMode: 1,
          dragMode: 'move',
          aspectRatio: preset?.aspectRatio ?? 1,
          autoCropArea: 1,
          responsive: true,
          background: false,
          guides: true,
          center: true,
          highlight: false
        });
      });
    },
    applyCropPreset() {
      if (!this.cropper) return;
      const preset = this.cropPresets.find((p) => p.id === this.selectedCropPresetId);
      if (!preset) return;
      if (typeof this.cropper.setAspectRatio === 'function') {
        this.cropper.setAspectRatio(preset.aspectRatio);
      }
    },
    async saveCropped() {
      if (!this.cropper) return;

      const preset = this.cropPresets.find((p) => p.id === this.selectedCropPresetId) || this.cropPresets[0];
      const canvas = this.cropper.getCroppedCanvas({
        width: preset?.output?.w ?? 512,
        height: preset?.output?.h ?? 512,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      if (!canvas) return;

      const originalName = this.pendingOriginalFile?.name || 'profile.jpg';
      const safeBase = originalName.replace(/\.[^/.]+$/, '');
      const filename = `${safeBase}-cropped.jpg`;

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          'image/jpeg',
          0.9
        );
      });

      if (!blob) return;

      const croppedFile = new File([blob], filename, { type: 'image/jpeg' });
      this.pendingPictureFile = croppedFile;
      this.formData.picture = croppedFile;

      // Update preview using object URL (fast, no base64 bloat)
      this.revokeObjectUrl(this.previewObjectUrl);
      this.previewObjectUrl = URL.createObjectURL(croppedFile);
      this.previewImage = this.previewObjectUrl;

      this.closeCropModal(true);
    },
    closeCropModal(clearFileInput = false) {
      this.showCropModal = false;
      this.destroyCropper();
      this.revokeObjectUrl(this.cropObjectUrl);
      this.cropSrc = null;
      this.cropObjectUrl = null;
      this.pendingOriginalFile = null;

      if (clearFileInput && this.$refs.fileInput) {
        // allow selecting the same file again to re-crop
        this.$refs.fileInput.value = '';
      }
    },
    cancelCrop() {
      // Restore previous state
      this.pendingPictureFile = this.previousPictureFile || null;
      this.formData.picture = this.previousPictureFile || null;
      this.previewImage = this.previousPreviewImage || null;
      this.previewObjectUrl = this.previousPreviewObjectUrl || null;

      this.previousPictureFile = null;
      this.previousPreviewImage = null;
      this.previousPreviewObjectUrl = null;

      this.closeCropModal(true);
    },
    async handleSubmit() {
      this.saving = true;
      try {
        const formData = new FormData();
        formData.append('fname', this.formData.fname);
        formData.append('lname', this.formData.lname);
        // Always send middle name so backend can clear it when the field is emptied
        formData.append('mname', this.formData.mname ?? '');
        // Send roleid (new structure) if available, otherwise fallback to role (old structure)
        if (this.formData.roleid !== '' && this.formData.roleid !== null && this.formData.roleid !== undefined) {
          formData.append('roleid', this.formData.roleid);
        } else if (this.formData.role !== '' && this.formData.role !== null && this.formData.role !== undefined) {
          formData.append('role', this.formData.role);
        }
        if (this.isCommitteeGroup && this.formData.roleType) {
          formData.append('roleType', this.formData.roleType);
        } else {
          // send empty to clear on update if switching out of Committee
          formData.append('roleType', '');
        }
        // Always send eventType so backend can clear it when the user removes it
        formData.append('eventType', this.formData.eventType ?? '');
        
        // Use pendingPictureFile when set (user chose new picture) so update always sends the file
        const fileToSend = this.pendingPictureFile instanceof File ? this.pendingPictureFile : this.formData.picture;
        if (fileToSend) {
          formData.append('picture', fileToSend);
        }

        if (this.editing) {
          await personnelAPI.update(this.personnel.personnelID, formData);
          alert('Personnel updated successfully!');
        } else {
          await personnelAPI.create(formData);
          alert('Personnel created successfully!');
        }

        this.$emit('save');
        this.resetForm();
      } catch (error) {
        console.error('Error saving personnel:', error);
        alert('Error saving personnel: ' + (error.response?.data?.error || error.message));
      } finally {
        this.saving = false;
      }
    },
    getImageUrl
  }
};
</script>

<style scoped>
.personnel-form {
  width: 100%;
}

.personnel-form h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #2c3e50;
  font-weight: 600;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #42b983;
}

.image-preview {
  margin-top: 10px;
}

.image-preview img {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #ddd;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 9999;
}

.modal {
  width: min(900px, 100%);
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.modal-header {
  padding: 14px 18px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.modal-body {
  padding: 14px 18px;
}

.crop-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.crop-label {
  font-weight: 600;
  color: #2c3e50;
}

.crop-select {
  width: auto;
  min-width: 220px;
}

.cropper-wrapper {
  width: 100%;
  height: 420px;
  background: #f6f6f6;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
}

.cropper-image {
  display: block;
  max-width: 100%;
}

.modal-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #6c757d;
}

.modal-actions {
  padding: 14px 18px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
