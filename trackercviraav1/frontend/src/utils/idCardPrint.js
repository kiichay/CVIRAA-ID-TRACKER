// Utility for generating printable ID card HTML in a 2-column duplicate layout.
// Shared between GenerateFilesView and IdCardView.

import { getInitials } from '@/services/api';

// Map role names to their background design filenames
function getBackgroundImageByRole(roleName, roleGroupName) {
  // If role belongs to a Committee group always use management template
  if (roleGroupName && String(roleGroupName).toLowerCase().includes('committee')) {
    return 'management.png';
  }

  const roleLower = (roleName || '').toLowerCase().trim();
  
  if (roleLower.includes('assrcoach') || roleLower.includes('assistant coach')) {
    return 'asstcoach.png';
  } else if (roleLower.includes('athlete')) {
    return 'athlete.png';
  } else if (roleLower.includes('chaperon') || roleLower.includes('chaperone')) {
    return 'chaperon.png';
  } else if (roleLower.includes('coach') && !roleLower.includes('assistant')) {
    return 'coach.png';
  } else {
    // Default for management, officials
    return 'management.png';
  }
}

export function generatePrintableIdCardHTML(personnel, allRoles = []) {
  const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api';
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  const frontBaseUrl = window.location.origin;

  // Group personnel into pages of 2, but print each one twice per row:
  // Row 1: ID1 | ID1
  // Row 2: ID2 | ID2
  const peoplePerPage = 2;
  const pages = [];
  for (let i = 0; i < personnel.length; i += peoplePerPage) {
    pages.push(personnel.slice(i, i + peoplePerPage));
  }

  let pagesHTML = '';
  const renderCard = (person) => {
    if (!person) return '<div class="id-card id-card-empty"></div>';

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
    const roleIdForDisplay = person.role != null && person.role !== '' ? Number(person.role) : person.roleid;
    const roleName =
      (allRoles.find((r) => r.value === roleIdForDisplay)?.label) || person.roleName || '';
    const eventTypeName = person.eventTypeName || '';
    const roleType = person.roleType || '';

    // Get background image based on role
    const backgroundFilename = getBackgroundImageByRole(roleName, person.rolegroupname);
    const idBgUrl = `${baseUrl}/assets/${backgroundFilename}`;
    // For management templates we'll show the committee role instead of the
    // event type.  The helper returns "management.png" for those roles.
    const isManagement = backgroundFilename === 'management.png';
    const committeeLabel = roleName + (roleType ? ' - ' + roleType : '');

    // Officials (rolegroupid=3) should use roleType as their display label.
    const infoText = isOfficial
      ? (roleType || roleName || eventTypeName)
      : (isManagement ? committeeLabel : eventTypeName);

    // Allow customizing the city label per-person (e.g. for visitors) if the
    // API provides a city/location field, otherwise fall back to the default.
    const cityText = person.city || person.location || 'Lapu - Lapu City';
    const isVisitor = person.roleid === 45;
    const isOfficial = Number(person?.rolegroupid) === 3 || String(person?.rolegroupname || '').toLowerCase().includes('official');
    const isCleanGreen = person.roleid === 49;

    const nameLength = fullName.length;
    // adjust sizes for longer names to keep them from pushing content;
    // thresholds lowered so that names shrink sooner and are more readable
    const nameClass =
      nameLength > 45 ? 'id-name id-name-xxl' :
      nameLength > 30 ? 'id-name id-name-xl' :
      nameLength > 20 ? 'id-name id-name-long' :
      'id-name';

    // Insert line break after EMERGENCY for long disaster text
    // and apply special break for Athlete Management Team labels
    let displayText = infoText;
    if (displayText) {
      const textUpper = displayText.toUpperCase();
      if (textUpper.includes('EMERGENCY') && textUpper.includes('RESPONSE')) {
        // Replace EMERGENCY RESPONSE with EMERGENCY<br/>RESPONSE (case-insensitive)
        displayText = displayText.replace(/EMERGENCY\s+RESPONSE/gi, 'EMERGENCY<br/>RESPONSE');
      }
      if (/^athlete management team\s*-\s*/i.test(displayText)) {
        displayText = displayText.replace(/^(Athlete Management Team\s*-\s*)(.*)$/i,
          '$1<br/><span class="large">$2</span>');
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

    // class names for the info line, same logic as in GenerateFilesView
    let infoClass = 'id-event-type';
    if (isManagement) {
      infoClass += ' management';
      
      // Special role overrides: check these first before shrink/tiny logic
      // Accommodation and Billeting: larger font for better visibility
      if (roleIdForDisplay === 6 || (displayText && displayText.toUpperCase().includes('ACCOMMODATION AND BILLETING'))) {
        infoClass += ' accommodation-billeting';
      }
      // Discipline and Religion: larger font for long text
      if (roleIdForDisplay === 10 || (displayText && displayText.toUpperCase().includes('DISCIPLINE AND RELIGION'))) {
        infoClass += ' discipline-religion';
      }

      // Food and Nutrition: custom font + spacing
      if (roleIdForDisplay === 12 || (displayText && displayText.toUpperCase().includes('FOOD AND NUTRITION'))) {
        infoClass += ' food-nutrition';
      }

      // Clean and Green (roleid = 49)
      if (roleIdForDisplay === 49 || (displayText && displayText.toUpperCase().includes('CLEAN AND GREEN'))) {
        infoClass += ' clean-green';
      }

      // Transportation, Safety and Security: smaller font + line break
      if (roleIdForDisplay === 20 || (displayText && /transportation\s*,?\s*safety\s*and\s*security/i.test(displayText))) {
        infoClass += ' transportation-security';
      }
      
      // shrink for long labels or very long names
      if (nameClass.includes('xl') || nameClass.includes('xxl') || committeeLabel.length > 25) {
        infoClass += ' shrink';
      }
    }

    return `
          <div class="id-card">
            <div class="id-card-background" style="background-image: url('${idBgUrl}');">
              <div class="id-card-content">
                <div class="id-photo-container">
                  ${
                    // For Visitor role (roleid 45): show initials instead of photo
                    person.roleid === 45
                      ? `<div class="id-photo-placeholder visitor-initials">${getInitials(fullName)}</div>`
                      : photoUrl
                        ? `<img src="${photoUrl}" alt="${fullName}" class="id-photo" />`
                        : '<div class="id-photo-placeholder">No Photo</div>'
                  }
                </div>
                <div class="${nameClass}">${fullName}</div>
                ${displayText ? `<div class="${infoClass}">${displayText}</div>` : ''}
                <div class="id-card-city${isVisitor ? ' visitor-city' : ''}${isCleanGreen ? ' clean-green-city' : ''}">${cityText}</div>
                <div class="id-footer">
                  <div class="id-qr-container">
                    ${
                      qrUrl
                        ? `<img src="${qrUrl}" alt="QR Code" class="id-qr-code" />`
                        : '<div class="id-qr-placeholder">No QR</div>'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
  };

  pages.forEach((pagePersonnel) => {
    const padded = [...pagePersonnel];
    while (padded.length < peoplePerPage) padded.push(null);

    pagesHTML += `
          <div class="id-card-page">
            ${renderCard(padded[0])}
            ${renderCard(padded[0])}
            ${renderCard(padded[1])}
            ${renderCard(padded[1])}
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
      /* Slightly smaller margins to make cards wider and reduce bottom gap */
      margin: 0.35in;
    }
    
    body {
      font-family: Arial, sans-serif;
      background: white;
    }
    
    .id-card-page {
      width: 100%;
      /* Usable height on long bond with 0.45in margins is ~12.1in.
         reduce slightly so the printed page is fully consumed and
         cut down the blank band at the bottom. */
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
      height: 100%;
      /* background scaled to fill without cropping */
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
      /* bring photo a little closer to top to free vertical space */
      margin-top: 60px;
      margin-bottom: 5px;
      display: flex;
      justify-content: center;
    }

    .id-photo {
      width: 100%;
      max-width: 170px;
      border-radius: 4px;
    }

    .id-photo-placeholder.visitor-initials {
      width: 100%;
      max-width: 170px;
      aspect-ratio: 1;
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
    }

    .id-name {
      font-size: 25px;
      font-weight: 800;
      font-family: 'Inter', Arial, sans-serif;
      color: #000000;
      text-align: center;
      margin-bottom: 5px;
      text-transform: uppercase;
      text-shadow: none;
      letter-spacing: 0.5px;
      width: 100%;
      line-height: 1.2;
      word-break: break-word;
      overflow-wrap: break-word;
      /* fixed height ensures event type stays at same position */
      height: 5.2em;
      overflow: hidden;
    }
    .id-name-long {
      font-size: 21px;
      line-height: 1.15;
      height: 5.2em;
    }
    .id-name-xl {
      font-size: 18px;
      line-height: 1.1;
      height: 5.2em;
    }
    .id-name-xxl {
      font-size: 15px;
      line-height: 1.05;
      height: 5.2em;
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
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      margin-top: 1000px;
      color: #333;
      margin-bottom: 6px;
    }

    /* management cards: force break after about 70 characters and use smaller font */
    .id-event-type.management {
      font-size: 8px;
      font-weight: 600;
      color: #000;
      text-shadow: none;
      line-height: 1.1;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
      white-space: normal;
      max-width: 70ch; /* roughly 70 letters */
      margin-left: auto;
      margin-right: auto;
    }

    .id-event-type.management.shrink {
      font-size: 6px;
    }

    /* extremely small for roleid 9 (Technical & Legal Consultants) */
    .id-event-type.management.tiny {
      font-size: 7px;
      word-break: break-all;
      white-space: normal;
    }

    /* large trainer label matches name size */
    .id-event-type.management.large {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.2;
    }

    /* Visitor role only: slightly bigger font for the VISITOR roletype text */
    .id-event-type.visitor-roletype {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.2;
    }

    /* Accommodation and Billeting: larger font for better visibility */
    .id-event-type.accommodation-billeting {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
      max-width: 80ch;
    }
    
    /* Ensure accommodation-billeting overrides all shrink/tiny variants */
    .id-event-type.management.shrink.accommodation-billeting,
    .id-event-type.management.tiny.accommodation-billeting,
    .id-event-type.management.short-roletype.accommodation-billeting {
      font-size: 20px;
      font-weight: 700;
    }

    /* Discipline and Religion: larger font for long text */
    .id-event-type.discipline-religion {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
      max-width: 80ch;
    }
    
    /* Transportation, Safety and Security: smaller font + line break */
    .id-event-type.transportation-security {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.25;
      max-width: 80ch;
    }

    /* Food and Nutrition: custom font + spacing */
    .id-event-type.food-nutrition,
    .id-event-type.management.food-nutrition {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.25;
      max-width: 80ch;
    }
    .id-event-type.food-nutrition + .id-card-city,
    .id-event-type.management.food-nutrition + .id-card-city {
      margin-bottom: 18px;
    }

    /* Clean and Green (roleid=49) */
    .id-event-type.clean-green,
    .id-event-type.management.clean-green {
      font-size: 16px;
      font-weight: 600;
      color: #0a7f0a;
      line-height: 1.2;
      max-width: 80ch;
    }

    /* Ensure clean-green wins even if other sizing classes are present */
    .id-event-type.management.shrink.clean-green,
    .id-event-type.management.tiny.clean-green,
    .id-event-type.management.short-roletype.clean-green {
      font-size: 16px;
      font-weight: 600;
      color: #0a7f0a;
      line-height: 1.2;
    }

    /* Ensure discipline-religion overrides shrink/tiny variants */
    .id-event-type.management.shrink.discipline-religion,
    .id-event-type.management.tiny.discipline-religion {
      font-size: 16px;
      font-weight: 600;
    }

    /* Ensure transportation-security overrides shrink/tiny variants */
    .id-event-type.management.shrink.transportation-security,
    .id-event-type.management.tiny.transportation-security {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.25;
    }

    .id-event-type.management .large {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.2;
    }

    /* "Lapu - Lapu City" below roletype — adjust position and font here */
    .id-card-city {
      font-size: 12px;
      font-weight: 500;
      font-family: 'Inter', Arial, sans-serif;
      color: #1976d2;
      text-align: center;
      margin-top: 6px;
      margin-bottom: 0;
      letter-spacing: 0.3px;
      line-height: 1.2;
    }

    /* Visitor cards can have their own spacing so their city label doesn't overlap */
    .id-card-city.visitor-city {
      margin-top: 10px;
    }

    /* Clean and Green (roleid=49) - allow adjusting the city top margin */
    .id-card-city.clean-green-city {
      margin-top: 20px;
    }

    .id-footer {
      margin-top: auto;
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .id-qr-container {
      width: 100px;
      height: 100px;
    }

    .id-qr-code {
      width: 100%;
      height: 100%;
    }

    .id-qr-placeholder {
      width: 100%;
      height: 100%;
      background: #eee;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 11px;
    }
  </style>
</head>
<body>
  ${pagesHTML}
</body>
</html>
  `;
}
