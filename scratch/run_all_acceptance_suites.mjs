import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import http from 'http';

const baselineMd5 = '34e2394b5c02a873ee55841d332baec6';
const storePath = path.resolve(process.cwd(), 'server/data/store.json');
let activeServer = null;

function startServerProcess() {
  return spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '4000',
      NODE_ENV: 'development',
      CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173,https://techhaven.eg'
    },
    stdio: 'ignore'
  });
}

async function stopServerProcess(server) {
  if (!server || server.killed) return;
  server.kill();
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function getStoreMd5() {
  return crypto.createHash('md5').update(fs.readFileSync(storePath)).digest('hex');
}

function restoreStore() {
  const fixturePath = path.resolve(process.cwd(), 'scratch/baseline_store.json');
  if (fs.existsSync(fixturePath)) {
    try {
      fs.writeFileSync(storePath, fs.readFileSync(fixturePath, 'utf8'), 'utf8');
    } catch (e) {
      // If held by active process on Windows, ignore non-critical restore error between test passes
    }
  }
}

function checkServer(port = 4000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => { req.destroy(); resolve(false); });
  });
}

function waitForServer(port = 4000, maxWaitMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      const ok = await checkServer(port);
      if (ok) return resolve(true);
      if (Date.now() - start > maxWaitMs) return reject(new Error('Server start timeout'));
      setTimeout(check, 100);
    };
    check();
  });
}

async function ensureServerRunning() {
  const isUp = await checkServer(4000);
  if (!isUp) {
    console.log('Re-spawning test server on port 4000...');
    const server = startServerProcess();
    activeServer = server;
    await waitForServer(4000).catch(() => {});
  }
}

const suites = [
  // Launch Readiness & Journey Suites
  { name: 'Customer Journey E2E', path: 'scratch/test_customer_journeys_e2e.mjs' },
  { name: 'Product Validation & Edge States', path: 'scratch/test_product_validation.mjs' },
  { name: 'Resilience & Failure Recovery', path: 'scratch/test_resilience.mjs' },
  { name: 'Admin Completion & Social Config', path: 'scratch/test_admin_completion.mjs' },
  { name: 'Admin 5 Gaps Closure', path: 'scratch/test_admin_gaps_closure.mjs' },
  { name: 'RBAC Route Enforcement', path: 'scratch/test_rbac_route_enforcement.mjs' },
  { name: 'Inventory Ledger Concurrency', path: 'scratch/test_inventory_ledger_concurrency.mjs' },
  { name: 'Suppliers & Purchasing Domain', path: 'scratch/test_suppliers_purchasing.mjs' },
  { name: 'Receiving & Weighted Average Cost', path: 'scratch/test_receiving_wac.mjs' },
  { name: 'Reorder Intelligence Domain', path: 'scratch/test_reorder_intelligence.mjs' },
  { name: 'B2B Customer Balances (B07)', path: 'scratch/test_b2b_balances.mjs' },
  { name: 'Automation & Operational Alerts (B08)', path: 'scratch/test_automation_alerts.mjs' },
  { name: 'Reporting & Executive Analytics (B09)', path: 'scratch/test_reports_executive_analytics.mjs' },

  // P2 Hardening Suites
  { name: 'P2-SEC-01 (CSP Headers)', path: 'scratch/test_csp_headers.mjs' },
  { name: 'P2-OBS-01 (Observability & Request ID)', path: 'scratch/test_observability.mjs' },
  { name: 'P2-OPS-01 (Migration Runner)', path: 'scratch/test_migration_runner.mjs' },
  { name: 'P2-SEO-01 (Robots & Sitemap)', path: 'scratch/test_seo.mjs' },
  { name: 'P2-A11Y-01 (Skip to Content A11y)', path: 'scratch/test_a11y_skip.mjs' },

  // P2 Reviews
  { name: 'P2-REL-01 (Reviews Persistence)', path: 'scratch/p2-rel01/test_reviews_persistence_suite.mjs' },
  { name: 'P2-API-01 (Reviews Contract)', path: 'scratch/p2-api01/test_reviews_route_contract.mjs' },

  // P1 Suites
  { name: 'P1-01 (Order Contract)', path: 'scratch/p1-01/test_order_contract.mjs' },
  { name: 'P1-01 (Phase 3 Integration)', path: 'scratch/p1-01/test_phase3_integration.mjs' },
  { name: 'P1-01 (Stock Concurrency)', path: 'scratch/p1-01/test_stock_concurrency.mjs' },
  { name: 'P1-01 (Supabase RPC)', path: 'scratch/p1-01/test_supabase_rpc.mjs' },
  { name: 'P1-02 (Local Fallback Topology)', path: 'scratch/p1-02/test_local_fallback_topology.mjs' },
  { name: 'P1-03 (Rate Limiter Integration)', path: 'scratch/p1-03/test_rate_limiter_integration.mjs' },
  { name: 'P1-03 (Rate Limit Store)', path: 'scratch/p1-03/test_rate_limit_store.mjs' },

  // Static / Cache / Security Suites
  { name: 'SCA-1 (Static Code Analysis)', path: 'scratch/test_sca1.mjs' },
  { name: 'SCA-3.1 (Cache Management)', path: 'scratch/test_sca3_1.mjs' },
  { name: 'SCA-3.2 (Cache TTL & Isolation)', path: 'scratch/test_sca3_2.mjs' },
  { name: 'SCA-3.3 (Cross-Process Invalidation)', path: 'scratch/test_sca3_3.mjs' },
  { name: 'SEC-1 (Auth Security)', path: 'scratch/test_sec1_auth.mjs' },
  { name: 'SEC-2 (CORS & Headers)', path: 'scratch/test_sec2_cors.mjs' },
  { name: 'Wishlist Security (IDOR)', path: 'scratch/test_wishlist_security.mjs' },
  { name: 'P0-1 Persistence', path: 'scratch/test_p0_1_persistence.mjs' },
];

