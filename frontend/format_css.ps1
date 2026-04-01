# Simple CSS formatter
$cssPath = "c:\Users\sandh\Downloads\barelypassing-split\css\faculty.css"
$content = Get-Content $cssPath -Raw

# Basic formatting
$formatted = @"
/* =====================================================
   BarelyPassing — Faculty Page Styles
   Depends on: css/shared.css
   ===================================================== */

html,
body {
  height: 100%;
  font-family: var(--fb);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  font-size: 15px;
}

.app {
  display: flex;
  min-height: 100vh;
}

/* SIDEBAR */
.sidebar {
  width: var(--sidebar-w);
  background: var(--ink);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  transition: transform 0.3s;
}

.sb-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 18px;
  border-bottom: 1px solid rgba(247, 245, 240, 0.08);
  text-decoration: none;
}

.sb-ico {
  width: 30px;
  height: 30px;
  background: var(--bg);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sb-ico svg {
  width: 15px;
  height: 15px;
  stroke: var(--ink);
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sb-name {
  font-family: var(--fd);
  font-size: 16px;
  color: var(--bg);
  letter-spacing: -0.2px;
}

.sb-user {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(247, 245, 240, 0.08);
  display: flex;
  align-items: center;
  gap: 10px;
}

.sb-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #db2777);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.sb-uname {
  font-size: 13px;
  font-weight: 500;
  color: rgba(247, 245, 240, 0.9);
}

.sb-urole {
  font-size: 11px;
  color: rgba(247, 245, 240, 0.38);
  margin-top: 1px;
}

.sb-nav {
  flex: 1;
  padding: 10px 10px;
  overflow-y: auto;
}

.sb-nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: rgba(247, 245, 240, 0.5);
  font-size: 13.5px;
  font-weight: 400;
  transition: all 0.18s;
  margin-bottom: 1px;
}

.sb-nav a svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.sb-nav a:hover {
  color: rgba(247, 245, 240, 0.85);
  background: rgba(247, 245, 240, 0.06);
}

.sb-nav a.active {
  color: var(--bg);
  background: rgba(247, 245, 240, 0.12);
}

.sb-footer {
  padding: 12px 10px;
  border-top: 1px solid rgba(247, 245, 240, 0.08);
}

.sb-footer a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: rgba(247, 245, 240, 0.4);
  font-size: 13px;
  transition: all 0.18s;
}

.sb-footer a svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sb-footer a:hover {
  color: rgba(247, 245, 240, 0.8);
  background: rgba(247, 245, 240, 0.06);
}

.sb-footer a.active {
  color: var(--bg);
  background: rgba(247, 245, 240, 0.12);
}

/* MAIN */
.main {
  margin-left: var(--sidebar-w);
  flex: 1;
  min-height: 100vh;
}

.topbar {
  height: 58px;
  background: var(--white);
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: center;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 12px;
}

.topbar-title {
  font-family: var(--fd);
  font-size: 19px;
  font-weight: 400;
  color: var(--ink);
  flex: 1;
}

.topbar-badge {
  background: var(--violet-l);
  color: var(--violet);
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  font-family: var(--fm);
}

.topbar-menu {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
}

.topbar-menu svg {
  width: 20px;
  height: 20px;
  stroke: var(--ink);
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
}

.content {
  padding: 28px;
  max-width: 1200px;
}

.panel {
  display: none;
}

.panel.active {
  display: block;
  animation: panelIn 0.25s ease both;
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* STAT CARDS */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 14px;
  padding: 18px 20px;
}

.sc-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.sc-val {
  font-family: var(--fd);
  font-size: 28px;
  font-weight: 400;
  color: var(--ink);
  line-height: 1;
}

.sc-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 5px;
}

.sc-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  margin-top: 6px;
}

.sc-badge.green {
  background: var(--green-l);
  color: var(--green);
}

.sc-badge.blue {
  background: var(--blue-l);
  color: var(--blue);
}

.sc-badge.amber {
  background: var(--amber-l);
  color: var(--amber);
}

.sc-badge.red {
  background: var(--red-l);
  color: var(--red);
}

.sc-badge.violet {
  background: var(--violet-l);
  color: var(--violet);
}

.card {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 14px;
  padding: 22px 24px;
  margin-bottom: 18px;
}

.card-title {
  font-family: var(--fd);
  font-size: 17px;
  font-weight: 400;
  color: var(--ink);
  margin-bottom: 4px;
}

