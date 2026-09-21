import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'server/data/store.json');
const BACKUP_DIR = path.resolve(process.cwd(), 'server/data/backups');

export async function createBackup() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      console.log('ℹ️ No local store.json found yet to back up.');
      return;
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `store-backup-${timestamp}.json`);

    fs.copyFileSync(DB_FILE, backupFile);
    console.log(`✅ Backup successfully created at: ${backupFile}`);

    // Prune old backups keeping only the latest 30 snapshots
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('store-backup-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 30) {
      const toDelete = files.slice(30);
      for (const item of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, item.name));
      }
      console.log(`🧹 Cleaned up ${toDelete.length} old backup(s) (retaining latest 30).`);
    }
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
  }
}

// If executed directly from command line
if (process.argv[1]?.endsWith('backup.js')) {
  createBackup();
}