async function run() {
  console.log('=== FULL PRODUCTION ACCEPTANCE SUITE EXECUTION ===\n');

  // Check if server is running on 4000, if not spawn one
  let serverProcess = null;
  const isRunning = await checkServer(4000);
  if (!isRunning) {
    console.log('Starting test server on port 4000...');
    serverProcess = startServerProcess();
    await waitForServer(4000);
    console.log('✓ Test server ready on port 4000.\n');
  }

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  try {
    for (const suite of suites) {
      await waitForServer(4000).catch(() => {});
      // Ensure server is genuinely healthy before running next suite
      const healthCheck = await checkServer(4000);
      if (!healthCheck) await ensureServerRunning();
      if (serverProcess) {
        await stopServerProcess(serverProcess);
        serverProcess = null;
      }
      restoreStore();
      serverProcess = startServerProcess();
      await waitForServer(4000);
      // Restart the test server if it crashed due to a test expecting a specific running state
      await ensureServerRunning();
      const start = Date.now();
      const res = spawnSync(process.execPath, [suite.path], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: '4000',
          NODE_ENV: 'development',
          CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173,https://techhaven.eg'
        },
        encoding: 'utf8',
        timeout: 45000,
      });
      const dur = Date.now() - start;
      const passed = res.status === 0;
      if (passed) passedCount++;
      else failedCount++;

      results.push({
        name: suite.name,
        path: suite.path,
        passed,
        durationMs: dur,
        error: passed ? null : (res.stderr || res.stdout || 'Failed with exit code ' + res.status),
      });

      const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`[${statusIcon}] ${suite.name.padEnd(38)} (${dur}ms)`);
    }
  } finally {
    await stopServerProcess(serverProcess);
  }

  // Restore store.json to baseline MD5
  restoreStore();
  const finalMd5 = getStoreMd5();
  const md5Match = finalMd5 === baselineMd5;

  console.log('\n==================================================');
  console.log(`TOTAL SUITES: ${suites.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log(`STORE.JSON MD5: ${finalMd5} (${md5Match ? 'MATCHES BASELINE' : 'MISMATCH'})`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    console.log('--- Failure Details ---');
    for (const r of results) {
      if (!r.passed) {
        console.log(`\n❌ ${r.name} (${r.path}):\n${r.error.slice(0, 500)}`);
      }
    }
  }

  return { results, passedCount, failedCount, finalMd5, md5Match };
}

run().catch(console.error);
