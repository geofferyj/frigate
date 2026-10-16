// Entry for the Site pages, mounted by Frigate's router at /site-watch/* (the one route added in
// src/App.tsx). Everything under this folder is ours; see docs/frigate-ui-changes.md.
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./i18n";

const AlertsPage = lazy(() => import("./pages/Alerts"));
const AttendancePage = lazy(() => import("./pages/Attendance"));
const RulesPage = lazy(() => import("./pages/Rules"));
const SchedulePage = lazy(() => import("./pages/Schedule"));
const RecipientsPage = lazy(() => import("./pages/Recipients"));
const SnoozesPage = lazy(() => import("./pages/Snoozes"));

export default function SiteWatch() {
  // Admin-only pages check the role themselves (components/Shell.tsx) and send viewers to
  // Frigate's "access denied" page, and the back end refuses their calls regardless.
  return (
    <Routes>
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="rules" element={<RulesPage />} />
      <Route path="schedule" element={<SchedulePage />} />
      <Route path="recipients" element={<RecipientsPage />} />
      <Route path="snoozes" element={<SnoozesPage />} />
      <Route path="*" element={<Navigate to="attendance" replace />} />
    </Routes>
  );
}
