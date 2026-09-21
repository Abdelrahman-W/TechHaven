import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Migration Metadata Helper
 */
export function computeChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Reads and orders all UP migration files from the target directory.
 */
export function loadMigrationFiles(migrationsDir = path.resolve(process.cwd(), 'database/migrations')) {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir);
  const upFiles = files
    .filter(f => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort((a, b) => a.localeCompare(b));

  return upFiles.map(filename => {
    const filePath = path.join(migrationsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = computeChecksum(content);
    return {
      name: filename,
      path: filePath,
      content,
      checksum,
    };
  });
}

/**
 * Core Migration Engine
 */
export class MigrationRunner {
  constructor(options = {}) {
    this.migrationsDir = options.migrationsDir || path.resolve(process.cwd(), 'database/migrations');
    this.driver = options.driver || 'memory'; // 'postgres' | 'supabase' | 'memory'
    this.client = options.client || null;
    this.appliedMap = new Map(); // name -> { name, checksum, applied_at }
  }

  /**
   * Initializes the migrations tracking table / store.
   */
  async init() {
    if (this.driver === 'postgres' && this.client) {
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS public._migrations (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          checksum TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      const res = await this.client.query('SELECT name, checksum, applied_at FROM public._migrations ORDER BY id ASC;');
      for (const row of res.rows) {
        this.appliedMap.set(row.name, {
          name: row.name,
          checksum: row.checksum,
          applied_at: row.applied_at,
        });
      }
    }
  }

  /**
   * Returns current migration status for all files.
   */
  async getStatus() {
    await this.init();
    const files = loadMigrationFiles(this.migrationsDir);
    
    return files.map(file => {
      const appliedRecord = this.appliedMap.get(file.name);
      const isApplied = Boolean(appliedRecord);
      const checksumMatch = isApplied ? appliedRecord.checksum === file.checksum : null;

      return {
        name: file.name,
        checksum: file.checksum,
        applied: isApplied,
        appliedAt: appliedRecord ? appliedRecord.applied_at : null,
        checksumMatch,
      };
    });
  }

  /**
   * Runs all pending migrations in deterministic order.
   */
  async up() {
    await this.init();
    const files = loadMigrationFiles(this.migrationsDir);
    const results = {
      applied: [],
      skipped: [],
      failed: null,
    };

    for (const file of files) {
      const existing = this.appliedMap.get(file.name);
      if (existing) {
        if (existing.checksum !== file.checksum) {
          throw new Error(`Migration checksum mismatch for "${file.name}". Expected ${existing.checksum}, got ${file.checksum}. Modifications to applied migrations are forbidden.`);
        }
        results.skipped.push(file.name);
        continue;
      }

      // Execute migration
      try {
        if (this.driver === 'postgres' && this.client) {
          await this.client.query('BEGIN');
          await this.client.query(file.content);
          await this.client.query(
            'INSERT INTO public._migrations (name, checksum, applied_at) VALUES ($1, $2, now())',
            [file.name, file.checksum]
          );
          await this.client.query('COMMIT');
        }

        const record = {
          name: file.name,
          checksum: file.checksum,
          applied_at: new Date().toISOString(),
        };
        this.appliedMap.set(file.name, record);
        results.applied.push(file.name);
      } catch (err) {
        if (this.driver === 'postgres' && this.client) {
          try {
            await this.client.query('ROLLBACK');
          } catch { /* ignore rollback errors */ }
        }
        results.failed = {
          file: file.name,
          error: err.message,
        };
        throw new Error(`Failed executing migration "${file.name}": ${err.message}`);
      }
    }

    return results;
  }
}
