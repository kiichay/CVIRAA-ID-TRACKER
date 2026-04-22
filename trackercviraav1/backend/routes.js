const express = require("express");
const router = express.Router();
const db = require("./dbConnect");

// Server time so all clients (laptops) show the same synchronized clock
router.get("/time", (req, res) => {
  const now = new Date();
  res.json({
    iso: now.toISOString(),
    unix: now.getTime()
  });
});
// GET /event-types - return all event types from event_types table
router.get('/event-types', (req, res) => {
  db.query('SELECT eventTypeID, label, created_at, updated_at FROM event_types ORDER BY eventTypeID', (err, rows) => {
    if (err) {
      console.error('Error fetching event types:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    return res.json({ success: true, eventTypes: rows });
  });
});
const upload = require("./middleware/upload");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { generatePersonnelQR, getRoleName, getEventTypeName, getStatusName, decodeQRData } = require("./utils/qrGenerator");

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, "uploads");

const profileBaseDir = path.join(uploadsDir, "profile");
if (!fs.existsSync(profileBaseDir)) {
  fs.mkdirSync(profileBaseDir, { recursive: true });
}

function slugifyFilenamePart(input) {
  const text = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
  return text || "personnel";
}

// Allowed `roleType` values for personnel in the Committee group.  Originally
// only Chairman/Member were used, but additional categories were requested
// (see UI screenshot).  Keeping the set here keeps the validation logic DRY.
const COMMITTEE_ROLE_TYPES = new Set([
  'Chairman',
  'Chairperson',
  'Co-Chairperson',
  'Vice-Chairperson',
  'Division Sports Officer',
  'Technical & Legal Consultants',
  'Technical Assistant',
  'Training and Operations',
  'Member'
]);

// Case-insensitive lookup helper (allows minor casing differences from client)
const COMMITTEE_ROLE_TYPES_LOWER = new Set(
  [...COMMITTEE_ROLE_TYPES].map((s) => String(s).trim().toLowerCase())
);

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    // ignore
  }
}

function toPosixPath(p) {
  return String(p || "").split(path.sep).join("/");
}

// Normalize last name for scan matching: handle ñ/Ñ, mojibake (Ã±), and Unicode forms so scanner output matches DB
function normalizeLastNameForCompare(s) {
  if (s == null || typeof s !== "string") return "";
  let t = String(s).trim();
  // Fix common UTF-8 mojibake for ñ (e.g. scanner or transport sends Latin-1)
  t = t.replace(/\u00C3\u00B1/gi, "n"); // Ã± -> n
  t = t.replace(/Ã±/gi, "n");
  // Unicode NFD: ñ = n + U+0303 (combining tilde); remove combining tilde
  t = t.normalize("NFD").replace(/\u0303/g, "");
  // Explicit ñ/Ñ -> n
  t = t.replace(/ñ/gi, "n");
  return t.toLowerCase().trim();
}

// Match saved vs provided last name: normalize ñ/Ñ and accept scanner misreads (ñ read as 'a' so we get one less char)
function lastNamesMatchForScan(savedLname, providedSname) {
  if (!providedSname || typeof providedSname !== "string") return false;
  const savedNorm = normalizeLastNameForCompare(savedLname);
  const providedNorm = normalizeLastNameForCompare(providedSname);
  if (savedNorm === providedNorm) return true;
  // Scanner sometimes reads ñ as 'a' (e.g. Laña → Laa, Cañete → Caete): provided has one less char
  // Accept when provided === saved with one 'n' removed (saved "lana" vs provided "laa")
  if (savedNorm.length === providedNorm.length + 1) {
    for (let i = 0; i < savedNorm.length; i++) {
      if (savedNorm[i] === "n" && savedNorm.slice(0, i) + savedNorm.slice(i + 1) === providedNorm) return true;
    }
  }
  return false;
}

function getProfileRelativeFromAbsolute(filePath) {
  const rel = path.relative(profileBaseDir, filePath);
  return toPosixPath(rel);
}

// =================== PERSONNEL ROUTES ===================

// GET /personnel - Get all personnel (with optional filters)
// role: comma-separated roleid values (e.g., "1,2,3")
// roleGroup: comma-separated rolegroupid values (e.g., "1,2,3") - filters by roleGroup
router.get("/personnel", (req, res) => {
  const { role, roleGroup, eventType, status, search } = req.query;

  let sql = `
    SELECT 
      p.personnelID,
      p.fname,
      p.mname,
      p.lname,
      COALESCE(p.roleid, p.role) as role,
      p.roleid,
      p.roleType,
      p.eventType,
      p.picture,
      p.personnelStatus,
      p.qrcode,
      p.created_at,
      p.updated_at,
      r.roleid as role_roleid,
      r.rolename,
      rg.rolegroupid,
      rg.rolegroupname,
      et.label AS eventTypeName,
      lastStatus.lastTimestamp AS lastStatusTimestamp
    FROM personnel p
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
    LEFT JOIN event_types et ON p.eventType = et.eventTypeID
    LEFT JOIN (
      SELECT personnelID, MAX(timestamp) AS lastTimestamp
      FROM personnelStatusHistory
      GROUP BY personnelID
    ) lastStatus ON lastStatus.personnelID = p.personnelID
    WHERE 1=1
  `;

  const params = [];

  // Filter by role: match personnel whose roleid OR legacy role column equals selected role(s)
  if (role !== undefined && role !== '') {
    const roleVals = String(role).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (roleVals.length > 0) {
      const placeholders = roleVals.map(() => '?').join(',');
      sql += ` AND (p.roleid IN (${placeholders}) OR p.role IN (${placeholders}))`;
      params.push(...roleVals, ...roleVals);
    }
  }

  // Filter by roleGroup (new structure)
  if (roleGroup !== undefined && roleGroup !== '') {
    const roleGroupVals = String(roleGroup).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (roleGroupVals.length > 0) {
      sql += ` AND rg.rolegroupid IN (${roleGroupVals.map(() => '?').join(',')})`;
      params.push(...roleGroupVals);
    }
  }

  if (eventType !== undefined && eventType !== '') {
    sql += " AND p.eventType = ?";
    params.push(parseInt(eventType, 10));
  }

  // Status filter: 0=Out, 1=In
  if (status !== undefined && status !== '') {
    const statusVal = parseInt(status, 10);
    if (!isNaN(statusVal) && (statusVal === 0 || statusVal === 1)) {
      sql += " AND p.personnelStatus = ?";
      params.push(statusVal);
    }
  }

  if (search) {
    // Also allow searching by numeric ID (use p.personnelID - lastStatus also has personnelID)
    sql += " AND (p.fname LIKE ? OR p.mname LIKE ? OR p.lname LIKE ? OR CAST(p.personnelID AS CHAR) LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  sql += " ORDER BY created_at DESC";
  
  db.query(sql, params, async (err, rows) => {
    if (err) {
      console.error("Error fetching personnel:", err);
      console.error("SQL:", sql);
      console.error("Params:", params);
      return res.status(500).json({ 
        error: err.message,
        code: err.code,
        sqlState: err.sqlState,
        sqlMessage: err.sqlMessage
      });
    }
    
    try {
      // Generate QR codes on-the-fly as data URLs (no files saved, no DB storage needed)
      const mapped = await Promise.all((rows || []).map(async (personnel) => {
        let qrcodeUrl = null;
        try {
          qrcodeUrl = await generatePersonnelQR(
            { personnelID: personnel.personnelID, lname: personnel.lname },
            'dataURL'
          );
        } catch (e) {
          qrcodeUrl = null;
        }

        // Use new role structure if available, fallback to old
        const roleGroupName = personnel.rolegroupname || null;
        const baseRoleName = personnel.rolename || getRoleName(personnel.role);
        const roleType = personnel.roleType || null;
        const roleName =
          String(roleGroupName || '').toLowerCase() === 'committee' && roleType
            ? `${baseRoleName} - ${roleType}`
            : baseRoleName;
        const roleId = personnel.role_roleid || personnel.roleid || personnel.role;

        return {
          ...personnel,
          fullName: `${personnel.fname} ${personnel.mname ? personnel.mname + ' ' : ''}${personnel.lname}`.trim(),
          role: roleId,
          roleid: roleId,
          roleType,
          roleName: roleName,
          roleGroupId: personnel.rolegroupid || null,
          roleGroupName: roleGroupName,
          eventTypeName: personnel.eventTypeName ?? getEventTypeName(personnel.eventType),
          statusName: getStatusName(personnel.personnelStatus),
          lastStatusTimestamp: personnel.lastStatusTimestamp,
          pictureUrl: personnel.picture ? `/uploads/profile/${personnel.picture}` : null,
          qrcodeUrl
        };
      }));

      res.json(mapped);
    } catch (e) {
      console.error("Error generating QR codes:", e);
      res.status(500).json({ error: "Failed generating QR codes" });
    }
  });
});

// GET /personnel/:personnelID - Get single personnel by ID
router.get("/personnel/:personnelID", (req, res, next) => {
  console.log('[debug] personnel/:personnelID route', req.params.personnelID);
  if (req.params.personnelID === 'export-status-excel') {
    console.log('[debug] passing to next route (export-status-excel)');
    return next();
  }

  const personnelID = parseInt(req.params.personnelID, 10);
  
  if (!personnelID) {
    return res.status(400).json({ error: "Invalid personnel ID" });
  }
  
  const sql = `
    SELECT 
      p.personnelID,
      p.fname,
      p.mname,
      p.lname,
      COALESCE(p.roleid, p.role) as role,
      p.roleid,
      p.roleType,
      p.eventType,
      p.picture,
      p.personnelStatus,
      p.qrcode,
      p.created_at,
      p.updated_at,
      r.roleid as role_roleid,
      r.rolename,
      rg.rolegroupid,
      rg.rolegroupname,
      et.label AS eventTypeName
    FROM personnel p
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
    LEFT JOIN event_types et ON p.eventType = et.eventTypeID
    WHERE p.personnelID = ?
  `;
  
  db.query(sql, [personnelID], async (err, rows) => {
    if (err) {
      console.error("Error fetching personnel:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Personnel not found" });
    }
    
    const personnel = rows[0];
    
    let qrcodeUrl = null;
    try {
      qrcodeUrl = await generatePersonnelQR(
        { personnelID: personnel.personnelID, lname: personnel.lname },
        'dataURL'
      );
    } catch (e) {
      qrcodeUrl = null;
    }
    
    // Use new role structure if available, fallback to old
    const roleGroupName = personnel.rolegroupname || null;
    const baseRoleName = personnel.rolename || getRoleName(personnel.role);
    const roleType = personnel.roleType || null;
    const roleName =
      String(roleGroupName || '').toLowerCase() === 'committee' && roleType
        ? `${baseRoleName} - ${roleType}`
        : baseRoleName;
    const roleId = personnel.role_roleid || personnel.roleid || personnel.role;
    
    res.json({
      ...personnel,
      fullName: `${personnel.fname} ${personnel.mname ? personnel.mname + ' ' : ''}${personnel.lname}`.trim(),
      role: roleId,
      roleid: roleId,
      roleType,
      roleName: roleName,
      roleGroupId: personnel.rolegroupid || null,
      roleGroupName: roleGroupName,
      eventTypeName: personnel.eventTypeName ?? getEventTypeName(personnel.eventType),
      statusName: getStatusName(personnel.personnelStatus),
      pictureUrl: personnel.picture ? `/uploads/profile/${personnel.picture}` : null,
      qrcodeUrl
    });
  });
});

