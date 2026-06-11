const express = require('express');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Backup } = require('../models');

const router = express.Router();

router.use(auth);

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  next();
};

const getBackupDir = () => path.join(__dirname, '../uploads/backups');

const getDatabasePath = () => {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }

  return path.join(__dirname, '../database/development.sqlite');
};

const ensureBackupDir = () => {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
};

const createBackupSnapshot = (title) => {
  const databasePath = getDatabasePath();
  if (!fs.existsSync(databasePath)) {
    throw new Error(`Database file not found at ${databasePath}`);
  }

  const backupDir = ensureBackupDir();
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9_-]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const backupName = `${Date.now()}-${safeTitle || 'database'}-snapshot.sqlite`;
  const backupPath = path.join(backupDir, backupName);

  fs.copyFileSync(databasePath, backupPath);

  return {
    backupName,
    backupPath,
    backupSize: fs.statSync(backupPath).size,
  };
};

const formatBackup = (backup, req) => {
  const backupData = backup.toJSON();
  const origin = `${req.protocol}://${req.get('host')}`;
  const downloadUrl = `${origin}${req.baseUrl}/${backupData.id}/download`;

  return {
    ...backupData,
    download_url: downloadUrl,
    file_name: backupData.backup_name || backupData.backup_path || backupData.image_path || null,
    file_size: backupData.backup_size || null,
    backup_kind: backupData.backup_format || (backupData.backup_path ? 'sqlite' : 'image'),
  };
};

router.get('/', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const backups = await Backup.findAll({
      order: [['createdAt', 'DESC']],
      limit,
    });

    res.json(backups.map((backup) => formatBackup(backup, req)));
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups.' });
  }
});

router.get('/:id/download', requireAdmin, async (req, res) => {
  try {
    const backup = await Backup.findByPk(req.params.id);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found.' });
    }

    const filePath = backup.backup_path
      ? path.join(getBackupDir(), backup.backup_path)
      : (backup.image_path ? path.join(__dirname, '..', 'public', 'assets', backup.image_path) : null);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found.' });
    }

    res.download(filePath, backup.backup_name || path.basename(filePath));
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup.' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();

    if (!title) {
      return res.status(400).json({ error: 'title is required.' });
    }

    const snapshot = createBackupSnapshot(title);

    const backup = await Backup.create({
      title,
      description,
      backup_path: snapshot.backupName,
      backup_name: snapshot.backupName,
      backup_size: snapshot.backupSize,
      backup_format: 'sqlite',
      uploaded_by: req.user?.userId || null,
    });

    res.status(201).json(formatBackup(backup, req));
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup snapshot.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const backup = await Backup.findByPk(req.params.id);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found.' });
    }

    const filePath = backup.backup_path
      ? path.join(getBackupDir(), backup.backup_path)
      : (backup.image_path ? path.join(__dirname, '..', 'public', 'assets', backup.image_path) : null);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await backup.destroy();

    res.json({ message: 'Backup deleted successfully.' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup.' });
  }
});

module.exports = router;