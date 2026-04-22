<template>
  <div class="history-modal" v-if="show" @click.self="close">
    <div class="history-modal-content" @click.stop>
      <div class="history-modal-header">
        <h2>Status History</h2>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="history-modal-body">
        <div v-if="loading" class="loading">Loading history...</div>
        <div v-else-if="history.length === 0" class="no-data">No history found</div>
        <div v-else class="history-list">
          <div
            v-for="record in history"
            :key="record.statusHistoryId"
            class="history-item"
          >
            <div class="history-status">
              <span :class="['status-badge', record.status === 1 ? 'status-in' : 'status-out']">
                {{ record.statusName }}
              </span>
            </div>
            <div class="history-timestamp">
              {{ formatTimestamp(record.timestamp) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { personnelAPI } from '@/services/api';

export default {
  name: 'StatusHistoryModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    personnelID: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      history: [],
      loading: false
    };
  },
  watch: {
    show(newVal) {
      if (newVal && this.personnelID) {
        this.loadHistory();
      }
    },
    personnelID() {
      if (this.show && this.personnelID) {
        this.loadHistory();
      }
    }
  },
  methods: {
    async loadHistory() {
      if (!this.personnelID) return;
      
      this.loading = true;
      try {
        const response = await personnelAPI.getHistory(this.personnelID);
        this.history = response.data.history || [];
      } catch (error) {
        console.error('Error loading history:', error);
        alert('Error loading history: ' + (error.response?.data?.error || error.message));
        this.history = [];
      } finally {
        this.loading = false;
      }
    },
    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString();
    },
    close() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.history-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.history-modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.history-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background-color: #42b983;
  color: white;
  border-radius: 8px 8px 0 0;
}

.history-modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.history-modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.loading,
.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #42b983;
  transition: background-color 0.2s;
}

.history-item:hover {
  background: #e9ecef;
}

.history-status {
  flex: 1;
}

.history-timestamp {
  color: #666;
  font-size: 14px;
  margin-left: 15px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  display: inline-block;
}

.status-in {
  background-color: #d4edda;
  color: #155724;
}

.status-out {
  background-color: #f8d7da;
  color: #721c24;
}

@media (max-width: 600px) {
  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .history-timestamp {
    margin-left: 0;
  }
}
</style>
