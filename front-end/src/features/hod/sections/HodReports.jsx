import React from 'react';
import { useSelector } from 'react-redux';
import DepartmentReport from '../components/DepartmentReport';

export default function HodReports() {
  const department = useSelector((state) => state.auth.user?.department);
  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Reports</h1>
          <p className="sp-page-subtitle">
            {department?.name ? `${department.name}: ` : ''}attendance, results and at-risk students, with CSV and PDF exports.
          </p>
        </div>
      </div>
      <DepartmentReport departmentId={department?.department_id} />
    </>
  );
}
