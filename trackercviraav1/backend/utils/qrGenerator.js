const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * Generate QR code for personnel
 * @param {Object} personnelData - Personnel data object
 * @param {number} personnelData.personnelID - Personnel ID
 * @param {string} personnelData.fname - First name
 * @param {string} personnelData.mname - Middle name (optional)
 * @param {string} personnelData.lname - Last name
 * @param {number} personnelData.role - Role (0=Student, 1=Coach, 2=Trainer, 3=Official-Mayor, 4=Official-Councilor, 5=Committee-IT, 6=Committee-Religion, 7=Committee-Technical)
 * @param {string} format - Output format: 'dataURL' or 'file' (default: 'dataURL')
 * @returns {Promise<string>} - QR code data URL or file path
 */
async function generatePersonnelQR(personnelData, format = 'dataURL') {
  try {
    // Create QR code data payload - include personnelID and sname (last name); use raw string so Ñ and Unicode are preserved
    const lname = personnelData.lname || personnelData.sname || '';
    const qrData = JSON.stringify({
      personnelID: personnelData.personnelID,
      sname: lname
    });

    if (format === 'file') {
      // Generate QR code as file
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'qrcodes');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `qrcode-${personnelData.personnelID}-${Date.now()}.png`;
      const filepath = path.join(uploadsDir, filename);

      await QRCode.toFile(filepath, qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return `uploads/qrcodes/${filename}`;
    } else {
      // Generate QR code as data URL
      const dataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return dataURL;
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Get role name from role number
 * @param {number} role - Role number (0=Student, 1=Coach, 2=Trainer, 3=Official-Mayor, 4=Official-Councilor, 5=Committee-IT, 6=Committee-Religion, 7=Committee-Technical)
 * @returns {string} - Role name
 */
function getRoleName(role) {
  const roleMap = {
    0: 'Student',
    1: 'Coach',
    2: 'Trainer',
    3: 'Mayor',
    4: 'Councilor',
    5: 'IT',
    6: 'Religion',
    7: 'Technical'
  };
  return roleMap[role] ?? 'Unknown';
}

/**
 * Get event type name from type number
 * @param {number} eventType - Event type number
 * @returns {string} - Event type name
 */
function getEventTypeName(eventType) {
  // For Officials/Committee we store eventType as NULL; show blank instead of "Unknown"
  if (eventType === null || eventType === undefined || `${eventType}` === '') return '';
  const eventMap = {
    0: 'Archery',
    1: 'Arnis',
    2: 'Athletics(Intellectual)',
    3: 'Athletics(Track&Field)',
    4: 'Athletics(Visual)',
    5: 'Badminton',
    6: 'Baseball',
    7: 'Basketball',
    8: 'Billiard',
    9: 'BOCCE(Intellectual)',
    10: 'Boxing',
    11: 'Chess',
    12: 'Dancesport',
    13: 'Football',
    14: 'Futsal',
    15: 'Gymnastics (Aerobic)',
    16: 'Gymnastics (Mens Artistic)',
    17: 'Gymnastics (Rhythmic)',
    18: 'Gymnastics (Womens Artistic)',
    19: 'Lawn Tennis',
    20: 'Sepak Takraw',
    21: 'Softball',
    22: 'Special Events BOCCE',
    23: 'Swimming',
    24: 'Table Tennis',
    25: 'Taekwondo',
    26: 'Volleyball'
  };
  return eventMap[eventType] || 'Unknown';
}

/**
 * Get status name from status number
 * @param {number} status - Status number (0=Out, 1=In)
 * @returns {string} - Status name
 */
function getStatusName(status) {
  const statusMap = {
    0: 'Out',
    1: 'In'
  };
  return statusMap[status] || 'Unknown';
}

/**
 * Decode QR code data
 * @param {string} qrDataString - QR code data string (JSON with personnelID and sname)
 * @returns {Object} - Decoded personnel data with personnelID and sname
 */
function decodeQRData(qrDataString) {
  try {
    const text = String(qrDataString || '').trim();
    if (!text) return null;

    // 1) Try parsing as JSON (new format with personnelID and sname)
    try {
      // Use first line only in case scanner adds extra text (e.g. "Cabansay" on next line)
      const firstLine = text.split(/\r?\n/)[0].trim();
      const jsonStr = firstLine || text;
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.personnelID !== undefined) {
        return {
          personnelID: parseInt(parsed.personnelID, 10),
          sname: parsed.sname || ''
        };
      }
    } catch (e) {
      // Try extracting JSON object from text (e.g. " {...} extra" or "prefix {...}")
      const jsonMatch = text.match(/\{[^{}]*"personnelID"[^{}]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && parsed.personnelID !== undefined) {
            return {
              personnelID: parseInt(parsed.personnelID, 10),
              sname: parsed.sname || ''
            };
          }
        } catch (e2) {
          // fall through to legacy
        }
      }
    }

    // 2) Legacy format used by some scanners, e.g.
    // `personnelID`?2`name`?`John Vincent Ong`role`?1...
    let personnelID = null;
    let sname = '';

    // Extract ID after the word personnelID
    const idMatch = text.match(/personnelID[^0-9]*(\d+)/i);
    if (idMatch && idMatch[1]) {
      personnelID = parseInt(idMatch[1], 10);
    }

    // Extract full name from a `name`?`Full Name` pattern, take last word as surname
    const nameMatch = text.match(/name[`'"]?\s*[?:=]\s*`?([^`]+)`?/i);
    if (nameMatch && nameMatch[1]) {
      const fullName = nameMatch[1].trim();
      const parts = fullName.split(/\s+/);
      sname = parts[parts.length - 1] || '';
    }

    if (personnelID && !isNaN(personnelID)) {
      return { personnelID, sname };
    }

    // 3) Old simple format: just a number
    const numericID = parseInt(text, 10);
    if (!isNaN(numericID)) {
      return { personnelID: numericID };
    }

    return null;
  } catch (error) {
    console.error('Error decoding QR data:', error);
    return null;
  }
}

module.exports = {
  generatePersonnelQR,
  getRoleName,
  getEventTypeName,
  getStatusName,
  decodeQRData
};

