/** Topbar — ported from legacy `.top-header-bar` (an `<h1 id="page-title">` plus the injected notification bell). */

export default function Topbar({ title, children }) {
  return (
    <div className="top-header-bar">
      <h1>{title}</h1>
      {children}
    </div>
  );
}
