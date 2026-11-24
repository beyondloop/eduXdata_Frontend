import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./AppShell";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="/overview" element={<AppShell />} />
      <Route path="/students" element={<AppShell />} />
      <Route path="/teachers" element={<AppShell />} />
      <Route path="/academics" element={<AppShell />} />
      <Route path="/attendance" element={<AppShell />} />
      <Route path="/homework" element={<AppShell />} />
      <Route path="/exams-and-results" element={<AppShell />} />
      <Route path="/fees-and-payments" element={<AppShell />} />
      <Route path="/timetable" element={<AppShell />} />
      <Route path="/announcements" element={<AppShell />} />
      <Route path="/holidays" element={<AppShell />} />
      <Route path="/ai-assistant" element={<AppShell />} />
      <Route path="/profile" element={<AppShell />} />
      <Route path="/settings" element={<AppShell />} />
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}
