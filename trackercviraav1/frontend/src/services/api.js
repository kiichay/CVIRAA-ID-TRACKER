import axios from 'axios';

// API base URL: use .env VUE_APP_API_URL when set (e.g. http://10.20.11.107:3000/api), otherwise local
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// When sending FormData, do not set Content-Type so the browser sets multipart/form-data with boundary
api.interceptors.request.use((config) => {
  if (config.data && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Server time — same for all devices so clocks stay synchronized
export const getServerTime = () => api.get('/time');

// Personnel API
export const personnelAPI = {
  // Get all personnel with optional filters
  getAll: (filters = {}) => {
    return api.get('/personnel', { params: filters });
  },

  // Get single personnel by ID
  getById: (personnelID) => {
    return api.get(`/personnel/${personnelID}`);
  },

  // Create new personnel (FormData; Content-Type is cleared by interceptor so boundary is set)
  create: (formData) => {
    return api.post('/personnel', formData);
  },

  // Update personnel (FormData; Content-Type is cleared by interceptor so boundary is set)
  update: (personnelID, formData) => {
    return api.put(`/personnel/${personnelID}`, formData);
  },

  // Delete personnel
  delete: (personnelID) => {
    return api.delete(`/personnel/${personnelID}`);
  },

  // Get ID card data
  getIdCard: (personnelID) => {
    return api.get(`/personnel/${personnelID}/id-card`);
  },

  // Get status history for a personnel
  getHistory: (personnelID) => {
    return api.get(`/personnel/${personnelID}/history`);
  },

  // Get all status history records with optional filters
  // filters: { status, dateFrom, dateTo, eventType, role, search, limit }
  getAllHistory: (statusOrFilters = null) => {
    let params = {};
    // Support old signature (status only) or new filters object
    if (statusOrFilters !== null && typeof statusOrFilters === 'object') {
      params = { ...statusOrFilters };
    } else if (statusOrFilters !== null && statusOrFilters !== undefined) {
      params.status = statusOrFilters;
    }
    return api.get('/personnel/history/all', { params });
  },

  // Export Time IN/OUT History as Excel (backend generates .xlsx)
  // filters: { date (required), eventType, role, search }
  exportTimeInOutExcel: (filters) => {
    return api.get('/personnel/history/export-excel', {
      params: filters,
      responseType: 'blob'
    });
  },

  // Export Personnel Status list as Excel (includes header/logo)
  // filters: { status, role, roleGroup, eventType, search }
  exportPersonnelStatusExcel: (filters = {}) => {
    return api.get('/personnel/export-status-excel', {
      params: filters,
      responseType: 'blob'
    });
  },

  // Export individual personnel time in/out report as Excel
  // personnelID: the ID of the person to export
  // filters: { date } (optional date; if not provided, shows all history)
  exportIndividualTimeInOut: (personnelID, filters = {}) => {
    return api.get(`/personnel/${personnelID}/time-inout-report`, {
      params: filters,
      responseType: 'blob'
    });
  },

  // Verify personnel using QR code data or manual ID + last name
  // status: 0 = Out, 1 = In (optional)
  // bypassCooldown: boolean (optional) to allow status change even if cooldown is active
  scanQR: (qrData, personnelID, sname, status = null, bypassCooldown = false) => {
    // If qrData is provided, send it; otherwise send personnelID and sname
    const payload = {};
    if (qrData) {
      payload.qrData = qrData;
    } else {
      payload.personnelID = personnelID;
      payload.sname = sname;
    }
    // Add status if provided
    if (status !== null && status !== undefined) {
      payload.status = status;
    }
    // Allow bypassing the cooldown check (server must opt in)
    if (bypassCooldown) {
      payload.bypassCooldown = true;
    }
    return api.post('/personnel/scan', payload);
  },

  // Set all IN personnel to OUT status
  setAllPersonnelOutStatus: () => {
    return api.put('/personnel/set-all-out');
  }
};

// Event types - loaded from API (event_types table), fallback below
const eventTypesFallback = [
  { value: 0, label: 'Archery' },
  { value: 1, label: 'Arnis' },
  { value: 2, label: 'Athletics(Intellectual)' },
  { value: 3, label: 'Athletics(Track&Field)' },
  { value: 4, label: 'Athletics(Visual)' },
  { value: 5, label: 'Badminton' },
  { value: 6, label: 'Baseball' },
  { value: 7, label: 'Basketball' },
  { value: 8, label: 'Billiard' },
  { value: 9, label: 'BOCCE(Intellectual)' },
  { value: 10, label: 'Boxing' },
  { value: 11, label: 'Chess' },
  { value: 12, label: 'Dancesport' },
  { value: 13, label: 'Football' },
  { value: 14, label: 'Futsal' },
  { value: 15, label: 'Gymnastics (Aerobic)' },
  { value: 16, label: 'Gymnastics (Mens Artistic)' },
  { value: 17, label: 'Gymnastics (Rhythmic)' },
  { value: 18, label: 'Gymnastics (Womens Artistic)' },
  { value: 19, label: 'Lawn Tennis' },
  { value: 20, label: 'Sepak Takraw' },
  { value: 21, label: 'Softball' },
  { value: 22, label: 'Special Events BOCCE' },
  { value: 23, label: 'Swimming' },
  { value: 24, label: 'Table Tennis' },
  { value: 25, label: 'Taekwondo' },
  { value: 26, label: 'Volleyball' }
];

// Sort event types by label alphabetically (case-insensitive)
function sortEventTypesByLabel(arr) {
  return [...arr].sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }));
}

