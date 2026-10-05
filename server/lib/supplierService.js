/**
 * TechHaven Suppliers Domain Service (ERP-Lite Batch 04)
 * Authoritative management and validation for supplier profiles and operational balance data.
 */

import { db } from './supabase.js';

export class SupplierService {
  /**
   * Validate supplier data fields.
   */
  static validateSupplierInput(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        errors.push('اسم المورد مطلوب');
      } else if (data.name.trim().length < 2) {
        errors.push('اسم المورد يجب ألا يقل عن حرفين');
      }
    }

    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.push('البريد الإلكتروني غير صالح');
      }
    }

    if (data.phone) {
      const phoneClean = String(data.phone).replace(/[\s\-()]/g, '');
      if (phoneClean.length < 8) {
        errors.push('رقم الهاتف غير صالح');
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join('، '));
      err.code = 'INVALID_SUPPLIER_DATA';
      err.status = 400;
      err.errors = errors;
      throw err;
    }
  }

  /**
   * Create a new supplier.
   */
  static async createSupplier(payload, actor = 'admin') {
    this.validateSupplierInput(payload, false);

    const supplierData = {
      id: payload.id || `sup-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: payload.name.trim(),
      contact_name: payload.contact_name ? payload.contact_name.trim() : null,
      phone: payload.phone ? String(payload.phone).trim() : null,
      email: payload.email ? payload.email.trim().toLowerCase() : null,
      address: payload.address ? payload.address.trim() : null,
      tax_number: payload.tax_number ? payload.tax_number.trim() : null,
      notes: payload.notes ? payload.notes.trim() : null,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      created_by: actor?.id || actor?.username || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return await db.createSupplier(supplierData);
  }

  /**
   * Update an existing supplier.
   */
  static async updateSupplier(id, payload, actor = 'admin') {
    if (!id) {
      const err = new Error('معرف المورد مطلوب');
      err.code = 'MISSING_SUPPLIER_ID';
      err.status = 400;
      throw err;
    }

    this.validateSupplierInput(payload, true);

    const existing = await db.getSupplier(id);
    if (!existing) {
      const err = new Error('المورد غير موجود');
      err.code = 'SUPPLIER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updates = {
      updated_at: new Date().toISOString(),
      updated_by: actor?.id || actor?.username || 'system',
    };

    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.contact_name !== undefined) updates.contact_name = payload.contact_name ? payload.contact_name.trim() : null;
    if (payload.phone !== undefined) updates.phone = payload.phone ? String(payload.phone).trim() : null;
    if (payload.email !== undefined) updates.email = payload.email ? payload.email.trim().toLowerCase() : null;
    if (payload.address !== undefined) updates.address = payload.address ? payload.address.trim() : null;
    if (payload.tax_number !== undefined) updates.tax_number = payload.tax_number ? payload.tax_number.trim() : null;
    if (payload.notes !== undefined) updates.notes = payload.notes ? payload.notes.trim() : null;
    if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);

    return await db.updateSupplier(id, updates);
  }

  /**
   * Deactivate a supplier (soft deactivation).
   */
  static async deactivateSupplier(id, actor = 'admin') {
    return await this.updateSupplier(id, { is_active: false }, actor);
  }

  /**
   * Delete supplier if no purchase history exists, otherwise reject and advise deactivation.
   */
  static async deleteSupplier(id) {
    if (!id) {
      const err = new Error('معرف المورد مطلوب');
      err.code = 'MISSING_SUPPLIER_ID';
      err.status = 400;
      throw err;
    }

    const existing = await db.getSupplier(id);
    if (!existing) {
      const err = new Error('المورد غير موجود');
      err.code = 'SUPPLIER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Check if referenced by purchase orders
    const poList = await db.getPurchaseOrders({ supplier_id: id, limit: 1 });
    if (poList && (poList.data?.length > 0 || poList.length > 0)) {
      const err = new Error('لا يمكن حذف المورد لوجود أوامر شراء مسجلة باسمه. يمكنك تعطيل حسابه بدلاً من الحذف.');
      err.code = 'SUPPLIER_HAS_PURCHASE_ORDERS';
      err.status = 400;
      throw err;
    }

    return await db.deleteSupplier(id);
  }

  /**
   * Get supplier by ID with operational balance summary.
   */
  static async getSupplierById(id) {
    if (!id) return null;
    const supplier = await db.getSupplier(id);
    if (!supplier) return null;

    // Calculate operational purchasing summary
    const poResult = await db.getPurchaseOrders({ supplier_id: id, limit: 1000 });
    const pos = Array.isArray(poResult) ? poResult : (poResult?.data || []);

    let totalOrders = 0;
    let confirmedOrders = 0;
    let totalPurchasingVolume = 0;

    pos.forEach(po => {
      if (po.status !== 'CANCELLED') {
        totalOrders++;
        totalPurchasingVolume += Number(po.total || po.subtotal || 0);
        if (po.status === 'CONFIRMED' || po.status === 'CLOSED') {
          confirmedOrders++;
        }
      }
    });

    return {
      ...supplier,
      operational_summary: {
        total_orders_count: totalOrders,
        confirmed_orders_count: confirmedOrders,
        total_purchasing_volume: totalPurchasingVolume,
      }
    };
  }

  /**
   * List suppliers with filtering and pagination.
   */
  static async listSuppliers(options = {}) {
    return await db.getSuppliers(options);
  }
}

export default SupplierService;
