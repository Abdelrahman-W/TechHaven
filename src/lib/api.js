const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('eh_token');
  const sessionId = localStorage.getItem('eh_session_id') || `sess-${Date.now()}`;
  localStorage.setItem('eh_session_id', sessionId);

  const headers = {
    'Content-Type': 'application/json',
    'x-session-id': sessionId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    cache: 'no-cache',
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json.error || `خطأ في الاتصال بالسيرفر (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = json.code;
    throw error;
  }

  return json;
}

export const api = {
  // ── Auth ──
  async register(data) {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data) {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe() {
    return fetchAPI('/auth/me');
  },

  async updateProfile(data) {
    return fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // ── Categories & Products ──
  async getCategories() {
    return fetchAPI('/categories');
  },

  async getProducts(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return fetchAPI(`/products${qs ? `?${qs}` : ''}`);
  },

  async getProduct(id) {
    return fetchAPI(`/products/${id}`);
  },

  // ── Cart ──
  async getCart() {
    return fetchAPI('/cart');
  },

  async addToCart(productId, quantity = 1, customSpecs = null) {
    return fetchAPI('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity, custom_specs: customSpecs }),
    });
  },

  async updateCartItem(productId, quantity) {
    return fetchAPI(`/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  async removeFromCart(productId) {
    return fetchAPI(`/cart/${productId}`, {
      method: 'DELETE',
    });
  },

  async clearCart() {
    return fetchAPI('/cart', {
      method: 'DELETE',
    });
  },

  // ── Orders ──
  async createOrder(orderData) {
    // Server-authoritative fields (shipping, total, discount) are removed
    // so the backend calculates them from trusted data (subtotal, city)
    const { shippingCost, total, discount_amount, ...cleanedData } = orderData;
    return fetchAPI('/orders', {
      method: 'POST',
      body: JSON.stringify(cleanedData),
    });
  },

  async getOrders() {
    return fetchAPI('/orders');
  },

  async getOrder(idOrRef, params = {}) {
    let query = '';
    if (params && params.phone) {
      query = `?phone=${encodeURIComponent(params.phone)}`;
    }
    return fetchAPI(`/orders/${idOrRef}${query}`);
  },

  // ── PC Builder ──
  async validatePCBuild(parts) {
    return fetchAPI('/pc-builder/validate', {
      method: 'POST',
      body: JSON.stringify({ parts }),
    });
  },

  // ── B2B ──
  async submitB2BQuote(data) {
    return fetchAPI('/b2b/quote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async submitB2BRequest(data) {
    return this.submitB2BQuote(data);
  },

  async getAdminB2BRequests() {
    return fetchAPI('/b2b');
  },

  async updateAdminB2BStatus(id, status, adminNotes = '') {
    return fetchAPI(`/b2b/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    });
  },

  async bulkUpdateAdminB2BStatus(ids, status, adminNotes = '') {
    return fetchAPI('/b2b/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status, admin_notes: adminNotes }),
    });
  },

  // ── Admin ──
  async getAdminStats() {
    return fetchAPI('/admin/stats');
  },

  async getAdminUsers() {
    return fetchAPI('/admin/users');
  },

  async createAdminUser(userData) {
    return fetchAPI('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateAdminUser(userId, updates) {
    return fetchAPI(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteAdminUser(userId) {
    return fetchAPI(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getAdminRoles() {
    return fetchAPI('/admin/roles');
  },

  async getAdminPermissions() {
    return fetchAPI('/admin/permissions');
  },

  async getAdminUserPermissions(userId) {
    return fetchAPI(`/admin/users/${userId}/permissions`);
  },

  async getAdminOrders() {
    return fetchAPI('/admin/orders');
  },

  async updateOrderStatus(orderId, status, note) {
    return fetchAPI(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
  },

  async createProduct(productData) {
    return fetchAPI('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  async updateProduct(productId, productData) {
    return fetchAPI(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  async updateProductStock(productId, stockQty, reason = '') {
    return fetchAPI(`/products/${productId}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ stock_qty: stockQty, reason }),
    });
  },

  // ── Inventory Ledger & Movements (Batch 02) ──
  async getInventoryMovements(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchAPI(`/inventory/movements${qs}`);
  },

  async getProductStockHistory(productId, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchAPI(`/inventory/products/${productId}/history${qs}`);
  },

  async adjustInventory(payload) {
    return fetchAPI('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteProduct(productId) {
    return fetchAPI(`/products/${productId}`, {
      method: 'DELETE',
    });
  },

  // ── Wishlist ──
  async getWishlist() {
    return fetchAPI('/wishlist');
  },

  async addToWishlist(productId) {
    return fetchAPI('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  async removeFromWishlist(productId) {
    return fetchAPI(`/wishlist/${productId}`, {
      method: 'DELETE',
    });
  },

  // ── Reviews ──
  async getProductReviews(productId) {
    const res = await fetchAPI(`/reviews/product/${productId}`);
    return res?.data || res || [];
  },

  async submitReview(productIdOrData, data) {
    let payload = {};
    if (typeof productIdOrData === 'object') {
      payload = {
        product_id: productIdOrData.productId || productIdOrData.product_id,
        rating: productIdOrData.rating,
        comment: productIdOrData.comment,
      };
    } else {
      payload = {
        product_id: productIdOrData,
        rating: data?.rating,
        comment: data?.comment,
      };
    }
    return fetchAPI('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteReview(reviewId) {
    return fetchAPI(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },

  async getAdminReviews() {
    return fetchAPI('/reviews');
  },

  // ── Payments & Paymob ──
  async getPaymentInstructions(method) {
    return fetchAPI('/payments/instructions', {
      method: 'POST',
      body: JSON.stringify({ method }),
    });
  },

  async getPaymobConfig() {
    return fetchAPI('/payments/paymob/config');
  },

  async testPaymobConnection(apiKey) {
    return fetchAPI('/payments/paymob/test-connection', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    });
  },

  async initiatePaymobPayment(paymentData) {
    return fetchAPI('/payments/paymob/initiate', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  // ── Store Settings ──
  async getSettings() {
    return fetchAPI('/settings');
  },

  async getPublicSettings() {
    return fetchAPI('/settings');
  },

  async updateSettings(settingsData) {
    return fetchAPI('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  },

  // ── Categories Management ──
  async createCategory(categoryData) {
    return fetchAPI('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  async updateCategory(id, categoryData) {
    return fetchAPI(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  },

  async deleteCategory(id) {
    return fetchAPI(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // ── Analytics & Reports ──
  async getAnalyticsOverview() {
    return fetchAPI('/analytics/overview');
  },

  async getAnalyticsRevenue(period = '7d') {
    return fetchAPI(`/analytics/revenue?period=${period}`);
  },

  async getAnalyticsTopProducts(limit = 10) {
    return fetchAPI(`/analytics/top-products?limit=${limit}`);
  },

  async getAnalyticsRecentOrders(limit = 5) {
    return fetchAPI(`/analytics/recent-orders?limit=${limit}`);
  },

  async getAnalyticsUserStats() {
    return fetchAPI('/analytics/user-stats');
  },

  // ── Store Settings & System Configuration ──
  async getSettings() {
    return fetchAPI('/settings');
  },

  async getPublicSettings() {
    return fetchAPI('/settings');
  },

  async updateSettings(settingsData) {
    return fetchAPI('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  },

  };
