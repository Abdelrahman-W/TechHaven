// Egyptian Currency Formatter
export function formatEGP(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ج.م';
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0
  }).format(amount);
}

// English Currency Formatter
export function formatEGPEnglish(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 EGP';
  return `${Number(amount).toLocaleString('en-US')} EGP`;
}

// Calculate discount percentage
export function calculateDiscount(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

// Format Date in Arabic
export function formatDateArabic(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Format relative time in Arabic (منذ ساعة، منذ يوم...)
export function formatRelativeTimeArabic(dateString) {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'أمس';
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return formatDateArabic(dateString);
}
