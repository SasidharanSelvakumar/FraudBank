/**
 * Currency formatter with Indian Rupee (₹) symbol.
 * Handles numbers or string representations of numbers safely.
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '₹0.00';
  const num = Number(amount);
  if (isNaN(num)) return `₹${amount}`;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Standard date formatter.
 */
export function formatDate(dateStr, includeTime = true) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return d.toLocaleString('en-IN', options);
  } catch {
    return String(dateStr);
  }
}
