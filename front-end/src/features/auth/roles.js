import { BookOpen, Building2, GraduationCap, Headphones, Landmark, Users, Wallet } from 'lucide-react';

/** Portals offered on the sign-in page. `key` is sent to the backend as `portal`. */
export const LOGIN_PORTALS = [
  { key: 'student', label: 'Student', description: 'Courses, attendance, timetable and results', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty', description: 'Attendance marking, assessments and students', icon: BookOpen },
  { key: 'hod', label: 'HOD', description: 'Department approvals, users and reports', icon: Users },
  { key: 'director', label: 'Director', description: 'Institute-wide reports and administration', icon: Landmark },
  { key: 'finance', label: 'Finance', description: 'Fee records, dues and receipts', icon: Wallet },
];

/** Less common portals, shown as small links under the main cards. */
export const OTHER_PORTALS = [
  { key: 'spoc', label: 'Institute SPOC', description: 'College setup, people and subscription', icon: Building2 },
  { key: 'support', label: 'Platform support', description: 'Support staff of the platform', icon: Headphones },
];

export const ALL_PORTALS = [...LOGIN_PORTALS, ...OTHER_PORTALS];
export const portalByKey = (key) => ALL_PORTALS.find((p) => p.key === key) || LOGIN_PORTALS[0];