export let eventTypes = sortEventTypesByLabel(eventTypesFallback);

// Event Types API
export const eventTypesAPI = {
  getAll: () => api.get('/event-types')
};

// Load event types from API and update exported eventTypes (mutates in place, sorted alphabetically)
export async function loadEventTypesFromAPI() {
  try {
    const response = await eventTypesAPI.getAll();
    if (response.data && response.data.success && Array.isArray(response.data.eventTypes) && response.data.eventTypes.length > 0) {
      // Normalize backend event type objects to { value, label }
      const normalized = response.data.eventTypes.map((e) => ({
        value: e.eventTypeID != null ? Number(e.eventTypeID) : (e.value != null ? Number(e.value) : null),
        label: e.label || e.name || ''
      })).filter(it => it.value !== null && it.label !== '');

      eventTypes.length = 0;
      eventTypes.push(...sortEventTypesByLabel(normalized));
      return eventTypes;
    }
  } catch (error) {
    console.warn('Failed to load event types from API, using fallback:', error);
  }
  eventTypes.length = 0;
  eventTypes.push(...sortEventTypesByLabel(eventTypesFallback));
  return eventTypes;
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats')
};

// Cooldown API
export const cooldownAPI = {
  // Get cooldown settings
  getSettings: () => api.get('/cooldown/settings'),
  
  // Update cooldown settings
  updateSettings: (cooldownCount) => api.post('/cooldown/settings', { cooldownCount })
};

// Add methods to personnelAPI for cooldown
personnelAPI.getCooldownSettings = () => api.get('/cooldown/settings');
personnelAPI.updateCooldownSettings = (cooldownCount) => api.post('/cooldown/settings', { cooldownCount });

// Roles - will be fetched from API, but keep fallback for backward compatibility
export let roles = [
  { value: 0, label: 'Student' },
  { value: 1, label: 'Coach' },
  { value: 2, label: 'Trainer' }
];

// Officials mapping (role values 3–4) - fallback
export let officials = [
  { value: 3, label: 'Mayor' },
  { value: 4, label: 'Councilor' }
];

// Committee mapping (role values 5–7) - fallback
export let committees = [
  { value: 5, label: 'IT' },
  { value: 6, label: 'Religion' },
  { value: 7, label: 'Technical' }
];

// Role Groups API
export const roleGroupAPI = {
  getAll: () => {
    return api.get('/rolegroups');
  }
};

// Roles API
export const roleAPI = {
  getAll: () => {
    return api.get('/roles');
  }
};

// Function to load roles from API and update exports
export async function loadRolesFromAPI() {
  try {
    const response = await roleAPI.getAll();
    if (response.data && response.data.success && response.data.grouped) {
      // Update roles based on roleGroup
      const grouped = response.data.grouped;
      const sportsGroup = grouped.find(g => g.rolegroupname === 'Sports');
      const officialsGroup = grouped.find(g => g.rolegroupname === 'Officials');
      const committeeGroup = grouped.find(g => g.rolegroupname === 'Committee');
      
      if (sportsGroup) {
        roles = sportsGroup.roles.map(r => ({ value: r.roleid, label: r.rolename }));
      }
      if (officialsGroup) {
        officials = officialsGroup.roles.map(r => ({ value: r.roleid, label: r.rolename }));
      }
      if (committeeGroup) {
        committees = committeeGroup.roles.map(r => ({ value: r.roleid, label: r.rolename }));
      }
      
      return { roles, officials, committees, grouped };
    }
  } catch (error) {
    console.warn('Failed to load roles from API, using fallback:', error);
  }
  return { roles, officials, committees, grouped: [] };
}

// Utility function to get full image URL
// Static files are served at /uploads (not /api/uploads), so we remove /api from base URL
export function getImageUrl(url, cacheKey = null) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  // Remove /api from API_BASE_URL to get the base server URL for static files
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  const fullUrl = `${baseUrl}${url}`;

  if (cacheKey === null || cacheKey === undefined || cacheKey === '') {
    return fullUrl;
  }

  const encoded = encodeURIComponent(String(cacheKey));
  return fullUrl.includes('?') ? `${fullUrl}&v=${encoded}` : `${fullUrl}?v=${encoded}`;
}

// Get profile image URL with default fallback to City of Lapulapu logo
export function getProfileImageUrl(pictureUrl, cacheKey = null, defaultImage = '../backend/uploads/assets/logo.png') {
  if (pictureUrl) {
    return getImageUrl(pictureUrl, cacheKey);
  }
  return defaultImage;
}

// Generate initials from a full name
// - For Visitor role: V + full last name (e.g., "Visitor 12" → "V12")
// - For others: first letter of first and last name (e.g., "John Ong" → "JO")
export function getInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  
  const names = fullName.trim().split(/\s+/);
  if (names.length === 0) return '';
  
  const firstName = names[0];
  
  // Special case for Visitor role: V + full last name (e.g., "Visitor 12" → "V12")
  if (firstName.toLowerCase() === 'visitor' && names.length > 1) {
    const lastName = names.slice(1).join('');
    return 'V' + lastName;
  }
  
  // Standard case: first letter of first and last name
  const lastName = names[names.length - 1];
  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastInitial = lastName.charAt(0).toUpperCase();
  
  return firstInitial + lastInitial;
}

export default api;
