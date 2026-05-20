import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./components/auth/LoginPage";

// Student pages
import StudentHome from "./components/student/StudentHome";
import StudentAssignments from "./components/student/StudentAssignments";
import StudentModules from "./components/student/StudentModules";
import StudentModuleDetail from "./components/student/StudentModuleDetail";
import StudentLessons from "./components/student/StudentLessons";
import StudentLibrary from "./components/student/StudentLibrary";
import StudentLibraryBrowser from "./components/student/StudentLibraryBrowser";
import StudentSandbox from "./components/student/StudentSandbox";
import StudentGrades from "./components/student/StudentGrades";
import StudentTools from "./components/student/StudentTools";
import StudentTeams from "./components/student/StudentTeams";
import StudentAnnouncements from "./components/student/StudentAnnouncements";

// Instructor pages
import InstructorHome from "./components/instructor/InstructorHome";
import InstructorAssignments from "./components/instructor/InstructorAssignments";
import InstructorModules from "./components/instructor/InstructorModules";
import InstructorLessonPlans from "./components/instructor/InstructorLessonPlans";
import InstructorGradebook from "./components/instructor/InstructorGradebook";
import InstructorAnalytics from "./components/instructor/InstructorAnalytics";
import InstructorRubricBank from "./components/instructor/InstructorRubricBank";
import InstructorAnnouncements from "./components/instructor/InstructorAnnouncements";
import InstructorTeams from "./components/instructor/InstructorTeams";
import InstructorSettings from "./components/instructor/InstructorSettings";

// Canvas & review
import AssignmentCanvas from "./components/canvas/AssignmentCanvas";
import SubmissionReview from "./components/instructor/SubmissionReview";

function RequireAuth({ children, role }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function RoleRouter() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "instructor") return <Navigate to="/instructor" replace />;
  return <Navigate to="/dashboard" replace />;
}

function StudentShell({ children }) {
  return (
    <RequireAuth role="student">
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function InstructorShell({ children }) {
  return (
    <RequireAuth role="instructor">
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleRouter />} />

        {/* Student routes */}
        <Route path="/dashboard"      element={<StudentShell><StudentHome /></StudentShell>} />
        <Route path="/assignments"    element={<StudentShell><StudentAssignments /></StudentShell>} />
        <Route path="/modules"        element={<StudentShell><StudentModules /></StudentShell>} />
        <Route path="/modules/:moduleId" element={<StudentShell><StudentModuleDetail /></StudentShell>} />
        <Route path="/lessons"        element={<StudentShell><StudentLessons /></StudentShell>} />
        <Route path="/library"         element={<StudentShell><StudentLibrary /></StudentShell>} />
        <Route path="/course-library"  element={<StudentShell><StudentLibraryBrowser /></StudentShell>} />
        <Route path="/sandbox"        element={<StudentShell><StudentSandbox /></StudentShell>} />
        <Route path="/grades"         element={<StudentShell><StudentGrades /></StudentShell>} />
        <Route path="/tools"          element={<StudentShell><StudentTools /></StudentShell>} />
        <Route path="/teams"          element={<StudentShell><StudentTeams /></StudentShell>} />
        <Route path="/announcements"  element={<StudentShell><StudentAnnouncements /></StudentShell>} />

        {/* Assignment canvas — full screen, no AppShell tabs */}
        <Route
          path="/assignment/:id"
          element={
            <RequireAuth role="student">
              <AssignmentCanvas />
            </RequireAuth>
          }
        />

        {/* Instructor routes */}
        <Route path="/instructor"                        element={<InstructorShell><InstructorHome /></InstructorShell>} />
        <Route path="/instructor/assignments"            element={<InstructorShell><InstructorAssignments /></InstructorShell>} />
        <Route path="/instructor/modules"                element={<InstructorShell><InstructorModules /></InstructorShell>} />
        <Route path="/instructor/lesson-plans"           element={<InstructorShell><InstructorLessonPlans /></InstructorShell>} />
        <Route path="/instructor/lessons/:lessonId/edit" element={<InstructorShell><InstructorLessonPlans /></InstructorShell>} />
        <Route path="/instructor/gradebook"              element={<InstructorShell><InstructorGradebook /></InstructorShell>} />
        <Route path="/instructor/analytics"              element={<InstructorShell><InstructorAnalytics /></InstructorShell>} />
        <Route path="/instructor/rubric-bank"            element={<InstructorShell><InstructorRubricBank /></InstructorShell>} />
        <Route path="/instructor/announcements"          element={<InstructorShell><InstructorAnnouncements /></InstructorShell>} />
        <Route path="/instructor/teams"                  element={<InstructorShell><InstructorTeams /></InstructorShell>} />
        <Route path="/instructor/settings"               element={<InstructorShell><InstructorSettings /></InstructorShell>} />

        {/* Submission review — full screen */}
        <Route
          path="/instructor/submission/:id"
          element={
            <RequireAuth role="instructor">
              <SubmissionReview />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
