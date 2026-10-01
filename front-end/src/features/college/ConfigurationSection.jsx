import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../auth/authSlice';
import { useApiResource } from '../../hooks/useApiResource';
import { ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import ProfileForm from './ProfileForm';
import DepartmentsSection from './DepartmentsSection';
import StructureForm from './StructureForm';
import GradingForm from './GradingForm';
import IdFormatBuilder from './IdFormatBuilder';
import CustomFieldsForm from './CustomFieldsForm';
import { isAdminRole } from './collegeShared';
import './college.css';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'departments', label: 'Departments' },
  { key: 'structure', label: 'Structure' },
  { key: 'grading', label: 'Grading & attendance' },
  { key: 'ids', label: 'ID formats' },
  { key: 'fields', label: 'Custom fields' },
];

/**
 * College configuration (GET /college/settings, PUT /college/settings/*).
 * Directors and the SPOC can edit; other roles see it read-only (the server
 * rejects their writes regardless).
 */
export default function ConfigurationSection({ title = 'Configuration', subtitle } = {}) {
  const user = useSelector(selectCurrentUser);
  const canEdit = isAdminRole(user?.role);
  const res = useApiResource('/college/settings');
  const [tab, setTab] = useState('profile');
  // Bumped after a save so every form re-reads the server's normalised values.
  const [version, setVersion] = useState(0);

  const [fresh, setFresh] = useState(null);
  const [notice, setNotice] = useState(null);

  // Settings PUTs return the full settings payload (profile returns the college),
  // so the forms remount on the server's normalised values (e.g. new batch ids).
  const saved = (data) => {
    const base = fresh || res.data;
    setFresh(data?.settings ? data : { ...base, college: data });
    setVersion((v) => v + 1);
    setNotice(`${TABS.find((t) => t.key === tab)?.label} saved.`);
  };

  const selectTab = (key) => {
    setTab(key);
    setNotice(null);
  };

  const config = fresh || res.data;
  const formProps = { config, canEdit, onSaved: saved };

  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.key === tab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
      selectTab(next.key);
      document.getElementById(`cfg-tab-${next.key}`)?.focus();
    }
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">{title}</h1>
          <p className="sp-page-subtitle">{subtitle || 'Your college profile, academic structure, grading, ID formats and custom fields'}</p>
        </div>
      </div>
      <section className="sp-card">
        {!canEdit && <div className="sp-alert is-info" role="note" style={{ marginBottom: 14 }}><span>You can view these settings. Only the Director or the Institute SPOC can change them.</span></div>}
        <div className="cl-tabs" role="tablist" aria-label="Configuration sections" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button key={t.key} id={`cfg-tab-${t.key}`} type="button" role="tab" aria-selected={tab === t.key} aria-controls="cfg-panel"
              tabIndex={tab === t.key ? 0 : -1} onClick={() => selectTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div id="cfg-panel" role="tabpanel" aria-labelledby={`cfg-tab-${tab}`}>
          {notice && <div className="sp-alert is-success" role="status" style={{ marginBottom: 14 }}><span>{notice}</span></div>}
          {tab === 'departments' ? (
            <DepartmentsSection canEdit={canEdit} onChanged={() => { setFresh(null); res.reload(); }} />
          ) : res.status === 'failed' ? (
            <ErrorState error={res.error} onRetry={res.reload} />
          ) : !config ? (
            <LoadingState label="Loading settings" lines={5} />
          ) : (
            <div key={`${tab}-${version}`}>
              {tab === 'profile' && <ProfileForm {...formProps} />}
              {tab === 'structure' && <StructureForm {...formProps} />}
              {tab === 'grading' && <GradingForm {...formProps} />}
              {tab === 'ids' && <IdFormatBuilder {...formProps} />}
              {tab === 'fields' && <CustomFieldsForm {...formProps} />}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
