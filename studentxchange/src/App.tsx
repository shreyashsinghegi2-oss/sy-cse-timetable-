import { Route, Routes, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AppShell from "@/components/app/AppShell";
import Dashboard from "@/pages/app/Dashboard";
import Marketplace from "@/pages/app/Marketplace";
import ModulePlaceholder from "@/pages/app/ModulePlaceholder";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      {/* Legacy URL kept alive during migration (audit §25) */}
      <Route path="/lancing/login" element={<Navigate to="/login" replace />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="*" element={<ModulePlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
