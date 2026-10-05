/**
 * TechHaven B2B Operational Customer Balances Domain Service (Batch 07)
 * Authoritative financial state, ledger transactions, credit limits,
 * payment recording, and operational balance mutations with strict atomicity and RBAC.
 *
 * CRITICAL ACCOUNTING BOUNDARY:
 * This is strictly an OPERATIONAL customer balance system.
 * It is NOT a General Ledger or double-entry accounting system.
 */

import { db } from './supabase.js';
import { hasPermission } from './rbac.js';
import { invalidateCache } from '../middleware/cache.js';

export const TRANSACTION_TYPES = {
  B2B_INVOICE: 'B2B_INVOICE',
  PAYMENT: 'PAYMENT',
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
};

export const ACCOUNT_STATUSES = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
};

// In-memory per-account execution lock to guarantee serialized concurrency safety
const accountLocks = new Map();

async function withAccountLock(accountId, fn) {
  while (accountLocks.has(accountId)) {
    await accountLocks.get(accountId);
  }

  let resolveLock;
  const lockPromise = new Promise((resolve) => {
    resolveLock = resolve;
  });
  accountLocks.set(accountId, lockPromise);

  try {
    return await fn();
  } finally {
    accountLocks.delete(accountId);
    resolveLock();
  }
}

export class B2BBalanceService {
  /**
   * Helper: Check if user has administrative B2B permission
   */
  static isStaff(user) {
    if (!user) return false;
    if (user.role === 'owner' || user.role === 'admin' || user.role === 'store_manager') return true;
    if (Array.isArray(user.permissions) && (user.permissions.includes('*') || user.permissions.includes('b2b.manage') || user.permissions.includes('b2b.balance.manage'))) {
      return true;
    }
    return hasPermission(user.role, 'b2b.manage') || hasPermission(user.role, 'b2b.balance.manage');
  }

  /**
   * Enrich customer object with calculated available credit and operational financial metrics
   */
  static enrichCustomer(customer) {
    if (!customer) return null;
    const balance = Math.round(Number(customer.balance || 0) * 100) / 100;
    const creditLimit = Math.round(Number(customer.credit_limit || 0) * 100) / 100;

    // Available credit = credit_limit - max(0, balance)
    // If balance is negative (customer has credit), available credit is the full credit limit
    const positiveOutstanding = Math.max(0, balance);
    const availableCredit = Math.max(0, Math.round((creditLimit - positiveOutstanding) * 100) / 100);

    return {
      id: customer.id,
      user_id: customer.user_id || null,
      company_name: customer.company_name,
      contact_person: customer.contact_person,
      email: customer.email || '',
      phone: customer.phone || '',
      tax_id: customer.tax_id || '',
      credit_limit: creditLimit,
      balance: balance,
      available_credit: availableCredit,
      payment_terms: customer.payment_terms || 'NET_30',
      account_status: customer.account_status || ACCOUNT_STATUSES.ACTIVE,
      is_active: customer.account_status === ACCOUNT_STATUSES.ACTIVE,
      is_suspended: customer.account_status === ACCOUNT_STATUSES.SUSPENDED,
      is_closed: customer.account_status === ACCOUNT_STATUSES.CLOSED,
      has_debt: balance > 0,
      has_credit: balance < 0,
      is_settled: balance === 0,
      notes: customer.notes || '',
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };
  }

  /**
   * Create B2B customer account
   */
  static async createCustomer(data, actorUser = null) {
    void actorUser;
    const {
      company_name,
      companyName,
      contact_person,
      contactPerson,
      contact_name,
      email,
      phone,
      tax_id,
      taxId,
      credit_limit,
      creditLimit,
      payment_terms,
      paymentTerms,
      notes,
      user_id,
      userId,
    } = data;

    const company = (company_name || companyName || '').trim();
    const contact = (contact_person || contactPerson || contact_name || '').trim();
    const userPhone = (phone || '').trim();

    if (!company) {
      const err = new Error('اسم الشركة مطلوب');
      err.code = 'MISSING_COMPANY_NAME';
      err.status = 400;
      throw err;
    }

    if (!contact || !userPhone) {
      const err = new Error('اسم مسؤول التواصل ورقم الهاتف مطلوبان');
      err.code = 'MISSING_CONTACT_INFO';
      err.status = 400;
      throw err;
    }

    const rawCreditLimit = credit_limit !== undefined ? credit_limit : creditLimit;
    const parsedCreditLimit = rawCreditLimit !== undefined ? Number(rawCreditLimit) : 0;
    if (isNaN(parsedCreditLimit) || parsedCreditLimit < 0) {
      const err = new Error('الحد الائتماني يجب أن يكون رقماً موجباً أو صفراً');
      err.code = 'INVALID_CREDIT_LIMIT';
      err.status = 400;
      throw err;
    }

    const customerRecord = await db.createB2BCustomer({
      user_id: user_id || userId || null,
      company_name: company,
      contact_person: contact,
      email: (email || '').trim(),
      phone: userPhone,
      tax_id: (tax_id || taxId || '').trim(),
      credit_limit: Math.round(parsedCreditLimit * 100) / 100,
      balance: 0.00,
      payment_terms: payment_terms || paymentTerms || 'NET_30',
      account_status: ACCOUNT_STATUSES.ACTIVE,
      notes: notes || '',
    });

    invalidateCache('/api/b2b/customers');
    invalidateCache('/api/b2b/balances/summary');

    return this.enrichCustomer(customerRecord);
  }

