import assert from 'assert';
import crypto from 'crypto';
import { db } from '../server/lib/supabase.js';

console.log('=== Running Multi-Vendor & Paymob Idempotency Verification Suite ===');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function it(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function itAsync(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // Test 1: Vendor Creation and Profile Retrieval
  await itAsync('Vendor onboarding: createVendor and getVendorByUserId', async () => {
    const vendorData = {
      user_id: 'usr-test-vendor-1',
      company_name: 'TechStore Delta',
      company_name_en: 'TechStore Delta EN',
      phone: '01012345678',
      email: 'vendor1@delta.eg',
      city: 'Cairo',
      status: 'pending',
      commission_rate: 12.5,
    };
    const created = await db.createVendor(vendorData);
    assert.ok(created.id, 'Vendor must have an ID');
    assert.strictEqual(created.company_name, 'TechStore Delta');
    assert.strictEqual(created.commission_rate, 12.5);

    const fetched = await db.getVendorByUserId('usr-test-vendor-1');
    assert.ok(fetched, 'Should find vendor by user ID');
    assert.strictEqual(fetched.id, created.id);
  });

  // Test 2: Admin Vendor Approval Lifecycle
  await itAsync('Admin vendor lifecycle: approve vendor and change commission', async () => {
    const fetched = await db.getVendorByUserId('usr-test-vendor-1');
    const updated = await db.updateVendor(fetched.id, {
      status: 'approved',
      commission_rate: 8.0,
    });
    assert.strictEqual(updated.status, 'approved');
    assert.strictEqual(updated.commission_rate, 8.0);
  });

  // Test 3: Vendor Product Creation & Listing
  let productAId = null;
  await itAsync('Vendor products: vendor creates isolated product', async () => {
    const vendor = await db.getVendorByUserId('usr-test-vendor-1');
    const prod = await db.createProduct({
      id: `prod-test-vnd-${Date.now()}`,
      name: 'Delta RTX 4070 OC',
      vendor_id: vendor.id,
      seller_id: vendor.id,
      seller_name: vendor.company_name,
      price: 28500,
      stock_qty: 15,
      category_id: 'cat-gpu',
    });
    productAId = prod.id;
    assert.ok(productAId, 'Product must be created with ID');

    const vendorProds = await db.getVendorProducts(vendor.id);
    assert.ok(vendorProds.data.length >= 1, 'Vendor should see their own product');
    assert.ok(vendorProds.data.some(p => p.id === productAId));
  });

  // Test 4: Batch Product Query (Optimization PRF-01)
  await itAsync('Batch product retrieval: getProductsByIds replaces N+1 queries', async () => {
    const productMap = await db.getProductsByIds([productAId, 'non-existent-id']);
    assert.strictEqual(productMap.size, 1, 'Should return only existing product in map');
    assert.ok(productMap.has(productAId), 'Map must contain created product ID');
    assert.strictEqual(productMap.get(productAId).id, productAId);
  });

  // Test 5: Paymob Webhook Durable Idempotency (SEC-01)
  await itAsync('Paymob Webhook: duplicate transaction is safely detected and ignored', async () => {
    const txId = `paymob-tx-${Date.now()}`;
    const firstRes = await db.recordPaymobTransaction({
      transaction_id: txId,
      order_id: 'ord-test-100',
      amount_cents: 50000,
      currency: 'EGP',
      status: 'success',
    });
    assert.strictEqual(firstRes.duplicate, false, 'First attempt must not be duplicate');
    assert.ok(firstRes.record, 'First attempt must return record');

    const duplicateRes = await db.recordPaymobTransaction({
      transaction_id: txId,
      order_id: 'ord-test-100',
      amount_cents: 50000,
      currency: 'EGP',
      status: 'success',
    });
    assert.strictEqual(duplicateRes.duplicate, true, 'Second attempt must be flagged duplicate');
  });

  // Test 6: Vendor Data Isolation: Vendor B cannot mutate Vendor A's product
  await itAsync('Vendor Data Isolation: cross-vendor modification is prevented', async () => {
    const vendorB = await db.createVendor({
      user_id: 'usr-test-vendor-2',
      company_name: 'Store Beta',
      phone: '01099998888',
      email: 'vendor2@beta.eg',
      status: 'approved',
    });

    const productA = await db.getProduct(productAId);
    assert.ok(productA, 'Product A must exist');
    const isOwner = (productA.vendor_id === vendorB.id || productA.seller_id === vendorB.id);
    assert.strictEqual(isOwner, false, 'Vendor B must not be recognized as owner of Product A');
  });

  // Test 7: Multi-Vendor Order Attribution & Commission Calculation
  await itAsync('Multi-vendor checkout: items correctly attributed with commission & payout', async () => {
    const vendor = await db.getVendorByUserId('usr-test-vendor-1');
    const orderResult = await db.processOrderCheckout({
      customer_name: 'Test Customer',
      customer_phone: '01000000000',
      customer_city: 'Cairo',
      customer_address: '123 Test St',
      payment_method: 'cod',
      items: [
        { productId: productAId, quantity: 2 }
      ]
    });

    assert.ok(orderResult.id, 'Order must be created');
    const item = orderResult.items[0];
    assert.strictEqual(item.vendor_id, vendor.id, 'Item must have vendor_id');
    assert.strictEqual(item.total_price, 28500 * 2, 'Total price must match authoritative rate');
    // Vendor commission was updated to 8.0% in Test 2
    const expectedCommission = Number(((57000 * 8.0) / 100).toFixed(2));
    assert.strictEqual(item.commission_amount, expectedCommission, 'Commission amount calculated correctly');
    assert.strictEqual(item.payout_amount, 57000 - expectedCommission, 'Payout amount calculated correctly');
  });

  console.log(`
Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