// POST /personnel - Create new personnel with QR code generation
router.post("/personnel", (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (req.fileValidationError) {
        return res.status(400).json({ error: req.fileValidationError });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  // Alias roleType from body to avoid any shadowing issues
  const { fname, mname, lname, roleid, role, eventType, roleType: incomingRoleType } = req.body;
  
  // Use roleid if provided (new structure), otherwise fallback to role (old structure)
  const roleIdToUse = roleid !== undefined && roleid !== null && roleid !== '' 
    ? parseInt(roleid, 10) 
    : (role !== undefined ? parseInt(role, 10) : null);

  const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
  
  // Validate required fields
  if (!fname || !lname || roleIdToUse === null) {
    // Delete uploaded file if validation fails
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(profileBaseDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(400).json({ 
      error: "fname, lname, and roleid (or role) are required",
      missingFields: {
        fname: !fname,
        lname: !lname,
        roleid: roleIdToUse === null,
        eventType: false
      }
    });
  }
  
  // Start database transaction
  const connection = await db.promise.getConnection();
  await connection.beginTransaction();
  
  try {
    // Determine roleGroup for this roleid (to decide if eventType is required)
    let roleGroupName = null;
    if (!isNaN(roleIdToUse)) {
      // Try new structure first
      try {
        const [rgRows] = await connection.execute(
          `SELECT rg.rolegroupname
           FROM role r
           INNER JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
           WHERE r.roleid = ?
           LIMIT 1`,
          [roleIdToUse]
        );
        roleGroupName = rgRows?.[0]?.rolegroupname || null;
      } catch (e) {
        // ignore (tables may not exist in older installs)
      }
      // Old structure fallback: 0-2 were Sports
      if (!roleGroupName && roleIdToUse >= 0 && roleIdToUse <= 2) {
        roleGroupName = 'Sports';
      }
      if (!roleGroupName && (roleIdToUse === 3 || roleIdToUse === 4)) {
        roleGroupName = 'Officials';
      }
      if (!roleGroupName && (roleIdToUse === 5 || roleIdToUse === 6 || roleIdToUse === 7)) {
        roleGroupName = 'Committee';
      }
    }

    const requiresEventType = String(roleGroupName || '').toLowerCase() === 'sports';

    // Validate roleType for Committee only (Chairman/Member)
    const normalizedRoleType = isBlank(incomingRoleType) ? null : String(incomingRoleType).trim();
    const isCommittee = String(roleGroupName || '').toLowerCase() === 'committee';
    if (isCommittee && normalizedRoleType) {
      if (!COMMITTEE_ROLE_TYPES.has(normalizedRoleType)) {
        await connection.rollback();
        connection.release();
        if (req.file) {
          const filePath = path.join(profileBaseDir, req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ error: `roleType must be one of: ${[...COMMITTEE_ROLE_TYPES].join(', ')}` });
      }
    }

    // Validate eventType only when required or provided
    let eventTypeNum = null;
    if (requiresEventType) {
      if (isBlank(eventType)) {
        await connection.rollback();
        connection.release();
        if (req.file) {
          const filePath = path.join(profileBaseDir, req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ error: "eventType is required for Sports roles" });
      }
    }
    if (!isBlank(eventType)) {
      const parsed = parseInt(eventType, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 255) {
        await connection.rollback();
        connection.release();
        if (req.file) {
          const filePath = path.join(profileBaseDir, req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ error: "EventType must be between 0 and 255" });
      }
      eventTypeNum = parsed;
    }

    // Validate roleid exists in role table (if using new structure and roleid > 7)
    if (!isNaN(roleIdToUse) && roleIdToUse > 7) {
      try {
        const [roleCheck] = await connection.execute(
          'SELECT roleid FROM role WHERE roleid = ? LIMIT 1',
          [roleIdToUse]
        );
        if (roleCheck.length === 0) {
          await connection.rollback();
          connection.release();
          if (req.file) {
            const filePath = path.join(profileBaseDir, req.file.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          return res.status(400).json({ 
            error: `Invalid roleid: ${roleIdToUse}. Role does not exist in role table.` 
          });
        }
      } catch (e) {
        // If role table doesn't exist yet, reject roleid > 7
        await connection.rollback();
        connection.release();
        if (req.file) {
          const filePath = path.join(profileBaseDir, req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        return res.status(400).json({ 
          error: `Invalid roleid: ${roleIdToUse}. Role table may not exist yet.` 
        });
      }
    }
    // Get picture filename if uploaded (will be renamed after we have personnelID)
    const uploadedRelPath = req.file ? getProfileRelativeFromAbsolute(req.file.path) : null;
    
    // Check if roleid column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'personnel' 
        AND COLUMN_NAME = 'roleid'
    `);
    
    const hasRoleIdColumn = columns.length > 0;
    
    // Check if roleType column exists
    const [roleTypeCols] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'personnel'
        AND COLUMN_NAME = 'roleType'
    `);
    const hasRoleTypeColumn = roleTypeCols.length > 0;

    // Insert personnel record - use roleid if column exists, otherwise use old role column
    let insertSQL, insertParams;
    if (hasRoleIdColumn) {
      if (hasRoleTypeColumn) {
        insertSQL = 'INSERT INTO personnel (fname, mname, lname, roleid, roleType, role, eventType, picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        insertParams = [
          fname,
          mname || null,
          lname,
          roleIdToUse,
          isCommittee ? normalizedRoleType : null,
          roleIdToUse <= 7 ? roleIdToUse : null,
          eventTypeNum,
          uploadedRelPath
        ];
      } else {
        insertSQL = 'INSERT INTO personnel (fname, mname, lname, roleid, role, eventType, picture) VALUES (?, ?, ?, ?, ?, ?, ?)';
        insertParams = [fname, mname || null, lname, roleIdToUse, roleIdToUse <= 7 ? roleIdToUse : null, eventTypeNum, uploadedRelPath];
      }
    } else {
      insertSQL = 'INSERT INTO personnel (fname, mname, lname, role, eventType, picture) VALUES (?, ?, ?, ?, ?, ?)';
      insertParams = [fname, mname || null, lname, roleIdToUse, eventTypeNum, uploadedRelPath];
    }
    
    const [result] = await connection.execute(insertSQL, insertParams);
    
    const personnelID = result.insertId;

    // Rename uploaded profile picture to "<name>-<personnelID>.<ext>" (no timestamp)
    let pictureFilename = uploadedRelPath;
    if (req.file && uploadedRelPath) {
      const ext = path.extname(req.file.originalname || req.file.filename) || path.extname(req.file.filename) || ".jpg";
      const fullNameForFile = `${fname} ${mname ? mname + " " : ""}${lname}`.trim();
      const base = slugifyFilenamePart(fullNameForFile);
      const desired = `${base}-${personnelID}${ext.toLowerCase()}`;

      const dir = path.dirname(req.file.path);
      const oldPath = req.file.path;
      const newAbsPath = path.join(dir, desired);

      // If a file already exists with that name, remove it (avoid rename error)
      safeUnlink(newAbsPath);
      try {
        fs.renameSync(oldPath, newAbsPath);
        pictureFilename = getProfileRelativeFromAbsolute(newAbsPath);
        await connection.execute(
          "UPDATE personnel SET picture = ? WHERE personnelID = ?",
          [pictureFilename, personnelID]
        );
      } catch (e) {
        // If rename fails, keep the uploaded filename
        pictureFilename = uploadedRelPath;
      }
    }
    
    // Get event type label from event_types table for response
    let eventTypeName = null;
    if (eventTypeNum !== null && eventTypeNum !== undefined) {
      try {
        const [etRows] = await connection.execute(
          'SELECT label FROM event_types WHERE eventTypeID = ? LIMIT 1',
          [eventTypeNum]
        );
        eventTypeName = etRows?.[0]?.label ?? getEventTypeName(eventTypeNum);
      } catch (e) {
        eventTypeName = getEventTypeName(eventTypeNum);
      }
    }

    // Commit transaction
    await connection.commit();
    connection.release();

    // Generate QR for UI display (do NOT store in DB, do NOT save file)
    const qrcodeUrl = await generatePersonnelQR({ personnelID, lname }, 'dataURL');
    
    res.json({
      success: true,
      message: "Personnel created successfully",
      data: {
        personnelID,
        fname,
        mname: mname || null,
        lname,
        fullName: `${fname} ${mname ? mname + ' ' : ''}${lname}`.trim(),
        role: roleIdToUse,
        roleid: roleIdToUse,
        roleName: getRoleName(roleIdToUse),
        roleType: isCommittee ? normalizedRoleType : null,
        eventType: eventTypeNum,
        eventTypeName,
        picture: pictureFilename,
        pictureUrl: pictureFilename ? `/uploads/profile/${pictureFilename}` : null,
        qrcodeUrl,
        created_at: new Date()
      }
    });
    
  } catch (error) {
    // Rollback on error and delete uploaded file
    await connection.rollback();
    connection.release();
    if (req.file) {
      const filePath = path.join(profileBaseDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    console.error("Error creating personnel:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /personnel/set-all-out - Set all IN personnel to OUT (do not change if already OUT)
router.put("/personnel/set-all-out", async (req, res) => {
  try {
    const connection = await db.promise.getConnection();
    await connection.beginTransaction();

    try {
      // Get all personnel with status = 1 (IN)
      const [rows] = await connection.execute(
        'SELECT personnelID, personnelStatus FROM personnel WHERE personnelStatus = 1'
      );
      
      const changedCount = rows.length;
      
      // Update all IN personnel to OUT (0)
      if (changedCount > 0) {
        await connection.execute(
          'UPDATE personnel SET personnelStatus = 0 WHERE personnelStatus = 1'
        );
        
        // Save to status history for each updated personnel
        for (const row of rows) {
          await connection.execute(
            'INSERT INTO personnelStatusHistory (personnelID, status) VALUES (?, ?)',
            [row.personnelID, 0]
          );
        }
      }
      
      // Count personnel already OUT (0)
      const [outRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM personnel WHERE personnelStatus = 0'
      );
      const unchangedCount = outRows[0].count - changedCount;
      
      await connection.commit();
      connection.release();
      
      res.json({
        success: true,
        message: `Updated ${changedCount} personnel from IN to OUT. ${unchangedCount} were already OUT.`,
        changedCount,
        unchangedCount,
        totalAffected: changedCount + unchangedCount
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error setting all personnel to OUT:", error);
    res.status(500).json({
      error: "Failed to update personnel status",
      message: error.message
    });
  }
});

// PUT /personnel/:personnelID - Update personnel
router.put("/personnel/:personnelID", (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (req.fileValidationError) {
        return res.status(400).json({ error: req.fileValidationError });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const personnelID = parseInt(req.params.personnelID, 10);
  // Alias roleType from body to avoid any shadowing issues
  const { fname, mname, lname, roleid, role, eventType, roleType: incomingRoleType } = req.body;
  
  // Use roleid if provided (new structure), otherwise fallback to role (old structure)
  const roleIdToUse = roleid !== undefined && roleid !== null && roleid !== '' 
    ? parseInt(roleid, 10) 
    : (role !== undefined && role !== null && role !== '' ? parseInt(role, 10) : null);

  const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
  
  if (!personnelID) {
    // Delete uploaded file if validation fails
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(profileBaseDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(400).json({ error: "Invalid personnel ID" });
  }
  
  // Validate roleid if provided
  if (roleIdToUse !== null && !isNaN(roleIdToUse)) {
    // Will validate in transaction if roleid > 7
  }
  
  // Validate eventType if provided (blank => allowed; Sports requirement handled later)
  let eventTypeNum = null;
  if (!isBlank(eventType)) {
    eventTypeNum = parseInt(eventType, 10);
    if (isNaN(eventTypeNum) || eventTypeNum < 0 || eventTypeNum > 255) {
      // Delete uploaded file if validation fails
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(profileBaseDir, req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(400).json({ 
        error: "EventType must be between 0 and 255" 
      });
    }
  }
  
  // Start database transaction
  const connection = await db.promise.getConnection();
  await connection.beginTransaction();
  
  try {
    // Check if personnel exists
    const [existing] = await connection.execute(
      'SELECT * FROM personnel WHERE personnelID = ?',
      [personnelID]
    );
    
    if (existing.length === 0) {
      await connection.rollback();
      connection.release();
      // Delete uploaded file if personnel not found
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(profileBaseDir, req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(404).json({ error: "Personnel not found" });
    }
    
    const oldPicture = existing[0].picture;
    const existingFname = existing[0].fname;
    const existingMname = existing[0].mname;
    const existingLname = existing[0].lname;
    const existingEventType = existing[0].eventType;
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (fname !== undefined) {
      updates.push('fname = ?');
      params.push(fname);
    }
    if (mname !== undefined) {
      updates.push('mname = ?');
      params.push(mname || null);
    }
    if (lname !== undefined) {
      updates.push('lname = ?');
      params.push(lname);
    }
    // Handle roleid update (new structure) or role (old structure)
    if (roleIdToUse !== null) {
      // Check if roleid column exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'personnel' 
          AND COLUMN_NAME = 'roleid'
      `);
      
      const hasRoleIdColumn = columns.length > 0;
      
      if (hasRoleIdColumn) {
        updates.push('roleid = ?');
        params.push(roleIdToUse);
        // For backward-compatibility, keep the legacy `role` column in sync.
        // When using modern role IDs (> 7), clear the legacy column so the UI
        // and queries that use COALESCE(p.role, p.roleid) will reflect the new value.
        if (roleIdToUse <= 7) {
          updates.push('role = ?');
          params.push(roleIdToUse);
        } else {
          updates.push('role = ?');
          params.push(null);
        }
      } else {
        // Old structure - only update role column
        updates.push('role = ?');
        params.push(roleIdToUse);
      }
    }

    // roleType update support (committee: Chairman/Member)
    const [roleTypeCols] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'personnel'
        AND COLUMN_NAME = 'roleType'
    `);
    const hasRoleTypeColumn = roleTypeCols.length > 0;

    // Decide if eventType is required for this role (Sports only)
    // Use a distinct variable name to avoid clashing with later response mapping.
    let roleGroupNameForEventType = null;
    if (roleIdToUse !== null && !isNaN(roleIdToUse)) {
      try {
        const [rgRows] = await connection.execute(
          `SELECT rg.rolegroupname
           FROM role r
           INNER JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
           WHERE r.roleid = ?
           LIMIT 1`,
          [roleIdToUse]
        );
        roleGroupNameForEventType = rgRows?.[0]?.rolegroupname || null;
      } catch (e) {
        // ignore
      }
      // Old structure fallback: 0-2 were Sports
      if (!roleGroupNameForEventType && roleIdToUse >= 0 && roleIdToUse <= 2) roleGroupNameForEventType = 'Sports';
      if (!roleGroupNameForEventType && (roleIdToUse === 3 || roleIdToUse === 4)) roleGroupNameForEventType = 'Officials';
      if (!roleGroupNameForEventType && (roleIdToUse === 5 || roleIdToUse === 6 || roleIdToUse === 7)) roleGroupNameForEventType = 'Committee';
    }
    const requiresEventType = String(roleGroupNameForEventType || '').toLowerCase() === 'sports';
    const isCommittee = String(roleGroupNameForEventType || '').toLowerCase() === 'committee';

    if (hasRoleTypeColumn && incomingRoleType !== undefined) {
      const normalizedRoleType = isBlank(incomingRoleType) ? null : String(incomingRoleType).trim();
      if (isCommittee && normalizedRoleType) {
        if (!COMMITTEE_ROLE_TYPES_LOWER.has(normalizedRoleType.toLowerCase())) {
          await connection.rollback();
          connection.release();
          if (req.file) {
            const filePath = path.join(profileBaseDir, req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          }
          return res.status(400).json({ error: `roleType must be one of: ${[...COMMITTEE_ROLE_TYPES].join(', ')}` });
        }
      }
      updates.push('roleType = ?');
      params.push(isCommittee ? normalizedRoleType : null);
    }

    // Apply eventType rules:
    // - Sports: must have eventType (either provided now, or already stored)
    // - Non-sports: eventType can be NULL; if client sent blank (eventType="") set NULL
    if (requiresEventType) {
      if (isBlank(eventType) && (existingEventType === null || existingEventType === undefined)) {
        await connection.rollback();
        connection.release();
        if (req.file) {
          const filePath = path.join(profileBaseDir, req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ error: "eventType is required for Sports roles" });
      }
      if (!isBlank(eventType)) {
        updates.push('eventType = ?');
        params.push(eventTypeNum);
      }
    } else {
      if (eventType !== undefined && isBlank(eventType)) {
        updates.push('eventType = ?');
        params.push(null);
      } else if (!isBlank(eventType)) {
        updates.push('eventType = ?');
        params.push(eventTypeNum);
      }
    }
    
    // Handle picture upload: when replacing, clear old first (delete file + null in DB), then save new like first time
    if (req.file) {
      // If personnel already has a picture: delete file and set picture to NULL first (avoids directory/path mismatch)
      if (oldPicture) {
        const oldFilePath = path.join(profileBaseDir, oldPicture);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
        await connection.execute('UPDATE personnel SET picture = NULL WHERE personnelID = ?', [personnelID]);
      }

      // Save new picture like first time: put in profile base dir and name as base-personnelID.ext
      const effectiveFname = fname !== undefined ? fname : existingFname;
      const effectiveMname = mname !== undefined ? mname : existingMname;
      const effectiveLname = lname !== undefined ? lname : existingLname;
      const fullNameForFile = `${effectiveFname} ${effectiveMname ? effectiveMname + " " : ""}${effectiveLname}`.trim();
      const base = slugifyFilenamePart(fullNameForFile);
      const ext = path.extname(req.file.originalname || req.file.filename) || ".jpg";
      const desired = `${base}-${personnelID}${ext.toLowerCase()}`;

      // Move new file into profile base dir (same location for all, like first-time add) so path is consistent
      const profileDir = profileBaseDir;
      const newAbsPath = path.join(profileDir, desired);
      const oldPath = req.file.path;

      safeUnlink(newAbsPath);
      try {
        fs.renameSync(oldPath, newAbsPath);
        req.file.filename = getProfileRelativeFromAbsolute(newAbsPath);
      } catch (e) {
        // If rename fails (e.g. cross-device), copy then unlink
        try {
          fs.copyFileSync(oldPath, newAbsPath);
          fs.unlinkSync(oldPath);
          req.file.filename = getProfileRelativeFromAbsolute(newAbsPath);
        } catch (e2) {
          req.file.filename = getProfileRelativeFromAbsolute(oldPath);
        }
      }

      updates.push('picture = ?');
      params.push(req.file.filename);
    }
    
    if (updates.length === 0) {
      await connection.rollback();
      connection.release();
      // Delete uploaded file if no updates
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(profileBaseDir, req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(400).json({ error: "No fields to update" });
    }
    
    // Update personnel
    params.push(personnelID);
    await connection.execute(
      `UPDATE personnel SET ${updates.join(', ')} WHERE personnelID = ?`,
      params
    );
    
    // Fetch updated record with role information and event type label
    const [updated] = await connection.execute(`
      SELECT 
        p.*,
        r.roleid as role_roleid,
        r.rolename,
        rg.rolegroupid,
        rg.rolegroupname,
        et.label AS eventTypeName
      FROM personnel p
      LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
      LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
      LEFT JOIN event_types et ON p.eventType = et.eventTypeID
      WHERE p.personnelID = ?
    `, [personnelID]);
    
    const updatedPersonnel = updated[0];

    // Generate QR for UI display (do NOT store in DB, do NOT save file)
    const qrcodeUrl = await generatePersonnelQR(
      { personnelID: updatedPersonnel.personnelID, lname: updatedPersonnel.lname },
      'dataURL'
    );
    
    // Commit transaction
    await connection.commit();
    connection.release();
    
    // Use new role structure if available, fallback to old
    const roleGroupName = updatedPersonnel.rolegroupname || null;
    const baseRoleName = updatedPersonnel.rolename || getRoleName(updatedPersonnel.role);
    const roleType = updatedPersonnel.roleType || null;
    const roleName =
      String(roleGroupName || '').toLowerCase() === 'committee' && roleType
        ? `${baseRoleName} - ${roleType}`
        : baseRoleName;
    const roleId = updatedPersonnel.role_roleid || updatedPersonnel.roleid || updatedPersonnel.role;
    
    res.json({
      success: true,
      message: "Personnel updated successfully",
      data: {
        ...updatedPersonnel,
        fullName: `${updatedPersonnel.fname} ${updatedPersonnel.mname ? updatedPersonnel.mname + ' ' : ''}${updatedPersonnel.lname}`.trim(),
        role: roleId,
        roleid: roleId,
        roleType,
        roleName: roleName,
        roleGroupId: updatedPersonnel.rolegroupid || null,
        roleGroupName: roleGroupName,
        eventTypeName: updatedPersonnel.eventTypeName ?? getEventTypeName(updatedPersonnel.eventType),
        pictureUrl: updatedPersonnel.picture ? `/uploads/profile/${updatedPersonnel.picture}` : null,
        qrcodeUrl
      }
    });
    
  } catch (error) {
    // Rollback on error and delete uploaded file
    await connection.rollback();
    connection.release();
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(profileBaseDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    console.error("Error updating personnel:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /personnel/:personnelID - Delete personnel
router.delete("/personnel/:personnelID", async (req, res) => {
  const personnelID = parseInt(req.params.personnelID, 10);
  
  if (!personnelID) {
    return res.status(400).json({ error: "Invalid personnel ID" });
  }
  
  // Get personnel info first to delete picture file
  db.query('SELECT picture FROM personnel WHERE personnelID = ?', [personnelID], (err, rows) => {
    if (err) {
      console.error("Error fetching personnel:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Personnel not found" });
    }
    
    const picture = rows[0].picture;
    
    // Delete personnel record
    db.query('DELETE FROM personnel WHERE personnelID = ?', [personnelID], (err, result) => {
      if (err) {
        console.error("Error deleting personnel:", err);
        return res.status(500).json({ error: err.message });
      }
      
      // Delete picture file if exists
      if (picture) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(profileBaseDir, picture);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      res.json({
        success: true,
        message: "Personnel deleted successfully"
      });
    });
  });
});

// GET /personnel/:personnelID/id-card - Get ID card data for display
router.get("/personnel/:personnelID/id-card", (req, res) => {
  const personnelID = parseInt(req.params.personnelID, 10);
  
  if (!personnelID) {
    return res.status(400).json({ error: "Invalid personnel ID" });
  }
  
  const sql = `
    SELECT 
      p.personnelID,
      p.fname,
      p.mname,
      p.lname,
      COALESCE(p.roleid, p.role) as role,
      p.roleid,
      p.eventType,
      p.picture,
      p.personnelStatus,
      p.qrcode,
      p.created_at,
      r.roleid as role_roleid,
      r.rolename,
      rg.rolegroupid,
      rg.rolegroupname,
      et.label AS eventTypeName
    FROM personnel p
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
    LEFT JOIN event_types et ON p.eventType = et.eventTypeID
    WHERE p.personnelID = ?
  `;
  
  db.query(sql, [personnelID], async (err, rows) => {
    if (err) {
      console.error("Error fetching personnel ID card:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Personnel not found" });
    }
    
    const personnel = rows[0];
    const fullName = `${personnel.fname} ${personnel.mname ? personnel.mname + ' ' : ''}${personnel.lname}`.trim();
    
    let qrcodeUrl = null;
    try {
      qrcodeUrl = await generatePersonnelQR(
        { personnelID: personnel.personnelID, lname: personnel.lname },
        'dataURL'
      );
    } catch (e) {
      qrcodeUrl = null;
    }
    
    // Use new role structure if available, fallback to old
    const roleName = personnel.rolename || getRoleName(personnel.role);
    const roleGroupName = personnel.rolegroupname || null;
    const roleId = personnel.role_roleid || personnel.roleid || personnel.role;
    
    res.json({
      success: true,
      idCard: {
        personnelID: personnel.personnelID,
        fullName,
        role: roleId,
        roleid: roleId,
        roleName: roleName,
        roleGroupId: personnel.rolegroupid || null,
        roleGroupName: roleGroupName,
        eventType: personnel.eventType,
        eventTypeName: personnel.eventTypeName ?? getEventTypeName(personnel.eventType),
        personnelStatus: personnel.personnelStatus,
        statusName: getStatusName(personnel.personnelStatus),
        picture: personnel.picture,
        pictureUrl: personnel.picture ? `/uploads/profile/${personnel.picture}` : null,
        qrcodeUrl,
        issuedDate: personnel.created_at
      }
    });
  });
});

// POST /personnel/scan - Verify personnel using QR code data or manual ID + sname
// Optional status parameter: 0 = Out, 1 = In
router.post("/personnel/scan", async (req, res) => {
  const { qrData, personnelID, sname, status, bypassCooldown } = req.body; // qrData can contain JSON with personnelID and sname
  // Accept bypass if property exists (boolean/string/number). Frontend sends bypassCooldown=true when bypass requested.
  const allowBypass = bypassCooldown !== undefined && bypassCooldown !== null;
  if (bypassCooldown) {
    console.log('[SCAN] bypassCooldown received:', bypassCooldown);
  }

  let id, lastName, fromQR = false;

  // If QR code data is provided, decode it
  if (qrData) {
    const decoded = decodeQRData(qrData);
    if (decoded && decoded.personnelID) {
      id = decoded.personnelID;
      lastName = decoded.sname || null;
      fromQR = true;
    } else {
      return res.status(400).json({
        error: "Invalid QR code data format",
      });
    }
  } else {
    // Manual input: personnelID and sname
    id = parseInt(personnelID, 10);
    lastName = sname;
  }

  // We always require a valid ID
  if (!id || isNaN(id)) {
    return res.status(400).json({
      error: "personnelID (number) is required",
    });
  }

  // Validate status if provided (0 = Out, 1 = In)
  let statusValue = null;
  if (status !== undefined && status !== null) {
    statusValue = parseInt(status, 10);
    if (isNaN(statusValue) || (statusValue !== 0 && statusValue !== 1)) {
      return res.status(400).json({
        error: "Status must be 0 (Out) or 1 (In)",
      });
    }
  }

  try {
    const connection = await db.promise.getConnection();
    await connection.beginTransaction();

    try {
      // Fetch personnel by ID only; then require sname to match saved lname (do not save time in/out unless both match)
      const sql = `
        SELECT 
          p.personnelID,
          p.fname,
          p.mname,
          p.lname,
          COALESCE(p.roleid, p.role) as role,
          p.roleid,
          p.eventType,
          p.picture,
          p.personnelStatus,
          p.qrcode,
          p.created_at,
          r.roleid as role_roleid,
          r.rolename,
          rg.rolegroupid,
          rg.rolegroupname,
          et.label AS eventTypeName
        FROM personnel p
        LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
        LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
        LEFT JOIN event_types et ON p.eventType = et.eventTypeID
        WHERE p.personnelID = ?
      `;

      const [rows] = await connection.execute(sql, [id]);

      if (!rows || rows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: "Unrecognized/Unauthorized" });
      }

      const personnel = rows[0];
      const savedLname = String(personnel.lname || "").trim();
      const providedSname = (lastName != null && typeof lastName === "string") ? String(lastName).trim() : "";

      // Only accept if both personnelID and sname match saved personnel (normalize ñ/Ñ and scanner misreads like Caete/Cañete, Laa/Laña)
      if (!lastNamesMatchForScan(savedLname, providedSname)) {
        await connection.rollback();
        connection.release();
        return res.status(401).json({ error: "Unrecognized/Unauthorized" });
      }
      const currentStatus = personnel.personnelStatus;
      
      // Update status if provided
      if (statusValue !== null) {
        // Check if status is already the same (duplicate scan) - do not save to history
        if (currentStatus === statusValue) {
          await connection.rollback();
          connection.release();

          const fullName = `${personnel.fname} ${
            personnel.mname ? personnel.mname + " " : ""
          }${personnel.lname}`.trim();

          const roleName = personnel.rolename || getRoleName(personnel.role);
          const roleGroupName = personnel.rolegroupname || null;
          const roleId = personnel.role_roleid || personnel.roleid || personnel.role;

          const statusText = statusValue === 1 ? "In" : "Out";
          return res.status(400).json({
            success: false,
            error: `Personnel is already ${statusText}`,
            message: `${fullName} - Already ${statusText} status`,
            personnel: {
              personnelID: personnel.personnelID,
              fullName,
              role: roleId,
              roleid: roleId,
              roleName: roleName,
              roleGroupId: personnel.rolegroupid || null,
              roleGroupName: roleGroupName,
              eventType: personnel.eventType,
              eventTypeName: personnel.eventTypeName ?? getEventTypeName(personnel.eventType),
              personnelStatus: personnel.personnelStatus,
              statusName: getStatusName(personnel.personnelStatus),
              picture: personnel.picture,
              pictureUrl: personnel.picture
                ? `/uploads/profile/${personnel.picture}`
                : null,
            },
          });
        }

        // Enforce a cooldown between status changes (IN<->OUT)
        // Prevent rapid switching (e.g. IN then OUT within 60 seconds)
        const STATUS_CHANGE_COOLDOWN_SECONDS = 60;
        const [lastHistRows] = await connection.execute(
          "SELECT timestamp FROM personnelStatusHistory WHERE personnelID = ? ORDER BY timestamp DESC LIMIT 1",
          [id]
        );

        if (lastHistRows && lastHistRows[0] && lastHistRows[0].timestamp) {
          const lastTs = new Date(lastHistRows[0].timestamp).getTime();
          const nowTs = Date.now();

          if (!Number.isNaN(lastTs)) {
            const elapsedSec = Math.floor((nowTs - lastTs) / 1000);
            if (elapsedSec >= 0 && elapsedSec < STATUS_CHANGE_COOLDOWN_SECONDS) {
              const remaining = STATUS_CHANGE_COOLDOWN_SECONDS - elapsedSec;

              if (!allowBypass) {
                await connection.rollback();
                connection.release();

                const fullName = `${personnel.fname} ${
                  personnel.mname ? personnel.mname + " " : ""
                }${personnel.lname}`.trim();
                const roleName = personnel.rolename || getRoleName(personnel.role);
                const roleGroupName = personnel.rolegroupname || null;
                const roleId = personnel.role_roleid || personnel.roleid || personnel.role;
                const desiredText = statusValue === 1 ? "IN" : "OUT";

                return res.status(429).json({
                  success: false,
                  error: "Cooldown active",
                  cooldownSecondsRemaining: remaining,
                  message: `Cooldown active — please wait ${remaining}s before timing ${desiredText}`,
                  personnel: {
                    personnelID: personnel.personnelID,
                    fullName,
                    role: roleId,
                    roleid: roleId,
                    roleName: roleName,
                    roleGroupId: personnel.rolegroupid || null,
                    roleGroupName: roleGroupName,
                    eventType: personnel.eventType,
                    eventTypeName: personnel.eventTypeName ?? getEventTypeName(personnel.eventType),
                    personnelStatus: personnel.personnelStatus,
                    statusName: getStatusName(personnel.personnelStatus),
                    picture: personnel.picture,
                    pictureUrl: personnel.picture ? `/uploads/profile/${personnel.picture}` : null,
                  },
                });
              }

              // Bypass accepted (still within cooldown but we allow it for this request)
              console.log(`[COOLDOWN] bypass accepted for personnelID=${id}, remaining=${remaining}s`);
            }
          }
        }

        // Status is different, update it and save to history
        await connection.execute(
          'UPDATE personnel SET personnelStatus = ? WHERE personnelID = ?',
          [statusValue, id]
        );
        
        // Save to history
        await connection.execute(
          'INSERT INTO personnelStatusHistory (personnelID, status) VALUES (?, ?)',
          [id, statusValue]
        );
        
        personnel.personnelStatus = statusValue;
      }

      await connection.commit();
      connection.release();

      console.log(`[SCAN] status updated for personnelID=${id} -> ${statusValue}`);

      const fullName = `${personnel.fname} ${
        personnel.mname ? personnel.mname + " " : ""
      }${personnel.lname}`.trim();

      // Use new role structure if available, fallback to old
      const roleName = personnel.rolename || getRoleName(personnel.role);
      const roleGroupName = personnel.rolegroupname || null;
      const roleId = personnel.role_roleid || personnel.roleid || personnel.role;

      let qrcodeUrl = null;
      try {
        qrcodeUrl = await generatePersonnelQR(
          { personnelID: personnel.personnelID, lname: personnel.lname },
          'dataURL'
        );
      } catch (e) {
        qrcodeUrl = null;
      }

      const statusChanged = statusValue !== null && currentStatus !== statusValue;
      
      return res.json({
        success: true,
        statusChanged: statusChanged,
        message: statusChanged 
          ? `${fullName} - Status changed successfully to "${getStatusName(personnel.personnelStatus)}"`
          : `${fullName} - Verified successfully`,
        personnel: {
          personnelID: personnel.personnelID,
          fullName,
          role: roleId,
          roleid: roleId,
          roleName: roleName,
          roleGroupId: personnel.rolegroupid || null,
          roleGroupName: roleGroupName,
          eventType: personnel.eventType,
          eventTypeName: personnel.eventTypeName ?? getEventTypeName(personnel.eventType),
          personnelStatus: personnel.personnelStatus,
          statusName: getStatusName(personnel.personnelStatus),
          picture: personnel.picture,
          pictureUrl: personnel.picture
            ? `/uploads/profile/${personnel.picture}`
            : null,
          qrcodeUrl,
          verified: true,
          scannedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error verifying personnel:", error);
    return res.status(500).json({
      error: "Database error while verifying personnel",
      message: error.message,
    });
  }
});

// GET /personnel/:personnelID/history - Get status history for a personnel
router.get("/personnel/:personnelID/history", (req, res) => {
  const personnelID = parseInt(req.params.personnelID, 10);
  
  if (!personnelID) {
    return res.status(400).json({ error: "Invalid personnel ID" });
  }
  
  const sql = `
    SELECT 
      statusHistoryId,
      personnelID,
      status,
      timestamp
    FROM personnelStatusHistory
    WHERE personnelID = ?
    ORDER BY timestamp DESC
  `;
  
  db.query(sql, [personnelID], (err, rows) => {
    if (err) {
      console.error("Error fetching status history:", err);
      return res.status(500).json({ error: err.message });
    }
    
    const history = (rows || []).map(record => ({
      statusHistoryId: record.statusHistoryId,
      personnelID: record.personnelID,
      status: record.status,
      statusName: getStatusName(record.status),
      timestamp: record.timestamp
    }));
    
    res.json({
      success: true,
      history
    });
  });
});

// GET /personnel/history/all - Get all status history records (with optional filters)
// Query params: status (0/1), dateFrom, dateTo, eventType, role, search, limit
router.get("/personnel/history/all", (req, res) => {
  const { status, dateFrom, dateTo, eventType, role, search, limit } = req.query;

  let sql = `
    SELECT 
      h.statusHistoryId,
      h.personnelID,
      h.status,
      h.timestamp,
      p.fname,
      p.mname,
      p.lname,
      p.role,
      p.roleid,
      p.eventType,
      r.rolename,
      rg.rolegroupid,
      rg.rolegroupname,
      et.label AS eventTypeName
    FROM personnelStatusHistory h
    INNER JOIN personnel p ON h.personnelID = p.personnelID
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
    LEFT JOIN event_types et ON p.eventType = et.eventTypeID
    WHERE 1=1
  `;

  const params = [];

  // Filter by status (0 = Out, 1 = In)
  if (status !== undefined && status !== '') {
    sql += " AND h.status = ?";
    params.push(parseInt(status, 10));
  }

  // Filter by date range
  if (dateFrom) {
    sql += " AND h.timestamp >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += " AND h.timestamp <= ?";
    // Add time to include the entire end date
    params.push(dateTo + " 23:59:59");
  }

  // Filter by eventType
  if (eventType !== undefined && eventType !== '') {
    sql += " AND p.eventType = ?";
    params.push(parseInt(eventType, 10));
  }

  // Filter by role (match p.role or p.roleid)
  if (role !== undefined && role !== '') {
    const roleVal = parseInt(role, 10);
    sql += " AND (p.role = ? OR p.roleid = ?)";
    params.push(roleVal, roleVal);
  }

  // Search by name or personnelID
  if (search) {
    sql += " AND (p.fname LIKE ? OR p.mname LIKE ? OR p.lname LIKE ? OR CAST(p.personnelID AS CHAR) LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  sql += " ORDER BY h.timestamp DESC";

  // Apply limit (default 1000 for reports)
  const recordLimit = limit ? parseInt(limit, 10) : 1000;
  sql += ` LIMIT ${recordLimit}`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error fetching all status history:", err);
      return res.status(500).json({ error: err.message });
    }

    const history = (rows || []).map(record => {
      const baseRoleName = record.rolename || getRoleName(record.role);
      const roleDisplay = record.eventTypeName
        ? `${baseRoleName} / ${record.eventTypeName}`
        : baseRoleName;
      return {
        statusHistoryId: record.statusHistoryId,
        personnelID: record.personnelID,
        status: record.status,
        statusName: getStatusName(record.status),
        timestamp: record.timestamp,
        fullName: `${record.fname} ${record.mname ? record.mname + ' ' : ''}${record.lname}`.trim(),
        role: record.role,
        roleName: roleDisplay,
        eventTypeName: record.eventTypeName || null
      };
    });

    res.json({
      success: true,
      history
    });
  });
});

// GET /personnel/history/export-excel - Export Time IN/OUT History as Excel (Personnel | Role | In 1 | Out 1 | In 2 | Out 2 | ...)
router.get("/personnel/history/export-excel", async (req, res) => {
  const { date, eventType, role, search, status, roleGroup } = req.query;

  // Backward-compatible fallback (from older UI path): if no date provided
  // and status/role filters are present, generate Personnel Status Excel.
  if (!date || !String(date).trim()) {
    if (status === undefined && eventType === undefined && role === undefined && roleGroup === undefined && !search) {
      return res.status(400).json({ error: "Date is required for history export" });
    }

    // Re-use the personnel status export behavior to avoid 400 from old client code.
    try {
      let sql = `
        SELECT 
          p.personnelID,
          p.fname,
          p.mname,
          p.lname,
          COALESCE(p.roleid, p.role) as role,
          p.roleid,
          p.eventType,
          p.personnelStatus,
          r.rolename,
          rg.rolegroupid,
          rg.rolegroupname,
          et.label AS eventTypeName,
          lastStatus.lastTimestamp AS lastStatusTimestamp
        FROM personnel p
        LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
        LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
        LEFT JOIN event_types et ON p.eventType = et.eventTypeID
        LEFT JOIN (
          SELECT personnelID, MAX(timestamp) AS lastTimestamp
          FROM personnelStatusHistory
          GROUP BY personnelID
        ) lastStatus ON lastStatus.personnelID = p.personnelID
        WHERE 1=1
      `;

      const params = [];

      if (status !== undefined && status !== '') {
        const statusVal = parseInt(status, 10);
        if (!isNaN(statusVal) && (statusVal === 0 || statusVal === 1)) {
          sql += ' AND p.personnelStatus = ?';
          params.push(statusVal);
        }
      }

      if (eventType !== undefined && eventType !== '') {
        sql += ' AND p.eventType = ?';
        params.push(parseInt(eventType, 10));
      }

      if (roleGroup !== undefined && roleGroup !== '') {
        const roleGroupVal = parseInt(roleGroup, 10);
        if (!isNaN(roleGroupVal)) {
          sql += ' AND rg.rolegroupid = ?';
          params.push(roleGroupVal);
        }
      }

      if (role !== undefined && role !== '') {
        const roleVal = parseInt(role, 10);
        if (!isNaN(roleVal)) {
          sql += ' AND (p.role = ? OR p.roleid = ?)';
          params.push(roleVal, roleVal);
        }
      }

      if (search) {
        sql += ' AND (p.fname LIKE ? OR p.mname LIKE ? OR p.lname LIKE ? OR CAST(p.personnelID AS CHAR) LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ' ORDER BY created_at DESC';

      const [rows] = await db.promise.query(sql, params);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CVIRAA Athlete Tracker';
      const sheet = workbook.addWorksheet('Personnel Status');

      // Insert logo + header
      const fallbackLogoPath = path.join(uploadsDir, 'assets', 'OIP.jpg');
      try {
        if (fs.existsSync(fallbackLogoPath)) {
          const logoBuffer = fs.readFileSync(fallbackLogoPath);
          const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'jpg' });
          sheet.addImage(logoId, { tl: { col: 4, row: 0 }, ext: { width: 70, height: 70 } });
        }
      } catch (e) {
        // ignore missing logo
      }

      const headerText = [
        'Republic of the Philippines',
        'Department of Education',
        'REGION VII - CENTRAL VISAYAS',
        'Division of Lapu-Lapu City',
        '',
        'Information and Communication Unit - OSDS'
      ].join('\n');

      sheet.mergeCells(1, 1, 1, 4);
      const titleCell = sheet.getCell('A1');
      titleCell.value = headerText;
      titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      titleCell.font = { bold: true, size: 12 };
      sheet.getRow(1).height = 85;

      const headerRow = ['ID', 'Full Name', 'Role', 'Event Type', 'Status', 'Last Updated'];
      sheet.addRow(headerRow);
      const headerRowObj = sheet.getRow(sheet.lastRow.number);
      headerRowObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B983' } };
      headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      rows.forEach((person) => {
        const baseRoleName = person.rolename || getRoleName(person.role);
        const roleDisplay = person.eventTypeName ? `${baseRoleName} / ${person.eventTypeName}` : baseRoleName;
        const statusText = getStatusName(person.personnelStatus);
        const lastTs = person.lastStatusTimestamp ? new Date(person.lastStatusTimestamp).toLocaleString('en-CA', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        }) : '';

        sheet.addRow([
          person.personnelID,
          `${person.fname || ''} ${person.mname ? person.mname + ' ' : ''}${person.lname || ''}`.trim(),
          roleDisplay,
          person.eventTypeName || '',
          statusText,
          lastTs,
        ]);
      });

      sheet.getColumn(1).width = 10;
      sheet.getColumn(2).width = 28;
      sheet.getColumn(3).width = 24;
      sheet.getColumn(4).width = 18;
      sheet.getColumn(5).width = 12;
      sheet.getColumn(6).width = 20;

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `Personnel-Status-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      console.error('Error exporting personnel status via history route fallback:', err);
      return res.status(500).json({ error: err.message || 'Export failed' });
    }
  }

  const dateFrom = String(date).trim();
  const dateTo = dateFrom + " 23:59:59";

  let sql = `
    SELECT 
      h.personnelID,
      h.status,
      h.timestamp,
      p.fname,
      p.mname,
      p.lname,
      p.role,
      p.roleid,
      r.rolename,
      et.label AS eventTypeName
    FROM personnelStatusHistory h
    INNER JOIN personnel p ON h.personnelID = p.personnelID
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN event_types et ON p.eventType = et.eventTypeID
    WHERE h.timestamp >= ? AND h.timestamp <= ?
  `;
  const params = [dateFrom, dateTo];

  if (eventType !== undefined && eventType !== '') {
    sql += " AND p.eventType = ?";
    params.push(parseInt(eventType, 10));
  }
  if (role !== undefined && role !== '') {
    const roleVal = parseInt(role, 10);
    sql += " AND (p.role = ? OR p.roleid = ?)";
    params.push(roleVal, roleVal);
  }
  if (search) {
    sql += " AND (p.fname LIKE ? OR p.mname LIKE ? OR p.lname LIKE ? OR CAST(p.personnelID AS CHAR) LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  sql += " ORDER BY p.personnelID, h.timestamp ASC";

  try {
    const [rows] = await db.promise.query(sql, params);

    const mapRow = (record) => {
      const baseRoleName = record.rolename || getRoleName(record.role);
      const roleDisplay = record.eventTypeName
        ? `${baseRoleName} / ${record.eventTypeName}`
        : baseRoleName;
      return {
        personnelID: record.personnelID,
        fullName: `${record.fname} ${record.mname ? record.mname + ' ' : ''}${record.lname}`.trim(),
        roleName: roleDisplay,
        status: record.status,
        timestamp: record.timestamp
      };
    };

    const history = (rows || []).map(mapRow);

    // Group by personnelID, sort by timestamp ascending
    const byPerson = new Map();
    history.forEach((rec) => {
      if (!byPerson.has(rec.personnelID)) {
        byPerson.set(rec.personnelID, { fullName: rec.fullName, roleName: rec.roleName, records: [] });
      }
      byPerson.get(rec.personnelID).records.push({ status: rec.status, timestamp: rec.timestamp });
    });

    const formatTs = (ts) => {
      if (!ts) return '';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    // Build rows: Personnel, Role, In 1, Out 1, In 2, Out 2, ... (pair by time order)
    let maxPairs = 0;
    const dataRows = [];
    byPerson.forEach((person) => {
      const recs = person.records; // already in timestamp order from SQL
      const pairs = []; // [{ in: ts, out: ts }, ...]
      let i = 0;
      while (i < recs.length) {
        if (recs[i].status === 1) {
          // In: pair with next Out if present
          const outTs = (recs[i + 1] && recs[i + 1].status === 0) ? recs[i + 1].timestamp : null;
          pairs.push({ in: recs[i].timestamp, out: outTs });
          i += outTs ? 2 : 1;
        } else {
          // Out (no preceding In): leave In column empty
          pairs.push({ in: null, out: recs[i].timestamp });
          i += 1;
        }
      }
      if (pairs.length > maxPairs) maxPairs = pairs.length;
      dataRows.push({ fullName: person.fullName, roleName: person.roleName, pairs });
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CVIRAA Athlete Tracker';
    const sheet = workbook.addWorksheet('Time IN OUT History', { headerFooter: { firstHeader: `Date: ${dateFrom}` } });

    const totalColumns = 2 + maxPairs * 2;

    // Add a combined header row with logo + merged title cell (logo placed in column E)
    const logoPath = path.join(uploadsDir, 'assets', 'OIP.jpg');
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'jpg' });
        sheet.addImage(logoId, {
          tl: { col: 4, row: 0 },
          ext: { width: 70, height: 70 }
        });
      }
    } catch (e) {
      // ignore if logo missing
    }

    const letterheadText = [
      'Republic of the Philippines',
      'Department of Education',
      'REGION VII - CENTRAL VISAYAS',
      'Division of Lapu-Lapu City',
      '',
      'Information and Communication Unit - OSDS'
    ].join('\n');

    // Merge A1:D1 for the letterhead text so it doesn't overlap the logo in E1
    sheet.mergeCells(1, 1, 1, 4);
    const titleCell = sheet.getCell('A1');
    titleCell.value = letterheadText;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleCell.font = { bold: true, size: 12 };
    sheet.getRow(1).height = 85;

    const headerRow = ['Personnel', 'Role'];
    for (let n = 1; n <= maxPairs; n++) {
      headerRow.push(`In ${n}`, `Out ${n}`);
    }
    sheet.addRow(headerRow);
    const headerRowObj = sheet.getRow(sheet.lastRow.number);
    headerRowObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B983' } };
    headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    dataRows.forEach((row) => {
      const rowData = [row.fullName, row.roleName];
      for (let n = 0; n < maxPairs; n++) {
        const pair = row.pairs[n] || { in: null, out: null };
        rowData.push(pair.in ? formatTs(pair.in) : '', pair.out ? formatTs(pair.out) : '');
      }
      sheet.addRow(rowData);
    });

    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 22;
    for (let n = 3; n <= 2 + maxPairs * 2; n++) {
      sheet.getColumn(n).width = 18;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Time-IN-OUT-History-${dateFrom.replace(/\D/g, '-')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting Time IN/OUT History Excel:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// GET /personnel/:id/time-inout-report - Export individual personnel time in/out history as Excel
// Query params: date (optional; if not provided, shows all history)
router.get("/personnel/:id/time-inout-report", async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!id || !String(id).trim()) {
    return res.status(400).json({ error: "Personnel ID is required" });
  }

  const personnelID = parseInt(id, 10);
  if (isNaN(personnelID)) {
    return res.status(400).json({ error: "Invalid Personnel ID" });
  }

  let sql = `
    SELECT 
      h.statusHistoryID,
      h.personnelID,
      h.status,
      h.timestamp,
      p.fname,
      p.mname,
      p.lname,
      p.role,
      p.roleid,
      r.rolename,
      et.label AS eventTypeName
    FROM personnelStatusHistory h
    INNER JOIN personnel p ON h.personnelID = p.personnelID
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN event_types et ON p.eventType = et.eventTypeID
    WHERE h.personnelID = ?
  `;
  const params = [personnelID];

  // Add date filter if provided
  if (date) {
    sql += " AND DATE(h.timestamp) = DATE(?)";
    params.push(date);
  }

  sql += " ORDER BY h.timestamp ASC";

  try {
    const [rows] = await db.promise.query(sql, params);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No personnel or history found for the given ID" });
    }

    // Get personnel info from first record
    const firstRow = rows[0];
    const fullName = `${firstRow.fname} ${firstRow.mname ? firstRow.mname + ' ' : ''}${firstRow.lname}`.trim();
    const baseRoleName = firstRow.rolename || getRoleName(firstRow.role);
    const roleDisplay = firstRow.eventTypeName
      ? `${baseRoleName} / ${firstRow.eventTypeName}`
      : baseRoleName;

    // Extract history records
    const history = rows.map(record => ({
      status: record.status,
      timestamp: record.timestamp,
      statusName: record.status === 1 ? 'In' : 'Out'
    }));

    // Format timestamp helper
    const formatTs = (ts) => {
      if (!ts) return '';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('en-CA', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
      });
    };

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CVIRAA Athlete Tracker';
    const sheet = workbook.addWorksheet('Time IN OUT History');

    // Add title and personnel info
    sheet.addRow(['Individual Time IN/OUT Report']);
    const titleRow = sheet.getRow(1);
    titleRow.font = { bold: true, size: 14 };

    sheet.addRow(['Personnel:', fullName]);
    sheet.addRow(['Role:', roleDisplay]);
    sheet.addRow(['Generated:', new Date().toLocaleString()]);

    // Date info
    if (date) {
      sheet.addRow(['Date:', date]);
    } else {
      sheet.addRow(['Date:', 'All records']);
    }

    sheet.addRow([]); // Blank row

    // Add headers
    const headerRow = sheet.addRow(['Time', 'Status']);
    const headerRowObj = sheet.getRow(sheet.lastRow?.number);
    if (headerRowObj) {
      headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRowObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B983' } };
    }

    // Add data rows
    history.forEach((rec) => {
      const fullTimestamp = formatTs(rec.timestamp);
      const statusDisplay = rec.status === 1 ? 'IN' : 'OUT';
      const statusColor = rec.status === 1 ? 'FF28A745' : 'FFDC3545';

      const dataRow = sheet.addRow([fullTimestamp, statusDisplay]);
      const statusCell = dataRow.getCell(2);
      statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
    });

    // Style columns
    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 12;

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = date ? date.replace(/\D/g, '-') : 'all';
    const filename = `Individual-Report-${fullName.replace(/\s+/g, '-')}-${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting individual personnel time in/out report:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// GET /personnel/export-status-excel - Export Personnel IN/OUT Status list as Excel (with letterhead + logo)
router.get('/personnel/export-status-excel', async (req, res) => {
  console.log('[debug] personnel/export-status-excel route called', req.query);
  const { status, role, roleGroup, eventType, search } = req.query;

  let sql = `
    SELECT 
      p.personnelID,
      p.fname,
      p.mname,
      p.lname,
      COALESCE(p.roleid, p.role) as role,
      p.roleid,
      p.roleType,
      p.eventType,
      p.personnelStatus,
      r.rolename,
      rg.rolegroupid,
      rg.rolegroupname,
      et.label AS eventTypeName,
      lastStatus.lastTimestamp AS lastStatusTimestamp
    FROM personnel p
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
    LEFT JOIN event_types et ON p.eventType = et.eventTypeID
    LEFT JOIN (
      SELECT personnelID, MAX(timestamp) AS lastTimestamp
      FROM personnelStatusHistory
      GROUP BY personnelID
    ) lastStatus ON lastStatus.personnelID = p.personnelID
    WHERE 1=1
  `;

  const params = [];

  if (role !== undefined && role !== '') {
    const roleVals = String(role).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (roleVals.length > 0) {
      const placeholders = roleVals.map(() => '?').join(',');
      sql += ` AND (p.roleid IN (${placeholders}) OR p.role IN (${placeholders}))`;
      params.push(...roleVals, ...roleVals);
    }
  }

  if (roleGroup !== undefined && roleGroup !== '') {
    const roleGroupVals = String(roleGroup).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (roleGroupVals.length > 0) {
      sql += ` AND rg.rolegroupid IN (${roleGroupVals.map(() => '?').join(',')})`;
      params.push(...roleGroupVals);
    }
  }

  if (eventType !== undefined && eventType !== '') {
    sql += ' AND p.eventType = ?';
    params.push(parseInt(eventType, 10));
  }

  if (status !== undefined && status !== '') {
    const statusVal = parseInt(status, 10);
    if (!isNaN(statusVal) && (statusVal === 0 || statusVal === 1)) {
      sql += ' AND p.personnelStatus = ?';
      params.push(statusVal);
    }
  }

  if (search) {
    sql += ' AND (p.fname LIKE ? OR p.mname LIKE ? OR p.lname LIKE ? OR CAST(p.personnelID AS CHAR) LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  sql += ' ORDER BY created_at DESC';

  try {
    const [rows] = await db.promise.query(sql, params);

    // Build the Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CVIRAA Athlete Tracker';
    const sheet = workbook.addWorksheet('Personnel Status');

    // Insert logo + merged header cell (logo placed in column E)
    const logoPath = path.join(uploadsDir, 'assets', 'OIP.jpg');
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'jpg' });
        sheet.addImage(logoId, {
          tl: { col: 4, row: 0 },
          ext: { width: 70, height: 70 }
        });
      }
    } catch (e) {
      // ignore missing logo
    }

    const headerText = [
      'Republic of the Philippines',
      'Department of Education',
      'REGION VII - CENTRAL VISAYAS',
      'Division of Lapu-Lapu City',
      '',
      'Information and Communication Unit - OSDS'
    ].join('\n');

    // Merge A1:D1 for the letterhead text so it doesn't overlap the logo in E1
    sheet.mergeCells(1, 1, 1, 4);
    const titleCell = sheet.getCell('A1');
    titleCell.value = headerText;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleCell.font = { bold: true, size: 12 };
    sheet.getRow(1).height = 85;

    // Add header row
    const headerRow = ['ID', 'Full Name', 'Role', 'Role Type', 'Event Type', 'Status', 'Last Updated'];
    sheet.addRow(headerRow);
    const headerRowObj = sheet.getRow(sheet.lastRow.number);
    headerRowObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B983' } };
    headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const eventRoleCounts = new Map();
    const allRoles = new Set();

    rows.forEach((person) => {
      const baseRoleName = person.rolename || getRoleName(person.role);
      const eventTypeName = person.eventTypeName || 'Unspecified';
      const roleType = person.roleType || '';
      const roleDisplay = roleType ? `${baseRoleName} / ${roleType}` : baseRoleName;
      const statusText = getStatusName(person.personnelStatus);
      const lastTs = person.lastStatusTimestamp
        ? new Date(person.lastStatusTimestamp).toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        : '';

      sheet.addRow([
        person.personnelID,
        `${person.fname || ''} ${person.mname ? person.mname + ' ' : ''}${person.lname || ''}`.trim(),
        roleDisplay,
        person.roleType || '',
        eventTypeName,
        statusText,
        lastTs,
      ]);

      allRoles.add(baseRoleName);
      if (!eventRoleCounts.has(eventTypeName)) {
        eventRoleCounts.set(eventTypeName, new Map());
      }
      const eventMap = eventRoleCounts.get(eventTypeName);
      if (!eventMap.has(baseRoleName)) {
        eventMap.set(baseRoleName, { in: 0, out: 0 });
      }
      const roleCount = eventMap.get(baseRoleName);
      if (person.personnelStatus === 1) {
        roleCount.in += 1;
      } else if (person.personnelStatus === 0) {
        roleCount.out += 1;
      }
    });

    sheet.getColumn(1).width = 10;
    sheet.getColumn(2).width = 28;
    sheet.getColumn(3).width = 24;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 12;
    sheet.getColumn(7).width = 20;

    // Event/Role summary sheet
    const summarySheet = workbook.addWorksheet('Event-Role Summary');
    const sortedRoles = Array.from(allRoles).sort((a, b) => a.localeCompare(b));
    const summaryHeaders = ['Event Type', ...sortedRoles.flatMap((r) => [`${r}-IN`, `${r}-OUT`])];
    summarySheet.addRow(summaryHeaders);
    const summaryHeaderRow = summarySheet.getRow(1);
    summaryHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B983' } };
    summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    Array.from(eventRoleCounts.keys()).sort((a, b) => a.localeCompare(b)).forEach((eventTypeName) => {
      const rowData = [eventTypeName];
      const eventMap = eventRoleCounts.get(eventTypeName);
      sortedRoles.forEach((roleName) => {
        const roleCount = eventMap.get(roleName) || { in: 0, out: 0 };
        rowData.push(roleCount.in, roleCount.out);
      });
      summarySheet.addRow(rowData);
    });

    summarySheet.getColumn(1).width = 22;
    for (let i = 2; i <= 1 + sortedRoles.length * 2; i++) {
      summarySheet.getColumn(i).width = 14;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Personnel-Status-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting personnel status Excel:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// =================== ROLE ROUTES ===================

// GET /roles - Get all roles with their roleGroups
router.get("/roles", (req, res) => {
  const sql = `
    SELECT 
      r.roleid,
      r.rolename,
      r.rolegroupid,
      rg.rolegroupname
    FROM role r
    INNER JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
    ORDER BY rg.rolegroupid, r.roleid
  `;

  db.query(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching roles:", err);
      return res.status(500).json({ error: err.message });
    }

    // Group by roleGroup for easier frontend consumption
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.rolegroupname]) {
        grouped[row.rolegroupname] = {
          rolegroupid: row.rolegroupid,
          rolegroupname: row.rolegroupname,
          roles: []
        };
      }
      grouped[row.rolegroupname].roles.push({
        roleid: row.roleid,
        rolename: row.rolename
      });
    });

    res.json({
      success: true,
      roles: rows,
      grouped: Object.values(grouped)
    });
  });
});

// GET /rolegroups - Get all roleGroups
router.get("/rolegroups", (req, res) => {
  const sql = `
    SELECT 
      rolegroupid,
      rolegroupname
    FROM roleGroup
    ORDER BY rolegroupid
  `;

  db.query(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching roleGroups:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({
      success: true,
      roleGroups: rows
    });
  });
});

// =================== DASHBOARD ROUTES ===================

// GET /dashboard/stats - Overview counts: total personnel, currently IN/OUT, by role group, by role
router.get("/dashboard/stats", (req, res) => {
  const totalSql = "SELECT COUNT(*) as total FROM personnel";
  const statusSql = "SELECT COALESCE(personnelStatus, 0) as st, COUNT(*) as cnt FROM personnel GROUP BY COALESCE(personnelStatus, 0)";
  const byRoleSql = `
    SELECT 
      rg.rolegroupname,
      rg.rolegroupid,
      r.roleid,
      r.rolename,
      COUNT(p.personnelID) as count
    FROM personnel p
    LEFT JOIN role r ON r.roleid = COALESCE(p.role, p.roleid)
    LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
    GROUP BY rg.rolegroupid, rg.rolegroupname, r.roleid, r.rolename
    ORDER BY rg.rolegroupid, r.roleid
  `;

  db.query(totalSql, [], (err, totalRows) => {
    if (err) {
      console.error("Error fetching dashboard total:", err);
      return res.status(500).json({ error: err.message });
    }
    const total = (totalRows && totalRows[0] && totalRows[0].total) ? parseInt(totalRows[0].total, 10) : 0;

    db.query(statusSql, [], (err, statusRows) => {
      if (err) {
        console.error("Error fetching dashboard status:", err);
        return res.status(500).json({ error: err.message });
      }
      let currentlyIn = 0;
      let currentlyOut = 0;
      (statusRows || []).forEach((row) => {
        const cnt = parseInt(row.cnt, 10) || 0;
        if (parseInt(row.st, 10) === 1) currentlyIn = cnt;
        else currentlyOut += cnt;
      });

      db.query(byRoleSql, [], (err, roleRows) => {
        if (err) {
          console.error("Error fetching dashboard by role:", err);
          return res.status(500).json({ error: err.message });
        }

        const byRoleGroup = {};
        (roleRows || []).forEach((row) => {
          const groupName = row.rolegroupname || "Unknown";
          if (!byRoleGroup[groupName]) {
            byRoleGroup[groupName] = {
              rolegroupname: groupName,
              rolegroupid: row.rolegroupid,
              total: 0,
              roles: []
            };
          }
          const count = parseInt(row.count, 10) || 0;
          byRoleGroup[groupName].total += count;
          byRoleGroup[groupName].roles.push({
            roleid: row.roleid,
            rolename: row.rolename || "Unknown",
            count
          });
        });

        res.json({
          success: true,
          totalPersonnel: total,
          currentlyIn,
          currentlyOut,
          byRoleGroup: Object.values(byRoleGroup)
        });
      });
    });
  });
});

// =================== COOLDOWN ROUTES ===================

// GET /cooldown/settings - Get cooldown settings (in minutes)
router.get("/cooldown/settings", (req, res) => {
  const sql = `
    SELECT COALESCE(cooldownCount, 1) as cooldownCount
    FROM cooldown
    LIMIT 1
  `;

  db.query(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching cooldown settings:", err);
      return res.status(500).json({ error: err.message });
    }

    const cooldownCount = rows && rows.length > 0 ? rows[0].cooldownCount : 1;
    res.json({
      success: true,
      cooldownCount: cooldownCount
    });
  });
});

// POST /cooldown/settings - Update cooldown settings (in minutes)
router.post("/cooldown/settings", async (req, res) => {
  const { cooldownCount } = req.body;

  // Validate input
  if (!cooldownCount || isNaN(cooldownCount) || cooldownCount < 1 || cooldownCount > 60) {
    return res.status(400).json({ 
      error: 'Invalid cooldown value. Must be between 1 and 60 minutes' 
    });
  }

  try {
    // Check if record exists
    const checkSql = 'SELECT id FROM cooldown LIMIT 1';
    
    db.query(checkSql, [], (err, rows) => {
      if (err) {
        console.error("Error checking cooldown record:", err);
        return res.status(500).json({ error: err.message });
      }

      let updateSql;
      if (rows && rows.length > 0) {
        // Update existing record
        updateSql = 'UPDATE cooldown SET cooldownCount = ? WHERE id = ?';
        db.query(updateSql, [cooldownCount, rows[0].id], (err) => {
          if (err) {
            console.error("Error updating cooldown settings:", err);
            return res.status(500).json({ error: err.message });
          }
          res.json({
            success: true,
            message: 'Cooldown settings updated successfully',
            cooldownCount: cooldownCount
          });
        });
      } else {
        // Insert new record
        updateSql = 'INSERT INTO cooldown (cooldownCount) VALUES (?)';
        db.query(updateSql, [cooldownCount], (err) => {
          if (err) {
            console.error("Error creating cooldown settings:", err);
            return res.status(500).json({ error: err.message });
          }
          res.json({
            success: true,
            message: 'Cooldown settings created successfully',
            cooldownCount: cooldownCount
          });
        });
      }
    });
  } catch (error) {
    console.error("Error updating cooldown settings:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

