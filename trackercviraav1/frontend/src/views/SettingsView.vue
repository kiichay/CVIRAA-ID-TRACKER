<template>
  <div class="settings-view">
    <div class="header">
      <h1>Settings</h1>
      <p class="subtitle">System configuration and utilities</p>
    </div>

    <!-- Message Display -->
    <div v-if="message" :class="['message', message.type]">
      {{ message.text }}
    </div>

    <!-- Personnel Status Management -->
    <div class="settings-section">
      <div class="section-header">
        <h2>Personnel Status Management</h2>
      </div>
      <div class="section-card">
        <h3>Set All Personnel to OUT</h3>
        <p class="description">
          This action will change the status of all personnel who are currently IN to OUT.
          Personnel already marked as OUT will remain unchanged.
        </p>
        <div class="warning-box">
          <strong>⚠️ Important:</strong> This action will update all personnel records in the database.
          This cannot be easily undone. Please use with caution.
        </div>
        <div class="action-buttons">
          <button 
            @click="openSetAllOutConfirmation" 
            class="btn btn-danger"
            :disabled="settingAllOut"
          >
            {{ settingAllOut ? 'Processing...' : 'Set All to OUT' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cooldown Settings -->
    <div class="settings-section">
      <div class="section-header">
        <h2>IN/OUT Cooldown Settings</h2>
      </div>
      <div class="section-card">
        <h3>Cooldown Time</h3>
        <p class="description">
          Set the cooldown duration (in minutes) before personnel can switch between IN and OUT status.
          This prevents accidental double-scanning.
        </p>
        <div class="cooldown-input-group">
          <label for="cooldownInput" class="cooldown-label">Cooldown duration (minutes):</label>
          <div class="cooldown-input-wrapper">
            <input 
              id="cooldownInput"
              v-model.number="cooldownValue"
              type="number"
              class="cooldown-input"
              min="1"
              max="100000000"
              placeholder="1"
            />
            <span class="cooldown-unit">minutes</span>
          </div>
          <p class="cooldown-help-text">
            Default: 1 minute. Allowed range: 1 - 60 minutes.
          </p>
        </div>
        <div class="action-buttons">
          <button 
            @click="saveCooldownSettings"
            class="btn btn-primary"
            :disabled="loadingCooldown || cooldownValue === originalCooldownValue"
          >
            {{ loadingCooldown ? 'Saving...' : 'Save Cooldown Settings' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showSetAllOutConfirmation" class="confirmation-overlay">
      <div class="confirmation-dialog">
        <h2>Confirm Action</h2>
        <p class="confirmation-message">
          This will set all personnel with IN status to OUT. This action cannot be easily undone.
        </p>
        <p class="confirmation-instruction">
          Type <strong>SETALLOUT</strong> below to confirm:
        </p>
        <input 
          v-model="confirmationInput"
          type="text"
          class="confirmation-input"
          placeholder="Enter SETALLOUT"
          @keyup.enter="confirmationInput === 'SETALLOUT' && setAllPersonnelOutAfterConfirmation()"
        />
        <div class="confirmation-buttons">
          <button 
            @click="closeSetAllOutConfirmation" 
            class="btn btn-secondary"
            :disabled="settingAllOut"
          >
            Cancel
          </button>
          <button 
            @click="setAllPersonnelOutAfterConfirmation"
            class="btn btn-danger"
            :disabled="confirmationInput !== 'SETALLOUT' || settingAllOut"
          >
            {{ settingAllOut ? 'Processing...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Photo export moved to Generate Files view -->
  </div>
</template>

<script>
import { personnelAPI } from '@/services/api';

export default {
  name: 'SettingsView',
  data() {
    return {
      message: null,
      settingAllOut: false,
      showSetAllOutConfirmation: false,
      confirmationInput: '',
      cooldownValue: 1,
      originalCooldownValue: 1,
      loadingCooldown: false
    };
  },
  mounted() {
    this.fetchCooldownSettings();
  },
  methods: {
    async fetchCooldownSettings() {
      try {
        const response = await personnelAPI.getCooldownSettings();
        if (response.data && response.data.cooldownCount) {
          this.cooldownValue = response.data.cooldownCount;
          this.originalCooldownValue = response.data.cooldownCount;
        }
      } catch (error) {
        console.error('Error fetching cooldown settings:', error);
        // Use default value if fetch fails
        this.cooldownValue = 60;
        this.originalCooldownValue = 60;
      }
    },
    async saveCooldownSettings() {
      if (this.cooldownValue < 1 || this.cooldownValue > 60) {
        this.showMessage('Please enter a value between 1 and 60 minutes', 'error');
        return;
      }

      this.loadingCooldown = true;
      this.message = null;
      
      try {
        const response = await personnelAPI.updateCooldownSettings(this.cooldownValue);
        
        if (response.data && response.data.success) {
          this.originalCooldownValue = this.cooldownValue;
          this.showMessage(
            `Cooldown settings updated to ${this.cooldownValue} minute${this.cooldownValue !== 1 ? 's' : ''}`,
            'success'
          );
        } else {
          this.showMessage('Failed to update cooldown settings', 'error');
        }
      } catch (error) {
        console.error('Error saving cooldown settings:', error);
        this.showMessage(
          'Error: ' + (error.response?.data?.error || error.message),
          'error'
        );
      } finally {
        this.loadingCooldown = false;
      }
    },
    openSetAllOutConfirmation() {
      this.showSetAllOutConfirmation = true;
      this.confirmationInput = '';
    },
    closeSetAllOutConfirmation() {
      this.showSetAllOutConfirmation = false;
      this.confirmationInput = '';
    },
    async setAllPersonnelOutAfterConfirmation() {
      if (this.confirmationInput !== 'SETALLOUT') {
        this.showMessage('Please enter SETALLOUT to confirm', 'error');
        return;
      }
      this.closeSetAllOutConfirmation();
      this.setAllPersonnelOut();
    },
    async setAllPersonnelOut() {
      this.settingAllOut = true;
      this.message = null;
      
      try {
        const response = await personnelAPI.setAllPersonnelOutStatus();
        
        if (response.data && response.data.success) {
          this.showMessage(
            `Success! Updated ${response.data.changedCount} personnel from IN to OUT. ${response.data.unchangedCount} were already OUT.`,
            'success'
          );
        } else {
          this.showMessage('Operation completed', 'success');
        }
      } catch (error) {
        console.error('Error setting personnel status:', error);
        this.showMessage(
          'Error: ' + (error.response?.data?.error || error.message),
          'error'
        );
      } finally {
        this.settingAllOut = false;
      }
    },
    showMessage(text, type = 'info') {
      this.message = { text, type };
      setTimeout(() => {
        this.message = null;
      }, 5000);
    }
  }
};
</script>

<style scoped>
.settings-view {
  padding: 30px;
  max-width: 900px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  font-size: 32px;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 16px;
}

.message {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 500;
  animation: slideIn 0.3s ease-in-out;
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

.settings-section {
  margin-bottom: 30px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h2 {
  color: #2c3e50;
  font-size: 20px;
  border-bottom: 2px solid #42b983;
  padding-bottom: 8px;
}

.section-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #42b983;
}

.section-card h3 {
  color: #2c3e50;
  font-size: 18px;
  margin-bottom: 12px;
}

.cooldown-input-group {
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.cooldown-label {
  display: block;
  color: #2c3e50;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
}

.cooldown-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.cooldown-input {
  width: 150px;
  padding: 10px 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  transition: border-color 0.2s;
}

.cooldown-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.cooldown-unit {
  color: #666;
  font-weight: 500;
}

.cooldown-help-text {
  color: #999;
  font-size: 12px;
  margin: 0;
  font-style: italic;
}

.description {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.warning-box {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
  color: #856404;
  font-size: 14px;
}

.warning-box strong {
  display: block;
  margin-bottom: 4px;
}

/* Photo export moved to GenerateFilesView.vue */

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background-color: #42b983;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3a9b6f;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(66, 185, 131, 0.3);
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-in-out;
}

.confirmation-dialog {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease-in-out;
}

.confirmation-dialog h2 {
  color: #2c3e50;
  font-size: 20px;
  margin-bottom: 16px;
  margin-top: 0;
}

.confirmation-message {
  color: #555;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.confirmation-instruction {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.confirmation-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 20px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.confirmation-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.confirmation-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .settings-view {
    padding: 20px;
  }

  .header h1 {
    font-size: 24px;
  }

  .section-card {
    padding: 16px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .confirmation-dialog {
    width: 95%;
    padding: 20px;
  }

  .confirmation-buttons {
    flex-direction: column;
  }

  .confirmation-buttons .btn {
    width: 100%;
  }
}
</style>
