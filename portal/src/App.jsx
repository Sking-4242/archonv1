import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import MarketingLayout from "./components/marketing/MarketingLayout";
import HomePage from "./pages/marketing/HomePage";
import RoadmapPage from "./pages/marketing/RoadmapPage";
import GuidesIndexPage from "./pages/marketing/GuidesIndexPage";
import {
  InstallationGuidePage,
  GettingStartedGuidePage,
  LtiGuidePage,
} from "./pages/marketing/GuidePages";
import DownloadPage from "./pages/marketing/DownloadPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function RequireAuth({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route index element={<HomePage />} />
          <Route path="pricing" element={<Navigate to="/" replace />} />
          <Route path="roadmap" element={<RoadmapPage />} />
          <Route path="guides" element={<GuidesIndexPage />} />
          <Route path="guides/installation" element={<InstallationGuidePage />} />
          <Route path="guides/getting-started" element={<GettingStartedGuidePage />} />
          <Route path="guides/lti" element={<LtiGuidePage />} />
          <Route path="download" element={<DownloadPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