.card-sub {
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 18px;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 18px;
}

/* PROGRESS */
.prog-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.prog-label {
  font-size: 13px;
  color: var(--soft);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prog-bar {
  flex: 2;
  height: 6px;
  background: var(--rule);
  border-radius: 3px;
  overflow: hidden;
}

.prog-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.prog-fill.green {
  background: var(--green);
}

.prog-fill.blue {
  background: var(--blue);
}

.prog-fill.amber {
  background: var(--amber);
}

.prog-fill.red {
  background: var(--red);
}

.prog-pct {
  font-family: var(--fm);
  font-size: 12px;
  color: var(--muted);
  min-width: 36px;
  text-align: right;
}

/* BUTTONS */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font-family: var(--fb);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  text-decoration: none;
}

.btn-primary {
  background: var(--ink);
  color: var(--bg);
}

.btn-primary:hover {
  background: var(--ink2);
}

.btn-outline {
  background: transparent;
  color: var(--soft);
  border: 1.5px solid var(--rule2);
}

.btn-outline:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.btn-blue {
  background: var(--blue-l);
  color: var(--blue);
}

.btn-blue:hover {
  background: var(--blue-m);
}

.btn-red {
  background: var(--red-l);
  color: var(--red);
}

.btn-red:hover {
  background: var(--red-m);
}

.btn-amber {
  background: var(--amber-l);
  color: var(--amber);
}

.btn-green {
  background: var(--green-l);
  color: var(--green);
}

.btn-green:hover {
  background: var(--green-m);
}

.btn-violet {
  background: var(--violet-l);
  color: var(--violet);
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

/* STATUS */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
}

.status-pill.on-track {
  background: var(--green-l);
  color: var(--green);
}

.status-pill.at-risk {
  background: var(--red-l);
  color: var(--red);
}

.status-pill.active {
  background: var(--blue-l);
  color: var(--blue);
}

.status-pill.resolved {
  background: var(--green-l);
  color: var(--green);
}

.status-pill.reviewed {
  background: var(--green-l);
  color: var(--green);
}

.status-pill.pending {
  background: var(--amber-l);
  color: var(--amber);
}

.status-pill.in-progress {
  background: var(--blue-l);
  color: var(--blue);
}

.status-pill::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

/* TABLE */
.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1.5px solid var(--rule);
}

td {
  padding: 12px 14px;
  font-size: 13.5px;
  color: var(--soft);
  border-bottom: 1px solid var(--rule);
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background: rgba(0, 0, 0, 0.01);
}

/* TIMETABLE */
.tt-grid {
  display: grid;
  grid-template-columns: 80px repeat(5, 1fr);
  gap: 1px;
  background: var(--rule);
  border-radius: 12px;
  overflow: hidden;
  min-width: 640px;
}

.tt-head {
  background: var(--bg);
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  min-height: 40px;
}

.tt-time {
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--fm);
  font-size: 10.5px;
  color: var(--muted);
}

.tt-cell {
  background: var(--white);
  padding: 8px;
}

.tt-class {
  border-radius: 8px;
  padding: 8px 10px;
  height: 100%;
}

.tt-class.blue {
  background: var(--blue-l);
  border-left: 3px solid var(--blue);
}

.tt-class.green {
  background: var(--green-l);
  border-left: 3px solid var(--green);
}

.tt-class.violet {
  background: var(--violet-l);
  border-left: 3px solid var(--violet);
}

.tt-class.amber {
  background: var(--amber-l);
  border-left: 3px solid var(--amber);
}

.tt-name {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
}

.tt-loc {
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 3px;
}

.tt-count {
  font-size: 10px;
  color: var(--muted);
  margin-top: 2px;
}

/* ATTENDANCE MARKS */
.att-student-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--rule);
  margin-bottom: 8px;
  gap: 12px;
}

.ast-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}

.ast-id {
  font-size: 12px;
  color: var(--muted);
  font-family: var(--fm);
  margin-top: 2px;
}

.att-toggle {
  display: flex;
  gap: 6px;
}

.att-btn {
  padding: 6px 14px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.att-btn.present {
  background: var(--green-l);
  color: var(--green);
}

.att-btn.present.active {
  background: var(--green);
  color: #fff;
}

.att-btn.absent {
  background: var(--red-l);
  color: var(--red);
}

.att-btn.absent.active {
  background: var(--red);
  color: #fff;
}

/* CO/PO MAPPING */
.co-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid var(--rule);
  border-radius: 10px;
}

