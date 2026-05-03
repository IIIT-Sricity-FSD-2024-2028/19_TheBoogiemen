// front-end/js/role-switcher.js
// Floating role-switcher widget for demo purposes.
// Injects into every portal page. Uses seed UUIDs from backend.

(function injectRoleSwitcher() {
  // Seed UUIDs from back-end/src/common/types/seed-constants.ts
  const SEED_USERS = {
    student:       { id: '550e8400-e29b-41d4-a716-446655440000', label: 'Student (Alice)' },
    faculty:       { id: '3a18b76c-fb1d-4034-8c83-05c04ccfbdb5', label: 'Faculty (Dr. Miller)' },
    academic_head: { id: 'f3ca9b7f-ad88-4228-b21a-dc7dc33b664d', label: 'Acad. Head (Prof. Taylor)' },
    admin:         { id: '811db334-edc7-43ca-a0ba-e2c7a95b8d23', label: 'Admin / Superuser' },
  };

  const { getSession, setSession } = window.API_CLIENT || {};
  if (!getSession) return; // api-client not loaded yet

  const { role } = getSession();

  const switcher = document.createElement('div');
  switcher.id = '__role_switcher_container';
  switcher.style.cssText = `
    position:fixed; top:12px; right:12px; z-index:10000;
    background:#1a202c; padding:8px 14px; border-radius:10px;
    font-size:13px; color:#fff; display:flex; align-items:center; gap:8px;
    box-shadow:0 4px 16px rgba(0,0,0,0.3); font-family:system-ui,sans-serif;
  `;
  switcher.innerHTML = `
    <span style="font-size:11px;opacity:0.7">API Role:</span>
    <select id="__role_switcher" style="background:#2d3748;color:#fff;border:1px solid #4a5568;
      border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;outline:none;">
      ${Object.entries(SEED_USERS).map(([r, u]) =>
        `<option value="${r}" data-uid="${u.id}" ${r === role ? 'selected' : ''}>${u.label}</option>`
      ).join('')}
    </select>
    <span id="__api_status" style="width:8px;height:8px;border-radius:50%;background:#f59e0b;" title="Checking API..."></span>
  `;
  document.body.appendChild(switcher);

  // Check API connectivity
  fetch('http://localhost:3000/users', {
    headers: { 'x-user-role': 'admin' }
  }).then(r => {
    document.getElementById('__api_status').style.background = r.ok ? '#48bb78' : '#f56565';
    document.getElementById('__api_status').title = r.ok ? 'API Connected' : 'API Error';
  }).catch(() => {
    document.getElementById('__api_status').style.background = '#f56565';
    document.getElementById('__api_status').title = 'API Offline — using fallback data';
  });

  document.getElementById('__role_switcher').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    setSession(e.target.value, opt.dataset.uid);
    window.location.reload();
  });
})();
