#!/usr/bin/env node
import { MigrationRunner } from '../lib/migrations.js';

async function main() {
  const command = process.argv[2] || 'status';
  const runner = new MigrationRunner();

  if (command === 'status') {
    console.log('=== TechHaven Database Migration Status ===\n');
    const status = await runner.getStatus();
    if (status.length === 0) {
      console.log('No migration files found in database/migrations/.');
      return;
    }
    for (const m of status) {
      const mark = m.applied ? '✓ APPLIED' : '○ PENDING';
      console.log(`[${mark}] ${m.name} (Checksum: ${m.checksum.slice(0, 8)})`);
    }
  } else if (command === 'up') {
    console.log('=== Running Pending Migrations ===\n');
    const res = await runner.up();
    console.log(`Applied: ${res.applied.length}, Skipped: ${res.skipped.length}`);
    for (const name of res.applied) {
      console.log(`  ✓ Applied: ${name}`);
    }
  } else {
    console.error(`Unknown command: ${command}. Use "status" or "up".`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