.co-q {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 8px;
}

.co-marks {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 10px;
}

.co-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.co-chip {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: all 0.15s;
  user-select: none;
}

.co-chip.co {
  background: var(--blue-l);
  color: var(--blue);
  border-color: var(--blue-l);
}

.co-chip.co:hover,
.co-chip.co.sel {
  background: var(--blue);
  color: #fff;
  border-color: var(--blue);
}

.co-chip.po {
  background: var(--violet-l);
  color: var(--violet);
  border-color: var(--violet-l);
}

.co-chip.po:hover,
.co-chip.po.sel {
  background: var(--violet);
  color: #fff;
  border-color: var(--violet);
}

/* FORM */
.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--soft);
  margin-bottom: 6px;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 10px 13px;
  border: 1.5px solid var(--rule2);
  border-radius: 9px;
  font-family: var(--fb);
  font-size: 14px;
  color: var(--ink);
  background: var(--white);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1);
}

.form-field textarea {
  resize: vertical;
  min-height: 90px;
}

/* ALERT CARDS */
.alert-card {
  background: var(--red-l);
  border: 1px solid var(--red-m);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ac-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--red);
}

.ac-meta {
  font-size: 12.5px;
  color: #991b1b;
  margin-top: 3px;
}

.ac-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* FORUM */
.forum-thread {
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 10px;
}

.ft-lecture {
  font-size: 11.5px;
  color: var(--blue);
  font-family: var(--fm);
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ft-title {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 6px;
}

.ft-meta {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ft-actions {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

/* RESEARCH */
.rp-card {
  border: 1px solid var(--rule);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 14px;
}

.rp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.rp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 3px;
}

.rp-meta {
  font-size: 12.5px;
  color: var(--muted);
}

.rp-prog {
  margin-bottom: 12px;
}

/* MILESTONE */
.milestone-list {
  position: relative;
  padding-left: 24px;
}

.milestone-list::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--rule);
}

.milestone-item {
  position: relative;
  margin-bottom: 18px;
}

.milestone-item::before {
  content: "";
  position: absolute;
  left: -19px;
  top: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--rule2);
  border: 2px solid var(--white);
}

.milestone-item.done::before {
  background: var(--green);
}

.milestone-item.progress::before {
  background: var(--blue);
}

.mi-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 3px;
}

.mi-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 2px;
}

.mi-desc {
  font-size: 12.5px;
  color: var(--muted);
}

/* STUDENT DETAIL */
.stu-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.sd-item {
  padding: 12px 14px;
  background: var(--bg);
  border-radius: 9px;
}

.sd-key {
  font-size: 11.5px;
  color: var(--muted);
  font-weight: 500;
  margin-bottom: 3px;
}

.sd-val {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}

/* OVERLAY */
.overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 200;
  align-items: center;
  justify-content: center;
}

.overlay.show {
  display: flex;
}

.modal {
  background: var(--white);
  border-radius: 16px;
  padding: 28px;
  width: 520px;
  max-width: 92vw;
  max-height: 88vh;
  overflow-y: auto;
  animation: modalIn 0.22s ease both;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-title {
  font-family: var(--fd);
  font-size: 19px;
  font-weight: 400;
  color: var(--ink);
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--muted);
}

.modal-close:hover {
  background: var(--bg);
}

/* TOAST */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--ink);
  color: var(--bg);
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 13.5px;
  z-index: 500;
  animation: toastIn 0.3s ease both;
  display: none;
}

.toast.show {
  display: block;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* SETTINGS */
.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.check-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--blue);
  cursor: pointer;
}

/* UTILITY CLASSES FOR INLINE STYLES */
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.flex-wrap {
  flex-wrap: wrap;
}

.items-center {
  align-items: center;
}

.items-start {
  align-items: flex-start;
}

.justify-between {
  justify-content: space-between;
}

.justify-center {
  justify-content: center;
}

.gap-6 {
  gap: 6px;
}

.gap-8 {
  gap: 8px;
}

.gap-10 {
  gap: 10px;
}

.gap-12 {
  gap: 12px;
}

.gap-14 {
  gap: 14px;
}

.gap-18 {
  gap: 18px;
}

.mb-0 {
  margin-bottom: 0;
}

.mb-6 {
  margin-bottom: 6px;
}

.mb-8 {
  margin-bottom: 8px;
}

.mb-10 {
  margin-bottom: 10px;
}

.mb-12 {
  margin-bottom: 12px;
}

