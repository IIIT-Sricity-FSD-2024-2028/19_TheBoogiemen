import React, { lazy } from 'react';
import { Bell, FileSpreadsheet, IndianRupee, LayoutDashboard, LifeBuoy, Megaphone, Receipt } from 'lucide-react';
import PortalLayout from '../../shared/ui/PortalLayout';
import './finance.css';

/**
 * Finance Portal (FINANCE_ADMIN). Fee sections are not hidden with `module`
 * so that a college without the fees module sees a clear "not in your plan"
 * state instead of an empty portal; each section gates itself (FeesGate).
 */
const NAV = [
  { group: 'Overview', path: '', label: 'Dashboard', icon: LayoutDashboard, component: lazy(() => import('./sections/FinanceDashboard')), keywords: 'home collected billed outstanding overdue' },
  { group: 'Fees', path: 'structures', label: 'Fee structures', icon: FileSpreadsheet, component: lazy(() => import('./sections/FeeStructures')), keywords: 'batch semester components generate' },
  { group: 'Fees', path: 'records', label: 'Fee records', icon: IndianRupee, component: lazy(() => import('./sections/FeeRecords')), keywords: 'student fee record payment add' },
  { group: 'Fees', path: 'payments', label: 'Payments and receipts', icon: Receipt, component: lazy(() => import('./sections/FeePayments')), keywords: 'receipt pdf transactions' },
  { group: 'Fees', path: 'dues', label: 'Dues and reminders', icon: Bell, component: lazy(() => import('./sections/FeeDues')), keywords: 'overdue pending remind' },
  { group: 'Community', path: 'announcements', label: 'Announcements', icon: Megaphone, component: lazy(() => import('../shared/AnnouncementsSection')), keywords: 'notices news' },
  { group: 'Support', path: 'help', label: 'Help and support', icon: LifeBuoy, component: lazy(() => import('../shared/HelpSupportSection')), keywords: 'ticket issue support' },
];

export default function FinancePortal() {
  return <PortalLayout portalLabel="Finance Portal" basePath="/finance" nav={NAV} />;
}
