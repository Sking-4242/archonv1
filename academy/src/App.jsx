import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import useAccessStore from "./store/accessStore";
import UpgradePrompt from "./components/ui/UpgradePrompt";
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
import StudentPracticeTests from "./components/practice/StudentPracticeTests";
import PracticeTestRunner from "./components/practice/PracticeTestRunner";

// Instructor pages
import InstructorHome from "./components/instructor/InstructorHome";
import InstructorClasses from "./components/instructor/InstructorClasses";
import InstructorClassDetail from "./components/instructor/InstructorClassDetail";
import InstructorAssignments from "./components/instructor/InstructorAssignments";
import InstructorModules from "./components/instructor/InstructorModules";
import InstructorLessonPlans from "./components/instructor/InstructorLessonPlans";
import InstructorGradebook from "./components/instructor/InstructorGradebook";
import InstructorAnalytics from "./components/instructor/InstructorAnalytics";
import InstructorTeachingAssistant from "./components/instructor/InstructorTeachingAssistant";
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
  const { user } = useAuthStore();
  const refreshAccess = useAccessStore((s) => s.refresh);

  useEffect(() => {
    if (user) refreshAccess();
  }, [user, refreshAccess]);

  return (
    <RequireAuth role="student">
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function InstructorShell({ children }) {
  const { user } = useAuthStore();
  const refreshAccess = useAccessStore((s) => s.refresh);
  const canUse = useAccessStore((s) => s.canUse);
  const loaded = useAccessStore((s) => s.loaded);

  useEffect(() => {
    if (user) refreshAccess();
  }, [user, refreshAccess]);

  if (!loaded) {
    return (
      <RequireAuth role="instructor">
        <AppShell>
          <div className="text-sm text-gray-500 p-8">Loading…</div>
        </AppShell>
      </RequireAuth>
    );
  }

  if (!canUse("instructor_dashboard")) {
    return (
      <RequireAuth role="instructor">
        <AppShell>
          <UpgradePrompt feature="instructor_dashboard" />
        </AppShell>
      </RequireAuth>
    );
  }

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
        <Route path="/practice-tests" element={<StudentShell><StudentPracticeTests /></StudentShell>} />

        <Route
          path="/practice-tests/run/:attemptId"
          element={
            <RequireAuth role="student">
              <PracticeTestRunner />
            </RequireAuth>
          }
        />

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
        <Route path="/instructor/classes"                element={<InstructorShell><InstructorClasses /></InstructorShell>} />
        <Route path="/instructor/classes/:classId"       element={<InstructorShell><InstructorClassDetail /></InstructorShell>} />
        <Route path="/instructor/assignments"            element={<InstructorShell><InstructorAssignments /></InstructorShell>} />
        <Route path="/instructor/modules"                element={<InstructorShell><InstructorModules /></InstructorShell>} />
        <Route path="/instructor/lesson-plans"           element={<InstructorShell><InstructorLessonPlans /></InstructorShell>} />
        <Route path="/instructor/lessons/:lessonId/edit" element={<InstructorShell><InstructorLessonPlans /></InstructorShell>} />
        <Route path="/instructor/gradebook"              element={<InstructorShell><InstructorGradebook /></InstructorShell>} />
        <Route path="/instructor/assistant"              element={<InstructorShell><InstructorTeachingAssistant /></InstructorShell>} />
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