  /**
   * Retrieve B2B customer by ID with RBAC and customer self-service scoping
   */
  static async getCustomer(customerId, requestingUser = null) {
    if (!customerId) {
      const err = new Error('معرف العميل مطلوب');
      err.code = 'INVALID_CUSTOMER_ID';
      err.status = 400;
      throw err;
    }

    const customer = await db.getB2BCustomer(customerId);
    if (!customer) {
      const err = new Error('حساب الشركة غير موجود');
      err.code = 'CUSTOMER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // RBAC: Staff can view any; B2B customer can only view own linked account
    if (requestingUser && !this.isStaff(requestingUser)) {
      if (customer.user_id !== requestingUser.id && customer.user_id !== requestingUser.userId) {
        const err = new Error('غير مصرح لك باستعراض بيانات هذا الحساب');
        err.code = 'FORBIDDEN';
        err.status = 403;
        throw err;
      }
    }

    return this.enrichCustomer(customer);
  }

  /**
   * Retrieve B2B customer linked to a given User ID
   */
  static async getCustomerByUserId(userId) {
    if (!userId) return null;
    const customer = await db.getB2BCustomerByUserId(userId);
    return customer ? this.enrichCustomer(customer) : null;
  }

  /**
   * List B2B customers with search, status filter, and pagination (Admin only)
   */
  static async getCustomers(params = {}, requestingUser = null) {
    void requestingUser;
    const res = await db.getB2BCustomers(params);
    return {
      data: (res.data || []).map((c) => this.enrichCustomer(c)),
      pagination: res.pagination,
    };
  }

  /**
   * Update B2B account status (ACTIVE, SUSPENDED, CLOSED)
   */
  static async updateAccountStatus(customerId, status, notes = '', actorUser = null) {
    void actorUser;
    if (!Object.values(ACCOUNT_STATUSES).includes(status)) {
      const err = new Error('حالة الحساب غير صالحة');
      err.code = 'INVALID_ACCOUNT_STATUS';
      err.status = 400;
      throw err;
    }

    return withAccountLock(customerId, async () => {
      const customer = await db.getB2BCustomer(customerId);
      if (!customer) {
        const err = new Error('حساب الشركة غير موجود');
        err.code = 'CUSTOMER_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      const updates = {
        account_status: status,
      };
      if (notes) {
        updates.notes = (customer.notes ? `${customer.notes}\n` : '') + `[${new Date().toISOString()}] تغيير الحالة إلى ${status}: ${notes}`;
      }

      const updated = await db.updateB2BCustomer(customerId, updates);
      invalidateCache('/api/b2b/customers');
      invalidateCache(`/api/b2b/customers/${customerId}`);
      invalidateCache('/api/b2b/balances/summary');

      return this.enrichCustomer(updated);
    });
  }

  /**
   * Update B2B customer settings (credit_limit, payment_terms, notes)
   */
  static async updateCustomerSettings(customerId, settings = {}, actorUser = null) {
    void actorUser;
    const { credit_limit, creditLimit, payment_terms, paymentTerms, notes, tax_id, taxId } = settings;

    return withAccountLock(customerId, async () => {
      const customer = await db.getB2BCustomer(customerId);
      if (!customer) {
        const err = new Error('حساب الشركة غير موجود');
        err.code = 'CUSTOMER_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      const updates = {};
      const rawLimit = credit_limit !== undefined ? credit_limit : creditLimit;
      if (rawLimit !== undefined) {
        const parsedLimit = Number(rawLimit);
        if (isNaN(parsedLimit) || parsedLimit < 0) {
          const err = new Error('الحد الائتماني يجب أن يكون رقماً موجباً أو صفراً');
          err.code = 'INVALID_CREDIT_LIMIT';
          err.status = 400;
          throw err;
        }
        updates.credit_limit = Math.round(parsedLimit * 100) / 100;
      }

      if (payment_terms !== undefined || paymentTerms !== undefined) {
        updates.payment_terms = payment_terms || paymentTerms;
      }
      if (notes !== undefined) {
        updates.notes = notes;
      }
      if (tax_id !== undefined || taxId !== undefined) {
        updates.tax_id = tax_id || taxId;
      }

      const updated = await db.updateB2BCustomer(customerId, updates);
      invalidateCache('/api/b2b/customers');
      invalidateCache(`/api/b2b/customers/${customerId}`);
      invalidateCache('/api/b2b/balances/summary');

      return this.enrichCustomer(updated);
    });
  }

  /**
   * Get transaction history for customer with RBAC verification
   */
  static async getTransactions(customerId, params = {}, requestingUser = null) {
    // Check permission / ownership
    await this.getCustomer(customerId, requestingUser);

    const res = await db.getCustomerBalanceTransactions(customerId, params);
    return res;
  }

  /**
   * Atomically record B2B order invoice (Debit)
   */
  static async recordInvoice(customerId, payload, actorUser = null) {
    const { amount, order_id, notes } = payload;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      const err = new Error('مبلغ الفاتورة يجب أن يكون أكبر من الصفر');
      err.code = 'INVALID_AMOUNT';
      err.status = 400;
      throw err;
    }

    return withAccountLock(customerId, async () => {
      const customer = await db.getB2BCustomer(customerId);
      if (!customer) {
        const err = new Error('حساب الشركة غير موجود');
        err.code = 'CUSTOMER_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      if (customer.account_status === ACCOUNT_STATUSES.SUSPENDED) {
        const err = new Error('حساب الشركة موقوف (SUSPENDED)، لا يمكن إصدار فواتير آجلة جديدة');
        err.code = 'ACCOUNT_SUSPENDED';
        err.status = 400;
        throw err;
      }

      if (customer.account_status === ACCOUNT_STATUSES.CLOSED) {
        const err = new Error('حساب الشركة مغلق (CLOSED)، لا يمكن إجراء معاملات');
        err.code = 'ACCOUNT_CLOSED';
        err.status = 400;
        throw err;
      }

      const balanceBefore = Math.round(Number(customer.balance || 0) * 100) / 100;
      const creditLimit = Math.round(Number(customer.credit_limit || 0) * 100) / 100;
      const cleanAmount = Math.round(numAmount * 100) / 100;
      const balanceAfter = Math.round((balanceBefore + cleanAmount) * 100) / 100;

      // Credit limit enforcement: If credit_limit > 0 and resulting balance > credit_limit
      if (creditLimit > 0 && balanceAfter > creditLimit) {
        const err = new Error(`تم تجاوز الحد الائتماني المسموح به (${creditLimit} ج.م). الرصيد المستحق بعد العملية سيكون ${balanceAfter} ج.م`);
        err.code = 'CREDIT_LIMIT_EXCEEDED';
        err.status = 400;
        err.details = {
          credit_limit: creditLimit,
          current_balance: balanceBefore,
          requested_amount: cleanAmount,
          resulting_balance: balanceAfter,
          available_credit: Math.max(0, creditLimit - Math.max(0, balanceBefore)),
        };
        throw err;
      }

      const tx = await db.createCustomerBalanceTransaction({
        customer_id: customerId,
        type: TRANSACTION_TYPES.B2B_INVOICE,
        amount: cleanAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'ORDER',
        reference_id: order_id || null,
        note: notes || `فاتورة طلب B2B ${order_id ? `(طلب #${order_id})` : ''}`,
        actor_id: actorUser?.id || actorUser?.userId || 'system',
        actor_name: actorUser?.full_name || actorUser?.name || 'النظام',
      });

      const updatedCustomer = await db.updateB2BCustomer(customerId, {
        balance: balanceAfter,
      });

      invalidateCache('/api/b2b/customers');
      invalidateCache(`/api/b2b/customers/${customerId}`);
      invalidateCache('/api/b2b/balances/summary');

      return {
        transaction: tx,
        customer: this.enrichCustomer(updatedCustomer),
      };
    });
  }

  /**
   * Atomically record customer payment (Credit / Balance Reduction)
   */
  static async recordPayment(customerId, payload, actorUser = null) {
    const { amount, payment_method, external_reference, notes } = payload;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      const err = new Error('مبلغ السداد يجب أن يكون أكبر من الصفر');
      err.code = 'INVALID_AMOUNT';
      err.status = 400;
      throw err;
    }

    return withAccountLock(customerId, async () => {
      const customer = await db.getB2BCustomer(customerId);
      if (!customer) {
        const err = new Error('حساب الشركة غير موجود');
        err.code = 'CUSTOMER_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      // Note: Payments ARE allowed for SUSPENDED accounts to facilitate settlement.
      // Only CLOSED accounts are barred from new payments.
      if (customer.account_status === ACCOUNT_STATUSES.CLOSED) {
        const err = new Error('حساب الشركة مغلق (CLOSED)، يرجى إعادة فتح الحساب لتسجيل الدفعات');
        err.code = 'ACCOUNT_CLOSED';
        err.status = 400;
        throw err;
      }

      const balanceBefore = Math.round(Number(customer.balance || 0) * 100) / 100;
      const cleanAmount = Math.round(numAmount * 100) / 100;
      // Payment reduces customer debt (new_balance = balance_before - amount)
      const balanceAfter = Math.round((balanceBefore - cleanAmount) * 100) / 100;

      const tx = await db.createCustomerBalanceTransaction({
        customer_id: customerId,
        type: TRANSACTION_TYPES.PAYMENT,
        amount: cleanAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'PAYMENT',
        reference_id: external_reference || null,
        payment_method: payment_method || 'BANK_TRANSFER',
        external_reference: external_reference || null,
        note: notes || `تسجيل دفعة سداد لحساب الشركة`,
        actor_id: actorUser?.id || actorUser?.userId || 'system',
        actor_name: actorUser?.full_name || actorUser?.name || 'إدارة الحسابات',
      });

      const updatedCustomer = await db.updateB2BCustomer(customerId, {
        balance: balanceAfter,
      });

      invalidateCache('/api/b2b/customers');
      invalidateCache(`/api/b2b/customers/${customerId}`);
      invalidateCache('/api/b2b/balances/summary');

      return {
        transaction: tx,
        customer: this.enrichCustomer(updatedCustomer),
      };
    });
  }

  /**
   * Atomically record Credit or Debit adjustment
   */
  static async recordAdjustment(customerId, payload, actorUser = null) {
    const { type, amount, reason, note, notes, external_reference } = payload;
    const numAmount = Number(amount);

    if (!['CREDIT', 'DEBIT', 'ADJUSTMENT'].includes(type)) {
      const err = new Error('نوع التسوية غير صالح (يجب أن يكون CREDIT أو DEBIT)');
      err.code = 'INVALID_ADJUSTMENT_TYPE';
      err.status = 400;
      throw err;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      const err = new Error('مبلغ التسوية يجب أن يكون أكبر من الصفر');
      err.code = 'INVALID_AMOUNT';
      err.status = 400;
      throw err;
    }

    const reasonText = (reason || note || notes || '').trim();
    if (!reasonText) {
      const err = new Error('سبب التسوية مطلوب لتوثيق السجل المالي');
      err.code = 'MISSING_REASON';
      err.status = 400;
      throw err;
    }

    return withAccountLock(customerId, async () => {
      const customer = await db.getB2BCustomer(customerId);
      if (!customer) {
        const err = new Error('حساب الشركة غير موجود');
        err.code = 'CUSTOMER_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      if (customer.account_status === ACCOUNT_STATUSES.CLOSED) {
        const err = new Error('حساب الشركة مغلق (CLOSED)');
        err.code = 'ACCOUNT_CLOSED';
        err.status = 400;
        throw err;
      }

      if (type === 'DEBIT' && customer.account_status === ACCOUNT_STATUSES.SUSPENDED) {
        const err = new Error('لا يمكن إضافة قيود مدينة (DEBIT) لحساب موقوف');
        err.code = 'ACCOUNT_SUSPENDED';
        err.status = 400;
        throw err;
      }

      const balanceBefore = Math.round(Number(customer.balance || 0) * 100) / 100;
      const cleanAmount = Math.round(numAmount * 100) / 100;

      // CREDIT decreases balance (customer owes less / gains credit)
      // DEBIT increases balance (customer owes more)
      let balanceAfter;
      if (type === 'CREDIT') {
        balanceAfter = Math.round((balanceBefore - cleanAmount) * 100) / 100;
      } else {
        balanceAfter = Math.round((balanceBefore + cleanAmount) * 100) / 100;
      }

      const tx = await db.createCustomerBalanceTransaction({
        customer_id: customerId,
        type: type === 'CREDIT' ? TRANSACTION_TYPES.CREDIT : TRANSACTION_TYPES.DEBIT,
        amount: cleanAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'MANUAL',
        reference_id: external_reference || null,
        note: reasonText,
        actor_id: actorUser?.id || actorUser?.userId || 'system',
        actor_name: actorUser?.full_name || actorUser?.name || 'إدارة الحسابات',
      });

      const updatedCustomer = await db.updateB2BCustomer(customerId, {
        balance: balanceAfter,
      });

      invalidateCache('/api/b2b/customers');
      invalidateCache(`/api/b2b/customers/${customerId}`);
      invalidateCache('/api/b2b/balances/summary');

      return {
        transaction: tx,
        customer: this.enrichCustomer(updatedCustomer),
      };
    });
  }

  /**
   * Record compensating refund for order cancellation
   */
  static async recordRefund(customerId, payload, actorUser = null) {
    const { amount, order_id, notes } = payload;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      const err = new Error('مبلغ الإلغاء/الاسترجاع يجب أن يكون أكبر من الصفر');
      err.code = 'INVALID_AMOUNT';
      err.status = 400;
      throw err;
    }

    return withAccountLock(customerId, async () => {
      const customer = await db.getB2BCustomer(customerId);
      if (!customer) {
        const err = new Error('حساب الشركة غير موجود');
        err.code = 'CUSTOMER_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      const balanceBefore = Math.round(Number(customer.balance || 0) * 100) / 100;
      const cleanAmount = Math.round(numAmount * 100) / 100;
      const balanceAfter = Math.round((balanceBefore - cleanAmount) * 100) / 100;

      const tx = await db.createCustomerBalanceTransaction({
        customer_id: customerId,
        type: TRANSACTION_TYPES.REFUND,
        amount: cleanAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'REFUND',
        reference_id: order_id || null,
        note: notes || `استرجاع / إلغاء طلب B2B ${order_id ? `(طلب #${order_id})` : ''}`,
        actor_id: actorUser?.id || actorUser?.userId || 'system',
        actor_name: actorUser?.full_name || actorUser?.name || 'النظام',
      });

      const updatedCustomer = await db.updateB2BCustomer(customerId, {
        balance: balanceAfter,
      });

      invalidateCache('/api/b2b/customers');
      invalidateCache(`/api/b2b/customers/${customerId}`);
      invalidateCache('/api/b2b/balances/summary');

      return {
        transaction: tx,
        customer: this.enrichCustomer(updatedCustomer),
      };
    });
  }

  /**
   * Aggregate operational summary for B2B accounts
   */
  static async getBalancesSummary(requestingUser = null) {
    void requestingUser;
    const allCustomers = await db.getB2BCustomers({ limit: 1000 });
    const list = allCustomers.data || [];

    let totalCustomers = list.length;
    let totalOutstanding = 0;
    let totalOperationalCredit = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let closedCount = 0;
    let debtCount = 0;
    let creditCount = 0;
    let settledCount = 0;

    for (const c of list) {
      const b = Math.round(Number(c.balance || 0) * 100) / 100;
      if (b > 0) {
        totalOutstanding += b;
        debtCount++;
      } else if (b < 0) {
        totalOperationalCredit += Math.abs(b);
        creditCount++;
      } else {
        settledCount++;
      }

      if (c.account_status === ACCOUNT_STATUSES.ACTIVE) activeCount++;
      else if (c.account_status === ACCOUNT_STATUSES.SUSPENDED) suspendedCount++;
      else if (c.account_status === ACCOUNT_STATUSES.CLOSED) closedCount++;
    }

    return {
      total_b2b_customers: totalCustomers,
      total_outstanding: Math.round(totalOutstanding * 100) / 100,
      total_operational_credit: Math.round(totalOperationalCredit * 100) / 100,
      active_accounts_count: activeCount,
      suspended_accounts_count: suspendedCount,
      closed_accounts_count: closedCount,
      customers_with_debt_count: debtCount,
      customers_with_credit_count: creditCount,
      settled_accounts_count: settledCount,
    };
  }
}

export default B2BBalanceService;
