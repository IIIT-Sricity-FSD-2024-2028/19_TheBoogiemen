// front-end/js/ui-helpers.js
// Shared UI utilities for API-integrated pages.
// Provides toast notifications, loading states, and list rendering.

/**
 * Show a non-blocking error toast notification.
 */
function showError(message) {
  // Try to use existing toast element first
  const existing = document.getElementById('toastEl');
  if (existing) {
    existing.textContent = '❌ ' + message;
    existing.classList.add('show');
    setTimeout(() => existing.classList.remove('show'), 4000);
    return;
  }
  // Fallback: inject a toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; background:#e53e3e; color:#fff;
    padding:12px 20px; border-radius:8px; font-size:14px; z-index:9999;
    box-shadow:0 4px 12px rgba(0,0,0,0.2); max-width:360px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = '❌ ' + message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Show a non-blocking success toast notification.
 */
function showSuccess(message) {
  // Try to use existing toast element first
  const existing = document.getElementById('toastEl');
  if (existing) {
    existing.textContent = '✅ ' + message;
    existing.classList.add('show');
    setTimeout(() => existing.classList.remove('show'), 3000);
    return;
  }
  // Fallback: inject a toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; background:#38a169; color:#fff;
    padding:12px 20px; border-radius:8px; font-size:14px; z-index:9999;
    box-shadow:0 4px 12px rgba(0,0,0,0.2); max-width:360px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = '✅ ' + message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Show/hide a loading spinner on a button while an async operation runs.
 * Usage: const reset = withLoading(btn); await api.post(...); reset();
 */
function withLoading(button) {
  if (!button) return () => {};
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Loading…';
  return () => {
    button.disabled = false;
    button.textContent = original;
  };
}

/**
 * Clear all children of a container and render a list using a template function.
 * Usage: renderList(container, items, item => `<div>${item.name}</div>`)
 */
function renderList(container, items, templateFn) {
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:12px 0;text-align:center">No records found.</p>';
    return;
  }
  items.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = templateFn(item);
    if (wrapper.firstElementChild) {
      container.appendChild(wrapper.firstElementChild);
    }
  });
}

// Make available globally
window.UI_HELPERS = { showError, showSuccess, withLoading, renderList };
