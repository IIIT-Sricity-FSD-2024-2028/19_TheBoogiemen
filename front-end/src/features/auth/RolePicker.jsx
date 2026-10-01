import React from 'react';
import { LOGIN_PORTALS, OTHER_PORTALS } from './roles';

/**
 * Portal chooser. Native radio inputs styled as cards, so arrow keys, Tab and
 * screen readers work without extra code. `variant="cards"` is the navy side
 * panel; `variant="chips"` is the compact version shown above the form on phones.
 */
export default function RolePicker({ value, onChange, variant = 'cards', name = 'portal' }) {
  if (variant === 'chips') {
    return (
      <fieldset className="sp-role-chips">
        <legend className="sp-visually-hidden">Sign in as</legend>
        {[...LOGIN_PORTALS, ...OTHER_PORTALS].map((p) => (
          <label key={p.key} className={`sp-role-chip${value === p.key ? ' is-selected' : ''}`}>
            <input type="radio" name={`${name}-chip`} value={p.key} checked={value === p.key} onChange={() => onChange(p.key)} />
            {p.label}
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <div>
      <h2 className="sp-role-heading">Choose your portal</h2>
      <fieldset className="sp-role-cards">
        <legend className="sp-visually-hidden">Sign in as</legend>
        {LOGIN_PORTALS.map(({ key, label, description, icon: Icon }) => (
          <label key={key} className={`sp-role-card${value === key ? ' is-selected' : ''}`}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
            <span className="sp-role-card-icon" aria-hidden="true"><Icon size={18} /></span>
            <span>
              <span className="sp-role-card-title">{label}</span>
              <span className="sp-role-card-desc">{description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="sp-role-others">
        {OTHER_PORTALS.map(({ key, label, icon: Icon }) => (
          <label key={key} className={`sp-role-other${value === key ? ' is-selected' : ''}`}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
            <Icon size={14} aria-hidden="true" /> {label}
          </label>
        ))}
      </div>
    </div>
  );
}
