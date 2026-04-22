<template>
  <div class="id-card-modal" v-if="idCard" @click.self="close">
    <div class="id-card-container" @click.stop>
      <button class="close-btn" @click="close">×</button>
      <div class="id-card">
        <div class="id-card-header">
          <h2>CVIRAA Athlete ID Card</h2>
          <button class="print-btn" @click="printCard">Print</button>
        </div>
        <div class="id-card-body">
          <div class="photo-section">
            <div v-if="idCard.pictureUrl" class="photo-container">
              <img
                :src="getProfileImageUrl(idCard.pictureUrl, idCard.updated_at || idCard.issuedDate || Date.now())"
                :alt="idCard.fullName || 'Profile Photo'"
                class="id-photo"
              />
            </div>
            <div v-else class="photo-container initials-container">
              <span class="initials">{{ getInitials(idCard.fullName) }}</span>
            </div>
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="label">ID:</span>
              <span class="value">{{ idCard.personnelID }}</span>
            </div>
            <div class="info-row">
              <span class="label">Name:</span>
              <span class="value">{{ idCard.fullName }}</span>
            </div>
            <div class="info-row">
              <span class="label">Role:</span>
              <span class="value">{{ idCard.roleName }}</span>
            </div>
            <div class="info-row">
              <span class="label">Event:</span>
              <span class="value">{{ idCard.eventTypeName }}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span :class="['status-badge', idCard.personnelStatus === 1 ? 'status-in' : 'status-out']">
                {{ idCard.statusName }}
              </span>
            </div>
            <div v-if="idCard.issuedDate" class="info-row">
              <span class="label">Issued:</span>
              <span class="value">{{ formatDate(idCard.issuedDate) }}</span>
            </div>
          </div>
        </div>
        <div class="id-card-footer">
          <div class="qr-section">
            <img
              v-if="idCard.qrcodeUrl"
              :src="getImageUrl(idCard.qrcodeUrl)"
              alt="QR Code"
              class="qr-code"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getImageUrl, getProfileImageUrl, getInitials } from '@/services/api';
import { generatePrintableIdCardHTML } from '@/utils/idCardPrint';

export default {
  name: 'IdCardView',
  props: {
    idCard: {
      type: Object,
      default: null
    }
  },
  emits: ['close'],
  methods: {
    close() {
      this.$emit('close');
    },
    printCard() {
      // Instead of printing the modal itself, open a new window with the
      // two-column duplicate layout used elsewhere.
      if (!this.idCard) return;
      const html = generatePrintableIdCardHTML([this.idCard]);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        // fallback: inject into iframe if popup blocked
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        document.body.appendChild(iframe);
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
      } else {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    },
    getImageUrl,
    getProfileImageUrl,
    getInitials,
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString();
    }
  }
};
</script>

<style scoped>
.id-card-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.id-card-container {
  position: relative;
  max-width: 500px;
  width: 100%;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #000;
}

.id-card {
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  border: 3px solid #42b983;
}

.id-card-header {
  background: linear-gradient(135deg, #42b983 0%, #35a372 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.id-card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.id-card-body {
  padding: 25px;
  display: flex;
  gap: 20px;
}

.photo-section {
  flex-shrink: 0;
}

.id-photo {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
  border: 3px solid #42b983;
}

.photo-container {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 3px solid #42b983;
  overflow: hidden;
}

.initials-container {
  background: linear-gradient(135deg, #42b983 0%, #35a372 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.initials {
  font-size: 36px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.no-photo {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  border: 3px solid #ddd;
}

.print-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #fff;
  border: 1px solid #ccc;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
}

.print-btn:hover {
  background: #f9f9f9;
}

/* print styles - only show the card */
@media print {
  body * {
    visibility: hidden;
  }
  .id-card, .id-card * {
    visibility: visible;
  }
  .id-card {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    max-width: none;
    box-shadow: none;
    border: none;
  }
  .close-btn, .print-btn {
    display: none !important;
  }
  .id-card-modal {
    background: none !important;
  }
}

.info-section {
  flex: 1;
}

.info-row {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.label {
  font-weight: 600;
  color: #2c3e50;
  min-width: 80px;
  font-size: 14px;
}

.value {
  color: #666;
  font-size: 14px;
  flex: 1;
}

.status-badge {
  padding: 4px 12px;
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

.id-card-footer {
  padding: 20px;
  background: #f8f9fa;
  border-top: 2px solid #eee;
  text-align: center;
}

.qr-section {
  display: inline-block;
}

.qr-code {
  width: 150px;
  height: 150px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  padding: 10px;
}

@media (max-width: 600px) {
  .id-card-body {
    flex-direction: column;
    align-items: center;
  }

  .info-row {
    justify-content: space-between;
  }
}
</style>
