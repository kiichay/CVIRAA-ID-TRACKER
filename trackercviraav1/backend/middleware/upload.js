const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../dbConnect');

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

const profileBaseDir = path.join(uploadsDir, 'profile');
if (!fs.existsSync(profileBaseDir)) {
  fs.mkdirSync(profileBaseDir, { recursive: true });
}

const EVENT_TYPE_LABELS = [
  'Archery',
  'Arnis',
  'Athletics(Intellectual)',
  'Athletics(Track&Field)',
  'Athletics(Visual)',
  'Badminton',
  'Baseball',
  'Basketball',
  'Billiard',
  'BOCCE(Intellectual)',
  'Boxing',
  'Chess',
  'Dancesport',
  'Football',
  'Futsal',
  'Gymnastics (Aerobic)',
  'Gymnastics (Mens Artistic)',
  'Gymnastics (Rhythmic)',
  'Gymnastics (Womens Artistic)',
  'Lawn Tennis',
  'Sepak Takraw',
  'Softball',
  'Special Events BOCCE',
  'Swimming',
  'Table Tennis',
  'Taekwondo',
  'Volleyball'
];

function slugifyFolderName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

async function resolveEventType(req) {
  // 1) Use eventType from body if present (create + update w/ eventType)
  if (req.body && req.body.eventType !== undefined && req.body.eventType !== null && `${req.body.eventType}` !== '') {
    const n = parseInt(req.body.eventType, 10);
    if (!isNaN(n)) return n;
  }

  // 2) For update, if eventType not provided, read existing from DB
  const id = parseInt(req.params?.personnelID, 10);
  if (!id || isNaN(id)) return null;

  try {
    const [rows] = await db.promise.query('SELECT eventType FROM personnel WHERE personnelID = ? LIMIT 1', [id]);
    if (rows && rows[0] && rows[0].eventType !== undefined && rows[0].eventType !== null) {
      const n = parseInt(rows[0].eventType, 10);
      if (!isNaN(n)) return n;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function resolveRoleInfo(req) {
  // Prefer explicit roleid from body (create + update)
  const roleIdRaw =
    (req.body && req.body.roleid !== undefined && req.body.roleid !== null && `${req.body.roleid}` !== '')
      ? req.body.roleid
      : (req.body && req.body.role !== undefined && req.body.role !== null && `${req.body.role}` !== '')
        ? req.body.role
        : null;

  const roleId = roleIdRaw !== null ? parseInt(roleIdRaw, 10) : null;

  // If we have a numeric roleId, try the new tables first.
  if (roleId !== null && !isNaN(roleId)) {
    try {
      const [rows] = await db.promise.query(
        `SELECT rg.rolegroupname, r.rolename
         FROM role r
         INNER JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
         WHERE r.roleid = ?
         LIMIT 1`,
        [roleId]
      );
      if (rows && rows[0]) {
        return { roleid: roleId, roleGroupName: rows[0].rolegroupname || null, roleName: rows[0].rolename || null };
      }
    } catch (e) {
      // ignore (older installs may not have role tables)
    }

    // Old structure fallback mapping
    if (roleId >= 0 && roleId <= 2) return { roleid: roleId, roleGroupName: 'Sports', roleName: null };
    if (roleId === 3 || roleId === 4) return { roleid: roleId, roleGroupName: 'Officials', roleName: null };
    if (roleId >= 5 && roleId <= 7) return { roleid: roleId, roleGroupName: 'Committee', roleName: null };
  }

  // If still unknown, and we're updating, read from DB (roleid + join)
  const id = parseInt(req.params?.personnelID, 10);
  if (!id || isNaN(id)) return { roleid: null, roleGroupName: null, roleName: null };

  try {
    const [rows] = await db.promise.query(
      `SELECT p.roleid, p.role,
              rg.rolegroupname, r.rolename
       FROM personnel p
       LEFT JOIN role r ON p.roleid = r.roleid
       LEFT JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
       WHERE p.personnelID = ?
       LIMIT 1`,
      [id]
    );
    if (rows && rows[0]) {
      const rid = rows[0].roleid !== null && rows[0].roleid !== undefined ? parseInt(rows[0].roleid, 10) : null;
      const legacy = rows[0].role !== null && rows[0].role !== undefined ? parseInt(rows[0].role, 10) : null;

      // Prefer joined names if available
      if (rows[0].rolegroupname || rows[0].rolename) {
        return { roleid: rid, roleGroupName: rows[0].rolegroupname || null, roleName: rows[0].rolename || null };
      }

      // Legacy mapping
      const r = legacy !== null && !isNaN(legacy) ? legacy : rid;
      if (r !== null && !isNaN(r)) {
        if (r >= 0 && r <= 2) return { roleid: r, roleGroupName: 'Sports', roleName: null };
        if (r === 3 || r === 4) return { roleid: r, roleGroupName: 'Officials', roleName: null };
        if (r >= 5 && r <= 7) return { roleid: r, roleGroupName: 'Committee', roleName: null };
      }
    }
  } catch (e) {
    // ignore
  }

  return { roleid: null, roleGroupName: null, roleName: null };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Put profile uploads under:
    // - Sports:    /uploads/profile/<eventType-name>/
    // - Officials: /uploads/profile/Officials/
    // - Committee: /uploads/profile/<role-name>-Committee/
    (async () => {
      const roleInfo = await resolveRoleInfo(req);
      const groupName = String(roleInfo?.roleGroupName || '').trim();
      const groupLower = groupName.toLowerCase();

      if (groupLower === 'officials') {
        const dest = path.join(profileBaseDir, 'Officials');
        ensureDir(dest);
        cb(null, dest);
        return;
      }

      if (groupLower === 'committee') {
        const roleName = String(roleInfo?.roleName || '').trim();
        const label = roleName ? `${roleName} Committee` : 'Committee';
        const folder = slugifyFolderName(label) || 'committee';
        const dest = path.join(profileBaseDir, folder);
        ensureDir(dest);
        cb(null, dest);
        return;
      }

      // Default to Sports/eventType folder
      const eventTypeNum = await resolveEventType(req);
      const label = (eventTypeNum !== null && EVENT_TYPE_LABELS[eventTypeNum]) ? EVENT_TYPE_LABELS[eventTypeNum] : 'unknown-event';
      const folder = slugifyFolderName(label) || 'unknown-event';
      const dest = path.join(profileBaseDir, folder);
      ensureDir(dest);
      cb(null, dest);
    })().catch(() => {
      // fallback
      ensureDir(profileBaseDir);
      cb(null, profileBaseDir);
    });
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `profile-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    req.fileValidationError = 'Only image files are allowed (jpeg, jpg, png, gif, webp)';
    cb(null, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Export single file upload middleware
module.exports = upload.single('picture');