.mb-14 {
  margin-bottom: 14px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-18 {
  margin-bottom: 18px;
}

.mt-3 {
  margin-top: 3px;
}

.mt-4 {
  margin-top: 4px;
}

.mt-5 {
  margin-top: 5px;
}

.mt-6 {
  margin-top: 6px;
}

.mt-8 {
  margin-top: 8px;
}

.mt-10 {
  margin-top: 10px;
}

.mt-12 {
  margin-top: 12px;
}

.mt-14 {
  margin-top: 14px;
}

.mt-16 {
  margin-top: 16px;
}

.p-10 {
  padding: 10px;
}

.p-12 {
  padding: 12px;
}

.p-14 {
  padding: 14px;
}

.p-16 {
  padding: 16px;
}

.p-18 {
  padding: 18px;
}

.px-12 {
  padding-left: 12px;
  padding-right: 12px;
}

.px-14 {
  padding-left: 14px;
  padding-right: 14px;
}

.px-18 {
  padding-left: 18px;
  padding-right: 18px;
}

.py-6 {
  padding-top: 6px;
  padding-bottom: 6px;
}

.py-8 {
  padding-top: 8px;
  padding-bottom: 8px;
}

.py-10 {
  padding-top: 10px;
  padding-bottom: 10px;
}

.w-full {
  width: 100%;
}

.w-200 {
  width: 200px;
}

.w-220 {
  width: 220px;
}

.min-w-50 {
  min-width: 50px;
}

.min-w-80 {
  min-width: 80px;
}

.min-w-200 {
  min-width: 200px;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.flex-1 {
  flex: 1;
}

.shrink-0 {
  flex-shrink: 0;
}

.font-fm {
  font-family: var(--fm);
}

.font-fd {
  font-family: var(--fd);
}

.font-fb {
  font-family: var(--fb);
}

.text-11 {
  font-size: 11px;
}

.text-11-5 {
  font-size: 11.5px;
}

.text-12 {
  font-size: 12px;
}

.text-12-5 {
  font-size: 12.5px;
}

.text-13 {
  font-size: 13px;
}

.text-13-5 {
  font-size: 13.5px;
}

.text-14 {
  font-size: 14px;
}

.text-14-5 {
  font-size: 14.5px;
}

.text-15 {
  font-size: 15px;
}

.text-22 {
  font-size: 22px;
}

.text-28 {
  font-size: 28px;
}

.font-400 {
  font-weight: 400;
}

.font-500 {
  font-weight: 500;
}

.font-600 {
  font-weight: 600;
}

.text-ink {
  color: var(--ink);
}

.text-muted {
  color: var(--muted);
}

.text-muted2 {
  color: var(--muted2);
}

.text-soft {
  color: var(--soft);
}

.text-blue {
  color: var(--blue);
}

.text-green {
  color: var(--green);
}

.text-red {
  color: var(--red);
}

.text-amber {
  color: var(--amber);
}

.text-violet {
  color: var(--violet);
}

.bg-white {
  background: var(--white);
}

.bg-blue-l {
  background: var(--blue-l);
}

.bg-green-l {
  background: var(--green-l);
}

.bg-amber-l {
  background: var(--amber-l);
}

.bg-red-l {
  background: var(--red-l);
}

.bg-violet-l {
  background: var(--violet-l);
}

.border {
  border: 1px solid var(--rule);
}

.border-2 {
  border: 1.5px solid var(--rule2);
}

.border-blue {
  border-color: var(--blue);
}

.border-left-blue {
  border-left: 3px solid var(--blue);
}

.border-left-green {
  border-left: 3px solid var(--green);
}

.border-left-amber {
  border-left: 3px solid var(--amber);
}

.border-left-violet {
  border-left: 3px solid var(--violet);
}

.rounded-8 {
  border-radius: 8px;
}

.rounded-9 {
  border-radius: 9px;
}

.rounded-10 {
  border-radius: 10px;
}

.rounded-12 {
  border-radius: 12px;
}

.rounded-14 {
  border-radius: 14px;
}

.rounded-20 {
  border-radius: 20px;
}

.opacity-30 {
  opacity: 0.3;
}

.opacity-70 {
  opacity: 0.7;
}

.outline-none {
  outline: none;
}

.cursor-pointer {
  cursor: pointer;
}

.transition {
  transition: all 0.15s;
}

.grid-cols-2 {
  grid-template-columns: 1fr 1fr;
}

.grid-cols-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.grid-cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.overflow-x-auto {
  overflow-x: auto;
}

.relative {
  position: relative;
}

.absolute {
  position: absolute;
}

.z-50 {
  z-index: 50;
}

.ml-6 {
  margin-left: 6px;
}

/* Specific component classes */
.class-schedule {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border-left: 3px solid;
}

.class-item.blue {
  background: var(--blue-l);
  border-left-color: var(--blue);
}

.class-item.green {
  background: var(--green-l);
  border-left-color: var(--green);
}

.class-item.amber {
  background: var(--amber-l);
  border-left-color: var(--amber);
}

.class-time {
  font-family: var(--fm);
  font-size: 11px;
  min-width: 50px;
}

.class-item.blue .class-time {
  color: var(--blue);
}

.class-item.green .class-time {
  color: var(--green);
}

.class-item.amber .class-time {
  color: var(--amber);
}

.class-details {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
}

.class-meta {
  font-size: 12px;
  color: var(--muted);
}

.stats-compact {
  padding: 10px 14px;
  min-width: 80px;
  text-align: center;
}

.stats-compact .sc-val {
  font-family: var(--fd);
  font-size: 22px;
}

.stats-compact .sc-sub {
  font-size: 11px;
  color: var(--muted);
}

.form-compact {
  margin-bottom: 0;
}

.form-compact input {
  font-size: 14px;
}

.check-row-justify {
  justify-content: space-between;
}

.check-label {
  font-size: 14px;
}

.research-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.progress-label {
  font-size: 12.5px;
  color: var(--muted);
}

.progress-value {
  font-family: var(--fm);
  font-size: 12px;
}

.progress-value.blue {
  color: var(--blue);
}

.progress-value.green {
  color: var(--green);
}

.submission-item {
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submission-title {
  font-size: 13.5px;
  color: var(--ink);
}

.submission-date {
  font-size: 12px;
  color: var(--muted);
}

.thread-meta {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.thread-message {
  background: var(--bg);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}

.thread-message-content {
  font-size: 13.5px;
  color: var(--soft);
}

.thread-message-time {
  font-size: 12px;
  color: var(--muted2);
  margin-top: 8px;
}

.thread-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 4px;
}

.student-id-small {
  font-family: var(--fm);
  font-size: 11px;
  font-weight: 400;
  color: #991b1b;
  margin-left: 6px;
}

.alert-meta {
  font-size: 12.5px;
  color: #991b1b;
  margin-top: 3px;
}

.tt-header-info {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 18px;
}

.tt-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.assessment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 10px;
}

.search-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.search-input {
  padding: 8px 12px;
  border: 1.5px solid var(--rule2);
  border-radius: 8px;
  font-family: var(--fb);
  font-size: 13px;
  outline: none;
  width: 220px;
}

.filter-select {
  padding: 8px 12px;
  border: 1.5px solid var(--rule2);
  border-radius: 8px;
  font-family: var(--fb);
  font-size: 13px;
  outline: none;
}

.att-header-info {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.att-header-title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink);
}

.att-header-subtitle {
  font-size: 12.5px;
  color: var(--muted);
}

.att-header-actions {
  display: flex;
  gap: 8px;
}

.att-count-info {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}

.modal-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-actions .btn-primary {
  flex: 1;
}

.student-detail-id {
  font-family: var(--fm);
  font-size: 13px;
}

.student-detail-attendance {
  color: var(--amber);
}

.research-modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
}

.research-modal-subtitle {
  font-size: 12.5px;
  color: var(--muted);
}

.forum-modal-info {
  font-size: 12px;
  color: var(--blue);
  font-family: var(--fm);
  margin-bottom: 12px;
}

.quick-reply-info {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 14px;
}

@media (max-width: 1024px) {
  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-3 {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .main {
    margin-left: 0;
  }
  .topbar-menu {
    display: flex;
  }
  .content {
    padding: 16px;
  }
  .stat-row {
    grid-template-columns: 1fr 1fr;
  }
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .grid-3 {
    grid-template-columns: 1fr;
  }
  .overlay-sb {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 99;
  }
  .overlay-sb.show {
    display: block;
  }
}

@media (max-width: 500px) {
  .stat-row {
    grid-template-columns: 1fr;
  }
  .ac-actions {
    flex-direction: column;
  }
  .att-student-row {
    flex-wrap: wrap;
  }
}
"@

Set-Content $cssPath $formatted
Write-Host "CSS file has been completely reformatted with proper indentation"
