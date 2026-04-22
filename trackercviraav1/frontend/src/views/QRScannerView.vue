<template>
  <div class="qr-scanner-view-wrapper" :style="{ backgroundImage: `url(${Backgroundimage})` }">
  <div class="qr-scanner-view">
    <div class="scanner-container">
      <video
        class="scanner-container-bg-video"
        autoplay
        loop
        muted
        playsinline
        :src="scannerContainerBgVideoUrl"
        aria-hidden="true"
      />
      <div class="card-brand-header">
        <div class="brand">
          <div class="brand-text">
            <div class="brand-logos">
              <img
                class="brand-logo"
                :src="getImageUrl(logoPath)"
                alt="City logo"
                @error="handleLogoError"
              />
              <img class="cviraa-logo" :src="cviraaLogo" alt="CVIRAA logo" />
            </div>
            <div class="brand-title">CVIRAA Athlete Tracker System</div>
            <div class="brand-subtitle">QR Code Scanner</div>
          </div>
        </div>
        <div class="header-right">
          <div class="clock" aria-label="Current date and time">
            <video
              class="clock-video-bg"
              :src="clockBgVideoUrl"
              muted
              loop
              autoplay
              playsinline
              aria-hidden="true"
            />
            <div class="clock-time">{{ currentTime24 }}</div>
            <div class="clock-date">{{ currentDate }}</div>
          </div>
          <button
            v-if="modalMode"
            type="button"
            class="scanner-modal-close"
            aria-label="Close scanner"
            @click="$emit('close')"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Scanner In Section -->
      <div v-if="currentTab === 'in'" class="scanner-section scanner-in">
        <div class="scanner-main-content">
        <!-- ID Card Display (Below Scanner) -->
        <!-- Always show a default/empty card when no active scan -->
        <div class="id-card-inline" :key="idCard ? `card-in-${idCard.personnelID}` : 'default-card-in'">
          <!-- ID Card with Photo -->
          <div class="id-card-box">
            <video
              class="id-card-bg-video"
              autoplay
              loop
              muted
              playsinline
              :src="cardBgVideoUrl"
              aria-hidden="true"
            />
            <div class="id-card-photo-wrapper">
            <div class="photo-frame">
                <template v-if="idCard && idCard.pictureUrl">
                  <img
                    :src="getProfileImageUrl(idCard.pictureUrl)"
                    :alt="idCard.fullName"
                    class="id-photo"
                    @load="onPhotoLoad"
                  />
                </template>
                <template v-else-if="idCard">
                  <div class="initials-container">
                    <span class="initials">{{ getInitials(idCard.fullName) }}</span>
                  </div>
                </template>
                <template v-else>
                  <img
                    :src="scanPlaceholderImage"
                    alt="Scan placeholder"
                    class="id-scan-placeholder"
                  />
                </template>
                <!-- Corner Brackets -->
                <div class="corner-bracket top-left"></div>
                <div class="corner-bracket top-right"></div>
                <div class="corner-bracket bottom-left"></div>
                <div class="corner-bracket bottom-right"></div>
              </div>
            </div>

            <!-- Person Info: show card on first scan; empty frame when idle or after "Already in" -->
            <div class="id-person-info">
              <div class="id-name-gender">
                <template v-if="idCard && !alreadyIn">
                  <span class="id-person-name">{{ idCard.fullName }}</span>
                </template>
                <template v-else>
                  <div class="id-ready-marquee">
                    <div class="id-ready-marquee-inner">
                      <span class="id-ready-marquee-text">{{ readyMarqueeText }}</span>
                      <span class="id-ready-marquee-text" aria-hidden="true">{{ readyMarqueeText }}</span>
                    </div>
                  </div>
                </template>
              </div>
              <div class="id-person-role">{{ idCard && !alreadyIn ? idCard.roleName : '' }}</div>
              <div v-if="idCard && !alreadyIn && idCard.eventTypeName" class="id-person-event-type">{{ idCard.eventTypeName }}</div>
            </div>
          </div>
        </div>
        <!-- Unrecognized/Unauthorized alert (red background, white text) -->
        <div v-if="errorIn" class="scan-error-alert" role="alert">
          {{ errorIn }}
        </div>
        </div>

        <!-- ENTRY SCAN label inside a card -->
        <div class="history-side-panel-wrap">
          <div class="history-panel-label-card">
            <span class="history-panel-label">ENTRY SCAN</span>
          </div>
          <!-- History Side Panel (single person name only) -->
          <div class="history-side-panel">
            <div class="history-header">
              <h3>Scan History</h3>
              <button class="btn btn-outline" @click="openHistoryModal" :disabled="loadingHistory">
                Show all
              </button>
            </div>

            <div v-if="loadingHistory" class="loading-history">Loading...</div>
            <div v-else-if="!latestHistoryIn" class="no-history">No history found</div>
            <div v-else class="history-last-name">
              <span class="history-last-name-label">Last scanned</span>
              <span class="history-last-name-value">{{ latestHistoryIn.fullName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scanner Out Section -->
      <div v-if="currentTab === 'out'" class="scanner-section scanner-out">
        <div class="scanner-main-content">
        <!-- ID Card Display (Below Scanner) -->
        <!-- Always show a default/empty card when no active scan -->
          <div class="id-card-inline" :key="idCard ? `card-out-${idCard.personnelID}` : 'default-card-out'">
          <!-- ID Card with Photo -->
          <div class="id-card-box">
            <video
              class="id-card-bg-video"
              autoplay
              loop
              muted
              playsinline
              :src="cardBgVideoUrl"
              aria-hidden="true"
            />
            <div class="id-card-photo-wrapper">
              <div class="photo-frame">
                <template v-if="idCard && idCard.pictureUrl">
                  <img
                    :src="getProfileImageUrl(idCard.pictureUrl)"
                    :alt="idCard.fullName"
                    class="id-photo"
                    @load="onPhotoLoad"
                  />
                </template>
                <template v-else-if="idCard">
                  <div class="initials-container">
                    <span class="initials">{{ getInitials(idCard.fullName) }}</span>
                  </div>
                </template>
                <template v-else>
                  <img
                    :src="scanPlaceholderImage"
                    alt="Scan placeholder"
                    class="id-scan-placeholder"
                  />
                </template>
                <!-- Corner Brackets -->
                <div class="corner-bracket top-left"></div>
                <div class="corner-bracket top-right"></div>
                <div class="corner-bracket bottom-left"></div>
                <div class="corner-bracket bottom-right"></div>
              </div>
            </div>

            <!-- Person Info: show card on first scan; empty frame when idle or after "Already out" -->
            <div class="id-person-info">
              <div class="id-name-gender">
                <template v-if="idCard && !alreadyOut">
                  <span class="id-person-name">{{ idCard.fullName }}</span>
                </template>
                <template v-else>
                  <div class="id-ready-marquee">
                    <div class="id-ready-marquee-inner">
                      <span class="id-ready-marquee-text">{{ readyMarqueeText }}</span>
                      <span class="id-ready-marquee-text" aria-hidden="true">{{ readyMarqueeText }}</span>
                    </div>
                  </div>
                </template>
              </div>
              <div class="id-person-role">{{ idCard && !alreadyOut ? idCard.roleName : '' }}</div>
              <div v-if="idCard && !alreadyOut && idCard.eventTypeName" class="id-person-event-type">{{ idCard.eventTypeName }}</div>
            </div>
          </div>
        </div>
        <!-- Unrecognized/Unauthorized alert (red background, white text) -->
        <div v-if="errorOut" class="scan-error-alert" role="alert">
          {{ errorOut }}
        </div>
        </div>

        <!-- EXIT SCAN label inside a card -->
        <div class="history-side-panel-wrap">
          <div class="history-panel-label-card">
            <span class="history-panel-label">EXIT SCAN</span>
          </div>
          <!-- History Side Panel (single person name only) -->
          <div class="history-side-panel">
            <div class="history-header">
              <h3>Scan History</h3>
              <button class="btn btn-outline" @click="openHistoryModal" :disabled="loadingHistory">
                Show all
              </button>
            </div>

            <div v-if="loadingHistory" class="loading-history">Loading...</div>
            <div v-else-if="!latestHistoryOut" class="no-history">No history found</div>
            <div v-else class="history-last-name">
              <span class="history-last-name-label">Last scanned</span>
              <span class="history-last-name-value">{{ latestHistoryOut.fullName }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- History Modal (All In + Out) -->
  <div v-if="isHistoryModalOpen" class="modal-overlay" @click.self="closeHistoryModal">
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="All scan history">
      <div class="modal-header">
        <div class="modal-title">
          <h3>All Scan History</h3>
          <div class="modal-subtitle">
            Showing {{ filteredCombinedHistory.length }} record<span v-if="filteredCombinedHistory.length !== 1">s</span>
            <span v-if="filterStart || filterEnd"> (filtered)</span>
          </div>
        </div>
        <button class="modal-close" @click="closeHistoryModal" aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <div class="modal-filters">
          <div class="filter-row">
            <label class="filter-label">From</label>
            <input v-model="filterStart" type="datetime-local" class="filter-input" />
          </div>
          <div class="filter-row">
            <label class="filter-label">To</label>
            <input v-model="filterEnd" type="datetime-local" class="filter-input" />
          </div>
          <div class="filter-row">
            <label class="filter-label">Status</label>
            <select v-model="filterStatus" class="filter-input">
              <option value="all">All</option>
              <option value="in">In</option>
              <option value="out">Out</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-small btn-outline" @click="clearHistoryFilters" :disabled="!filterStart && !filterEnd">
              Clear
            </button>
          </div>
        </div>

        <div v-if="loadingHistory" class="loading-history">Loading...</div>
        <div v-else-if="filteredCombinedHistory.length === 0" class="no-history">No history found</div>
        <div v-else class="modal-table-container">
          <table class="history-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredCombinedHistory" :key="record._key">
                <td>
                  <span :class="['type-badge', record._scanType === 'in' ? 'type-in' : 'type-out']">
                    {{ record._scanType === 'in' ? 'In' : 'Out' }}
                  </span>
                </td>
                <td>{{ record.fullName }}</td>
                <td>{{ record.roleName }}</td>
                <td>{{ formatTimestamp(record.timestamp) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import Swal from 'sweetalert2';
import { personnelAPI, getServerTime, getImageUrl, getProfileImageUrl, getInitials } from '@/services/api';
import 'animate.css';

export default {
  name: 'QRScannerView',
  props: {
    modalMode: { type: Boolean, default: false },
    initialTab: { type: String, default: 'in', validator: (v) => ['in', 'out'].includes(v) }
  },
  emits: ['close'],
  data() {
    return {
      currentTab: 'in', // 'in' or 'out' - derived from route
      qrDataIn: '',
      qrDataOut: '',
      idCard: null,
      errorIn: null,
      errorOut: null,
      warningIn: null,
      warningOut: null,
      successIn: null,
      successOut: null,
      alreadyIn: false,
      alreadyOut: false,
      loading: false,
      activeSection: null, // 'in' or 'out' - tracks which section is currently processing
      historyIn: [],
      historyOut: [],
      loadingHistory: false,
      isHistoryModalOpen: false,
      filterStart: '',
      filterEnd: '',
      filterStatus: 'all',
      historyPreviewLimit: 5,
      logoPath: '/uploads/assetes/lapu2citylogo.png',
      currentTime24: '',
      currentDate: '',
      scanBuffer: '',
      scanLastInputAt: 0,
      scanListenerAttached: false,
      onGlobalKeydown: null,
      // Prevent rapid re-scans of the same QR (but allow different user immediately)
      lastScannedCode: '',
      lastScannedAt: 0,
      scanCooldownMs: 3000,
      clockInterval: null,
      serverTimeOffsetMs: null,
      serverTimeSyncInterval: null,
      cardHideTimeout: null,
      // Use backend-served assets under /uploads/assets
      cviraaLogo: getImageUrl('/uploads/assets/cviraaLogo.png'),
      Backgroundimage: getImageUrl('/uploads/assets/Backgroundimage.png'),
      scanPlaceholderImage: getImageUrl('/uploads/no-profiles.png'),

      // Idle marquee (no-scan state): one line that scrolls sideways
      readyPhrases: ['■■■■','PLACE YOUR ID','■■■■','SCAN HERE','■■■■','READY TO SCAN','■■■■'],

      // Video background for the ID card (softer than GIF, easier on the eyes)
      cardBgVideoUrl: require('@/assets/Video.mp4'),
      clockBgVideoUrl: require('@/assets/Video2.mp4'),
      scannerContainerBgVideoUrl: require('@/assets/Video3.mp4')
    };
  },
  computed: {
    limitedHistoryIn() {
      return (this.historyIn || []).slice(0, this.historyPreviewLimit);
    },
    limitedHistoryOut() {
      return (this.historyOut || []).slice(0, this.historyPreviewLimit);
    },
    /** Single most recent record for history panel (one at a time) */
    latestHistoryIn() {
      const list = this.historyIn || [];
      return list.length > 0 ? list[0] : null;
    },
    latestHistoryOut() {
      const list = this.historyOut || [];
      return list.length > 0 ? list[0] : null;
    },
    combinedHistory() {
      const withTypeIn = (this.historyIn || []).map((r) => ({
        ...r,
        _scanType: 'in',
        _key: `in-${r.statusHistoryId ?? r.timestamp ?? Math.random()}`
      }));
      const withTypeOut = (this.historyOut || []).map((r) => ({
        ...r,
        _scanType: 'out',
        _key: `out-${r.statusHistoryId ?? r.timestamp ?? Math.random()}`
      }));

      return [...withTypeIn, ...withTypeOut].sort((a, b) => {
        const at = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bt = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bt - at;
      });
    },
    filteredCombinedHistory() {
      return this.applyHistoryFilters(this.combinedHistory);
    },
    /** One line for the idle marquee (scrolls sideways) */
    readyMarqueeText() {
      return (this.readyPhrases || []).join('   ') + '   ';
    }
  },
  watch: {
    '$route.name': {
      immediate: true,
      handler() {
        if (this.modalMode) {
          this.loadHistory();
          return;
        }
        this.setTabFromRoute();
        this.loadHistory();
      }
    },
    initialTab: {
      handler(val) {
        if (!this.modalMode) return;
        const next = val === 'out' ? 'out' : 'in';
        if (this.currentTab !== next) {
          this.currentTab = next;
          this.resetStateForTab();
        }
        this.loadHistory();
      }
    }
  },
  mounted() {
    this.startClock();
    this.attachAutoScanListener();
    if (this.modalMode) {
      this.currentTab = this.initialTab === 'out' ? 'out' : 'in';
      this.resetStateForTab();
      this.loadHistory();
    }
  },
  beforeUnmount() {
    this.stopClock();
    this.detachAutoScanListener();
    this.cancelAutoHideCard();
  },
  methods: {
    scheduleAutoHideCard() {
      // Auto-hide the ID card after a short delay (no visible timer).
      this.cancelAutoHideCard();
      this.cardHideTimeout = setTimeout(() => {
        this.idCard = null;
        this.alreadyIn = false;
        this.alreadyOut = false;
      }, 5000);
    },
    cancelAutoHideCard() {
      if (this.cardHideTimeout) {
        clearTimeout(this.cardHideTimeout);
        this.cardHideTimeout = null;
      }
    },
    isTypingInInput(target) {
      const el = target;
      if (!el) return false;
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (el.isContentEditable) return true;
      return false;
    },
    attachAutoScanListener() {
      if (this.scanListenerAttached) return;
      this.scanListenerAttached = true;
      this.onGlobalKeydown = (e) => this.handleGlobalKeydown(e);
      window.addEventListener('keydown', this.onGlobalKeydown);
    },
    detachAutoScanListener() {
      if (!this.scanListenerAttached) return;
      if (this.onGlobalKeydown) {
        window.removeEventListener('keydown', this.onGlobalKeydown);
      }
      this.scanListenerAttached = false;
      this.onGlobalKeydown = null;
      this.scanBuffer = '';
    },
    setTabFromRoute() {
      const name = this.$route?.name;
      const nextTab = name === 'scanner-out' ? 'out' : 'in';
      if (this.currentTab !== nextTab) {
        this.currentTab = nextTab;
        this.resetStateForTab();
      } else {
        this.resetMessages();
      }
    },
    resetMessages() {
      this.errorIn = null;
      this.errorOut = null;
      this.warningIn = null;
      this.warningOut = null;
      this.successIn = null;
      this.successOut = null;
      this.alreadyIn = false;
      this.alreadyOut = false;
    },
    resetStateForTab() {
      this.resetMessages();
      this.idCard = null;
      this.activeSection = null;
      this.scanBuffer = '';
      this.cancelAutoHideCard();
    },
    handleGlobalKeydown(e) {
      // Don't capture while modal is open or while user is typing in form fields.
      if (this.isHistoryModalOpen) return;
      if (this.isTypingInInput(e.target)) return;
      if (this.loading) return;

      const now = Date.now();
      // If there's a long pause, treat it as a new scan sequence.
      if (this.scanLastInputAt && now - this.scanLastInputAt > 250) {
        this.scanBuffer = '';
      }
      this.scanLastInputAt = now;

      if (e.key === 'Enter') {
        const code = (this.scanBuffer || '').trim();
        this.scanBuffer = '';
        if (!code) return;

        // Cooldown: ignore same QR code for a few seconds
        const nowMs = Date.now();
        if (code === this.lastScannedCode && this.lastScannedAt && (nowMs - this.lastScannedAt) < this.scanCooldownMs) {
          e.preventDefault();
          return;
        }

        // Prevent accidental form submits / page scrolling
        e.preventDefault();
        if (this.currentTab === 'in') {
          this.scanQRIn(code);
        } else if (this.currentTab === 'out') {
          this.scanQROut(code);
        }
        return;
      }

      // Accept printable characters only.
      if (e.key && e.key.length === 1) {
        this.scanBuffer += e.key;
      }
    },
    handleLogoError() {
      // fallback to the more common spelling if the first path doesn't exist
      if (this.logoPath === '/uploads/assetes/lapu2citylogo.png') {
        this.logoPath = '/uploads/assets/lapu2citylogo.png';
      }
    },
    startClock() {
      this.stopClock();
      this.syncServerTime();
      this.serverTimeSyncInterval = setInterval(() => this.syncServerTime(), 60000);
      this.updateClock();
      this.clockInterval = setInterval(() => this.updateClock(), 1000);
    },
    stopClock() {
      if (this.clockInterval) {
        clearInterval(this.clockInterval);
        this.clockInterval = null;
      }
      if (this.serverTimeSyncInterval) {
        clearInterval(this.serverTimeSyncInterval);
        this.serverTimeSyncInterval = null;
      }
    },
    updateClock() {
      // Synchronized time: use server time so all laptops show the same clock (Asia/Manila)
      const opts = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
      const dateOpts = { year: 'numeric', month: '2-digit', day: '2-digit' };
      const tz = 'Asia/Manila';
      let now;
      if (this.serverTimeOffsetMs != null) {
        now = new Date(Date.now() + this.serverTimeOffsetMs);
        this.currentTime24 = now.toLocaleTimeString('en-PH', { ...opts, timeZone: tz });
        this.currentDate = now.toLocaleDateString('en-PH', { ...dateOpts, timeZone: tz });
      } else {
        now = new Date();
        this.currentTime24 = now.toLocaleTimeString(undefined, opts);
        this.currentDate = now.toLocaleDateString(undefined, dateOpts);
      }
    },
    async syncServerTime() {
      try {
        const res = await getServerTime();
        const serverUnix = res?.data?.unix;
        if (typeof serverUnix === 'number') {
          this.serverTimeOffsetMs = serverUnix - Date.now();
        }
      } catch (_) {
        this.serverTimeOffsetMs = null;
      }
    },
    openHistoryModal() {
      this.isHistoryModalOpen = true;
    },
    closeHistoryModal() {
      this.isHistoryModalOpen = false;
    },
    clearHistoryFilters() {
      this.filterStart = '';
      this.filterEnd = '';
      this.filterStatus = 'all';
    },
    normalizeFilterRange() {
      const start = this.filterStart ? new Date(this.filterStart).getTime() : null;
      const end = this.filterEnd ? new Date(this.filterEnd).getTime() : null;
      if (start !== null && Number.isNaN(start)) return { startMs: null, endMs: end };
      if (end !== null && Number.isNaN(end)) return { startMs: start, endMs: null };

      if (start !== null && end !== null && start > end) {
        return { startMs: end, endMs: start };
      }
      return { startMs: start, endMs: end };
    },
    applyHistoryFilters(records) {
      const { startMs, endMs } = this.normalizeFilterRange();
      const status = this.filterStatus || 'all';
      const shouldFilterTime = !!startMs || !!endMs;
      const shouldFilterStatus = status !== 'all';
      if (!shouldFilterTime && !shouldFilterStatus) return (records || []).slice();

      return (records || []).filter((r) => {
        if (shouldFilterStatus && r?._scanType && r._scanType !== status) return false;
        if (shouldFilterStatus && !r?._scanType) return false;
        if (!shouldFilterTime) return true;
        if (!r?.timestamp) return false;
        const t = new Date(r.timestamp).getTime();
        if (Number.isNaN(t)) return false;
        if (startMs !== null && t < startMs) return false;
        if (endMs !== null && t > endMs) return false;
        return true;
      });
    },
    async scanQRIn(scannedCode, bypassCooldown = false, disableBypassPopup = false) {
      const code = (scannedCode ?? this.qrDataIn).trim();
      if (!code) {
        this.errorIn = 'Please scan a QR code first.';
        return false;
      }

      // Track whether this scan successfully completed (useful for bypass notifications)
      this.lastScanSucceeded = false;

      // Cooldown: ignore same QR code for a few seconds (unless bypassing)
      if (!bypassCooldown) {
        const nowMs = Date.now();
        if (code === this.lastScannedCode && this.lastScannedAt && (nowMs - this.lastScannedAt) < this.scanCooldownMs) {
          return;
        }
      }

      this.loading = true;
      this.activeSection = 'in';
      this.errorIn = null;
      this.warningIn = null;
      this.successIn = null;
      this.alreadyIn = false;
      this.idCard = null;

      try {
        // Scan with status "In" - backend will handle duplicate check and save to history
        const response = await personnelAPI.scanQR(code, null, null, 1, bypassCooldown);
        console.debug('scanQRIn response', { bypassCooldown, response: response.data });
        
        if (response.data.success && response.data.personnel) {
          const personnel = response.data.personnel;
          this.lastScanSucceeded = true;
          
          // Check if status was changed or already the same
          if (response.data.statusChanged) {
            // Status changed successfully
            this.successIn = response.data.message || `${personnel.fullName} - Status changed successfully to "In"`;
          } else {
            // Duplicate scan (already in)
            this.alreadyIn = true;
          }
          // Only show ID card details on a real status change
          if (response.data.statusChanged) {
            await this.showIdCard(personnel.personnelID);
          } else {
            this.idCard = null;
          }
          
          // Reload history after every successful scan so new records appear
          await this.loadHistory();

          // Mark this code as recently scanned (cooldown)
          this.lastScannedCode = code;
          this.lastScannedAt = Date.now();
          
          // Clear messages after 5 seconds
          setTimeout(() => {
            this.successIn = null;
          }, 5000);
        }
      } catch (error) {
        this.lastScanSucceeded = false;
        console.error('Error scanning QR:', error);
        console.debug('scanQRIn error', { bypassCooldown, error: error.response?.data || error });
        // Cooldown between status changes (backend-enforced)
        if (error.response?.status === 429 && error.response?.data?.cooldownSecondsRemaining) {
          const remaining = error.response.data.cooldownSecondsRemaining;

          // If this was a bypass attempt and it still failed, show a clear message.
          if (bypassCooldown) {
            await Swal.fire({
              icon: 'error',
              title: 'Bypass failed',
              text: `Still on cooldown (${remaining}s remaining).`,
              showConfirmButton: false,
              timer: 1800
            });
          }

          // Only show bypass prompt if this is the first attempt (not a bypass retry)
          if (!disableBypassPopup) {
            await Swal.fire({
              icon: 'warning',
              title: 'Please wait',
              text: `PLEASE WAIT ${remaining}s — you can time OUT after cooldown`,
              showCancelButton: true,
              showConfirmButton: false,
              cancelButtonText: 'Cancel',
              allowOutsideClick: false,
              allowEscapeKey: false,
            });
          }

          // Clear ID card to show empty frame during cooldown (like "Already in/out")
          this.idCard = null;
          this.alreadyIn = false;
          this.lastScannedCode = code;
          this.lastScannedAt = Date.now();
          return;
        }
        // Handle duplicate status error (already in) - no history saved
        if (error.response?.status === 400 && error.response?.data?.message) {
          this.alreadyIn = true;
          this.idCard = null;
          Swal.fire({
            icon: 'warning',
            title: 'Already in',
            text: 'ALREADY LOG IN/OUT — Please time OUT first',
            showConfirmButton: false,
            timer: 2000
          });
          // Mark this code as recently scanned (cooldown) even on duplicate scan
          this.lastScannedCode = code;
          this.lastScannedAt = Date.now();
        } else {
          // Handle unrecognized/unauthorized errors
          const errorMessage = this.scanErrorDisplayMessage(error);
          this.errorIn = errorMessage;
          const status = error.response?.status;
          const hasPersonnel = error.response?.data?.personnel;
          if (status === 404 || status === 401 || (status === 400 && !hasPersonnel)) {
            Swal.fire({
              icon: 'error',
              title: 'Unrecognized/Unauthorized',
              text: 'QR code not recognized or unauthorized access',
              showConfirmButton: false,
              timer: 4000
            });
          }
        }
      } finally {
        // Always clear after scanning
        this.qrDataIn = '';
        this.loading = false;
        this.activeSection = null;
      }
    },

    async scanQROut(scannedCode, bypassCooldown = false, disableBypassPopup = false) {
      const code = (scannedCode ?? this.qrDataOut).trim();
      if (!code) {
        this.errorOut = 'Please scan a QR code first.';
        return;
      }

      // Cooldown: ignore same QR code for a few seconds (unless bypassing)
      if (!bypassCooldown) {
        const nowMs = Date.now();
        if (code === this.lastScannedCode && this.lastScannedAt && (nowMs - this.lastScannedAt) < this.scanCooldownMs) {
          return;
        }
      }

      this.loading = true;
      this.activeSection = 'out';
      this.errorOut = null;
      this.warningOut = null;
      this.successOut = null;
      this.alreadyOut = false;
      this.idCard = null;

      try {
        // Scan with status "Out" - backend will handle duplicate check and save to history
        const response = await personnelAPI.scanQR(code, null, null, 0, bypassCooldown);
        
        if (response.data.success && response.data.personnel) {
          const personnel = response.data.personnel;
          
          // Check if status was changed or already the same
          if (response.data.statusChanged) {
            // Status changed successfully
            this.successOut = response.data.message || `${personnel.fullName} - Status changed successfully to "Out"`;
          } else {
            // Duplicate scan (already out)
            this.alreadyOut = true;
          }
          // Only show ID card details on a real status change
          if (response.data.statusChanged) {
            await this.showIdCard(personnel.personnelID);
          } else {
            this.idCard = null;
          }
          
          // Reload history after every successful scan so new records appear
          await this.loadHistory();

          // Mark this code as recently scanned (cooldown)
          this.lastScannedCode = code;
          this.lastScannedAt = Date.now();
          
          // Clear messages after 5 seconds
          setTimeout(() => {
            this.successOut = null;
          }, 5000);
        }
      } catch (error) {
        console.error('Error scanning QR:', error);
        // Cooldown between status changes (backend-enforced)
        if (error.response?.status === 429 && error.response?.data?.cooldownSecondsRemaining) {
          const remaining = error.response.data.cooldownSecondsRemaining;

          // If this was a bypass attempt and it still failed, show a clear message.
          if (bypassCooldown) {
            await Swal.fire({
              icon: 'error',
              title: 'Bypass failed',
              text: `Still on cooldown (${remaining}s remaining).`,
              showConfirmButton: false,
              timer: 1800
            });
          }

          // Only show bypass prompt if this is the first attempt (not a bypass retry)
          if (!disableBypassPopup) {
            await Swal.fire({
              icon: 'warning',
              title: 'Please wait',
              text: `PLEASE WAIT ${remaining}s — you can time IN after cooldown`,
              showCancelButton: true,
              showConfirmButton: false,
              cancelButtonText: 'Cancel',
              allowOutsideClick: false,
              allowEscapeKey: false,
            });
          }

          // Clear ID card to show empty frame during cooldown (like "Already in/out")
          this.idCard = null;
          this.alreadyOut = false;
          this.lastScannedCode = code;
          this.lastScannedAt = Date.now();
          return;
        }
        // Handle duplicate status error (already out) - no history saved
        if (error.response?.status === 400 && error.response?.data?.message) {
          this.alreadyOut = true;
          this.idCard = null;
          Swal.fire({
            icon: 'warning',
            title: 'Already out',
            text: 'ALREADY LOG IN/OUT, PLEASE TIME IN FIRST',
            showConfirmButton: false,
            timer: 2000
          });
          // Mark this code as recently scanned (cooldown) even on duplicate scan
          this.lastScannedCode = code;
          this.lastScannedAt = Date.now();
        } else {
          // Handle unrecognized/unauthorized errors
          const errorMessage = this.scanErrorDisplayMessage(error);
          this.errorOut = errorMessage;
          const status = error.response?.status;
          const hasPersonnel = error.response?.data?.personnel;
          if (status === 404 || status === 401 || (status === 400 && !hasPersonnel)) {
            Swal.fire({
              icon: 'error',
              title: 'Unrecognized/Unauthorized',
              text: 'QR code not recognized or unauthorized access',
              showConfirmButton: false,
              timer: 4000
            });
          }
        }
      } finally {
        // Always clear after scanning
        this.qrDataOut = '';
        this.loading = false;
        this.activeSection = null;
      }
    },
    scanErrorDisplayMessage(error) {
      const status = error.response?.status;
      const hasPersonnel = error.response?.data?.personnel;
      if (status === 404 || status === 401 || (status === 400 && !hasPersonnel)) {
        return 'Unrecognized/Unauthorized';
      }
      return error.response?.data?.error || error.response?.data?.message || 'Unrecognized/Unauthorized';
    },
    async showIdCard(personnelID) {
      try {
        const response = await personnelAPI.getIdCard(personnelID);
        this.idCard = response.data.idCard;
        if (this.idCard) this.scheduleAutoHideCard();
      } catch (error) {
        console.error('Error loading ID card:', error);
        // Set error in the active section
        if (this.activeSection === 'in') {
          this.errorIn = 'Error loading ID card: ' + (error.response?.data?.error || error.message);
        } else if (this.activeSection === 'out') {
          this.errorOut = 'Error loading ID card: ' + (error.response?.data?.error || error.message);
        }
      }
    },
    
    closeIdCard() {
      this.idCard = null;
      this.cancelAutoHideCard();
    },
    
    onPhotoLoad() {
      // Photo loaded - animation handled by CSS
    },
    
    async loadHistory() {
      this.loadingHistory = true;
      try {
        // Load history for "In" status (status = 1)
        const historyInResponse = await personnelAPI.getAllHistory(1);
        this.historyIn = historyInResponse.data.history || [];
        
        // Load history for "Out" status (status = 0)
        const historyOutResponse = await personnelAPI.getAllHistory(0);
        this.historyOut = historyOutResponse.data.history || [];
      } catch (error) {
        console.error('Error loading history:', error);
        this.historyIn = [];
        this.historyOut = [];
      } finally {
        this.loadingHistory = false;
      }
    },
    
    getImageUrl,
    getProfileImageUrl,
    getInitials,
    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return '';
      // Date and time: e.g. "01/30/2026, 12:54:20"
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
  }
};
</script>

<style scoped>
/* Full viewport background wrapper */
.qr-scanner-view-wrapper {
  min-height: 100vh;
  width: 100%;
  background-size: cover;
  background-position: center;
}

.qr-scanner-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
}

.card-brand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 0px 0;
  padding: 10px 0 12px 0;
  border-bottom: 1px solid #eef0f2;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-logo {
  width: 84px;
  height: 84px;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.brand-logos {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 2px;
}

.cviraa-logo {
  width: 220px;
  height: auto;
  object-fit: contain;
}

.brand-title {
  font-weight: 800;
  color: #28a745;
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  color: #2c3e50;
  font-weight: 700;
  font-size: 14px;
  line-height: 1.2;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.clock {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  color: #2c3e50;
  padding: 12px 18px;
  border-radius: 12px;
  /* Glass effect: ~10% opacity + blur + shadow */
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.12);
  min-width: 160px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
  overflow: hidden;
}

.clock-video-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.2;
  z-index: 0;
  pointer-events: none;
  /* GPU acceleration for smoother playback */
  transform: translateZ(0);
  backface-visibility: hidden;
}

.clock-time,
.clock-date {
  position: relative;
  z-index: 1;
}

.scanner-modal-close {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  color: #2c3e50;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.scanner-modal-close:hover {
  background: #e0e0e0;
  color: #dc3545;
}

.clock-time {
  font-size: 48px;
  line-height: 1;
  letter-spacing: 0.5px;
}

.clock-date {
  font-size: 17px;
  font-weight: 700;
  color: #5b6773;
  line-height: 1.1;
}

.auto-scan-placeholder {
  /* Legacy spacer (reserved scan-preview space). Keep it inert. */
  display: none;
  height: 0;
  margin: 0;
  padding: 0;
}

.scanner-container {
  /* Semi-transparent main card over the background image */
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 30px;
  position: relative;
  overflow: hidden; /* contain subtle background animation */
}

/* Video background for the whole scanner box (header + card + history) */
.scanner-container-bg-video {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0.6;
  /* GPU acceleration for smoother playback */
  transform: translateZ(0);
  backface-visibility: hidden;
}

.scanner-container > .card-brand-header,
.scanner-container > .scanner-section {
  position: relative;
  z-index: 1;
}

@keyframes sportsFloat {
  0% {
    transform: translateY(12px) scale(1);
  }
  100% {
    transform: translateY(-12px) scale(1.03);
  }
}

.scanner-section {
  animation: fadeIn 0.3s ease-in;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.scanner-main-content {
  flex: 1;
  min-width: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scanner-section h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.scanner-in h2 {
  color: #28a745;
}

.scanner-out h2 {
  color: #dc3545;
}

.section-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}

.input-section {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.qr-input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.qr-input:focus {
  outline: none;
  border-color: #42b983;
}

/* QR scan error: Unrecognized/Unauthorized - red background, white text */
.scan-error-alert {
  margin-top: 12px;
  padding: 14px 18px;
  background-color: #b91c1c;
  color: #fff;
  text-align: center;
  font-weight: 600;
  font-size: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.error-message {
  display: none;
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

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #218838;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-message {
  display: none;
}

.info-message {
  display: none;
}

/* ID Card Display - New Design */
.id-card-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Reduce hardcoded top spacing so the card can sit higher */
  margin-top: 0;
  padding-top: 6px;
  border-top: 0;
  /* Smooth fade-in and scale-up animation */
  animation: cardFadeInScale 0.4s ease-out;
}

@keyframes cardFadeInScale {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Status Badge at Bottom */
.id-status-badge-wrapper {
  margin-top: 16px;
  margin-bottom: 0;
}

.id-status-badge {
  display: inline-block;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: transform 0.3s ease;
}

/* Pulse animation for status badge when card appears */
.badge-pulse {
  animation: badgePulse 0.6s ease-out;
}

@keyframes badgePulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.id-status-badge.status-in {
  background-color: #28a745;
  color: #ffffff;
}

.id-status-badge.status-out {
  background-color: #dc3545;
  color: #ffffff;
}

.id-status-badge.status-neutral {
  background-color: #6c757d;
  color: #ffffff;
}

/* ID Card Box */
.id-card-box {
  position: relative;
  background:rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 12px;
  padding: 28px;
  /* Enhanced shadow to make the card stand out */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(77, 70, 11, 0.32);
  min-width: 400px;
  width: 800px;
  max-width: 94%;
  /* Larger card to fit bigger picture and details */
  min-height: 450px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 32px;
}

/* Video as card background (behind photo and text) */
.id-card-bg-video {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  pointer-events: none;
  opacity: 0.1;
  /* GPU acceleration for smoother playback */
  transform: translateZ(0);
  backface-visibility: hidden;
}

.id-card-photo-wrapper,
.id-person-info {
  position: relative;
  z-index: 1;
}

.id-card-photo-wrapper {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.photo-frame {
  position: relative;
  /* Passport-style portrait aspect ratio (approx 3:4) */
  width: 320px;
  height: 425px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-frame .id-photo {
  width: 300px;
  height: 400px;
  border-radius: 8px;
  object-fit: cover;
  /* Smooth fade-in animation when photo loads */
  animation: photoFadeIn 0.5s ease-in;
}

.photo-frame .initials-container {
  width: 300px;
  height: 400px;
  border-radius: 8px;
  background: linear-gradient(135deg, #42b983 0%, #35a372 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: photoFadeIn 0.5s ease-in;
}

.photo-frame .id-scan-placeholder {
  width: 300px;
  height: 400px;
  border-radius: 8px;
  object-fit: contain;
  background: #f0f0f0;
  animation: photoFadeIn 0.5s ease-in;
}

.photo-frame .initials {
  font-size: 80px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

@keyframes photoFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.no-photo-placeholder {
  width: 300px;
  height: 400px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.face-icon {
  width: 60px;
  height: 60px;
  border: 3px solid #ccc;
  border-radius: 50%;
  position: relative;
}

.face-icon::after {
  content: '';
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 40px;
  border: 3px solid #ccc;
  border-radius: 0 0 40px 40px;
  border-top: none;
}

/* Corner Brackets */
.corner-bracket {
  position: absolute;
  width: 36px;
  height: 36px;
  border: 3px solid #ccc;
}

.corner-bracket.top-left {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
}

.corner-bracket.top-right {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
}

.corner-bracket.bottom-left {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
}

.corner-bracket.bottom-right {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
}

/* Person Info to the right of photo — bigger text */
.id-person-info {
  flex: 1;
  min-width: 0;
  margin-top: 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-height: 425px;
  /* Single font for name, role, and event type – change here to update all */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.id-name-gender {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: 0 0 8px;
  padding: 12px 16px;
 background: rgba(255, 255, 255, 0.15);
 backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #e6eaef;
  border-radius: 6px;
  max-width: 100%;
  font-style: normal;
  font-weight: 600;
}

.id-person-name {
  flex: 1 1 auto;
  font-size: 28px;
  font-weight: 700;
  color: #333;
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
  overflow-wrap: anywhere;
  text-align: center;
  line-height: 1.2;
}

/* Idle marquee: text scrolls sideways continuously */
.id-ready-marquee {
  overflow: hidden;
  width: 100%;
  display: flex;
  align-items: center;
}

.id-ready-marquee-inner {
  display: inline-flex;
  white-space: nowrap;
  animation: idReadyMarquee 25s linear infinite;
}

.id-ready-marquee-text {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  letter-spacing: 1px;
  padding-right: 3rem;
  flex-shrink: 0;
}

@keyframes idReadyMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.id-person-role {
  font-size: 24px;
  font-family: inherit;
  font-weight: 900;
  color: #555;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.id-person-event-type {
  font-size: 26px;
  font-family: inherit;
  font-weight: 900;
  color: #444;
  margin-top: -15px;
  letter-spacing: 0.5px;
}

/* Wrapper: label on top, Scan History card below (label is separate from card) */
.history-side-panel-wrap {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 380px;
}

/* Card that wraps ENTRY SCAN / EXIT SCAN text */
.history-panel-label-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  margin-top: 8px;
  margin-bottom: 12px;
  background: rgba(21, 189, 69, 0.56);
  border-radius: 8px;
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.91);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.4s ease;
  animation: history-label-card-enter 0.6s ease-out forwards;
}

/* Shine sweep: light reflection from bottom to top (like a sword catching light) */
.history-panel-label-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(255, 255, 255, 0.15) 35%,
    rgba(255, 255, 255, 0.5) 50%,
    rgba(255, 255, 255, 0.15) 65%,
    transparent 100%
  );
  pointer-events: none;
  animation: history-label-card-shine 4s ease-in-out infinite;
}

@keyframes history-label-card-enter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Shine sweep: moves from bottom to top */
@keyframes history-label-card-shine {
  0% { transform: translateY(120%); }
  100% { transform: translateY(-120%); }
}

.history-panel-label {
  font-size: 35px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #2c3e50;
  padding: 0;
  margin: 0;
}

.scanner-in .history-panel-label {
  color:rgb(255, 255, 255);
}

.scanner-out .history-panel-label {
  color: rgb(255, 255, 255);
}

.scanner-out .history-panel-label-card {
  background: #dc3545;
}

.history-side-panel {
  width: 380px;
  /* Glass effect to match clock card */
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  border: 2px solid rgba(255, 255, 255, 0.56);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18), 0 6px 14px rgba(0, 0, 0, 0.12);
  max-height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-top: 8px;
}

/* History panel: last scanned person name only */
.history-last-name {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0 0;
}

.history-last-name-label {
  font-size: 12px;
  font-weight: 900;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-last-name-value {
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.3;
  word-break: break-word;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.history-side-panel h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
  border-bottom: 2px solid #42b983;
  padding-bottom: 10px;
  flex: 1;
}

.modal-filters {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr 220px auto;
  gap: 10px;
  align-items: end;
}

.filter-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #2c3e50;
}

.filter-input {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  background: white;
}

.filter-input:focus {
  outline: none;
  border-color: #42b983;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-outline {
  background: transparent;
  border: 1px solid #cfd8dc;
  color: #2c3e50;
}

.btn-outline:hover:not(:disabled) {
  background: #eef2f5;
}

.btn-small {
  padding: 6px 10px;
  font-size: 12px;
}

.loading-history,
.no-history {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

.history-table-container {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  max-height: 100%;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.history-table thead {
  position: sticky;
  top: 0;
  background: rgba(66, 185, 131, 0.92);
  color: white;
  z-index: 1;
}

.history-table th {
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
}

.history-table td {
  padding: 8px 6px;
  border-bottom: 1px solid #e0e0e0;
  color: #555;
  font-size: 12px; /* smaller table content */
}

/* Keep timestamp readable and not squeezed */
.history-table td:nth-child(3) {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}

/* Allow long names to wrap instead of squeezing timestamp */
.history-table td:nth-child(1) {
  white-space: normal;
  overflow-wrap: anywhere;
}

.history-table tbody tr:hover {
  background-color: #f0f0f0;
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 2000;
}

.modal-card {
  width: min(1100px, 95vw);
  max-height: 90vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #eaeaea;
}

.modal-title h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.modal-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #777;
}

.modal-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  color: #555;
}

.modal-close:hover {
  background: #f5f5f5;
}

.modal-body {
  padding: 16px 18px 18px 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-table-container {
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.type-in {
  background: #d4edda;
  color: #155724;
}

.type-out {
  background: #f8d7da;
  color: #721c24;
}

@media (max-width: 1200px) {
  .scanner-section {
    flex-direction: column;
  }

  .history-side-panel-wrap {
    width: 100%;
  }

  .history-side-panel {
    width: 100%;
    max-height: none;
  }
}

/* Big monitor: scale up picture, time, and details */
@media (min-width: 1400px) {
  .clock {
    min-width: 200px;
    padding: 16px 24px;
    border-radius: 14px;
  }

  .cviraa-logo {
    width: 280px;
  }

  .brand-title {
    font-size: 16px;
  }

  .brand-logo {
    width: 96px;
    height: 96px;
  }

  .clock-time {
    font-size: 64px;
  }

  .clock-date {
    font-size: 22px;
  }

  /* ID Card - Big Monitor Adjustments */
  .id-status-badge {
    font-size: 16px;
    padding: 10px 28px;
  }

  .id-card-box {
    padding: 32px;
    min-width: 900px;
    width: 900px;
    min-height: 520px;
    gap: 36px;
  }

  .photo-frame {
    width: 380px;
    height: 505px;
  }

  .photo-frame .id-photo {
    width: 360px;
    height: 480px;
  }

  .photo-frame .id-scan-placeholder {
    width: 360px;
    height: 480px;
  }

  .no-photo-placeholder {
    width: 360px;
    height: 480px;
  }

  .corner-bracket {
    width: 40px;
    height: 40px;
  }

  .id-person-info {
    min-height: 505px;
  }

  .id-person-name {
    font-size: 32px;
  }

  .id-person-role {
    font-size: 28px;
  }

  .id-person-event-type {
    font-size: 30px;
  }
}

@media (max-width: 768px) {
  .input-section {
    flex-direction: column;
  }

  .modal-filters {
    grid-template-columns: 1fr;
  }

  /* ID Card - Small Screen Adjustments */
  .photo-frame {
    width: 240px;
    height: 320px;
  }

  .photo-frame .id-photo {
    width: 220px;
    height: 300px;
  }

  .photo-frame .id-scan-placeholder {
    width: 220px;
    height: 300px;
  }

  .no-photo-placeholder {
    width: 220px;
    height: 300px;
  }

  .id-card-box {
    padding: 20px;
    min-width: 320px;
    width: 100%;
    min-height: 360px;
    gap: 24px;
    flex-direction: row;
  }

  .id-person-info {
    min-height: 320px;
  }

  .id-person-name {
    font-size: 20px;
  }

  .id-person-role {
    font-size: 18px;
  }

  .id-person-event-type {
    font-size: 20px;
  }

  .id-name-gender {
    gap: 16px;
  }

  .page-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .clock {
    align-self: stretch;
  }

  .history-table {
    font-size: 12px;
  }

  .history-table th,
  .history-table td {
    padding: 8px 6px;
  }
}
</style>

<style>
/* Blurred backdrop when SweetAlert2 pop-up is open (Already in / Already out, etc.) */
.swal2-container {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
</style>