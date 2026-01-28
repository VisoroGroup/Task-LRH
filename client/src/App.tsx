import { Route, Switch, useLocation, useRoute } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider, RequireAuth } from "@/components/AuthProvider";
import { CEODashboard } from "@/pages/CEODashboard";
import { MyTasks } from "@/pages/MyTasks";
import { TeamTasks } from "@/pages/TeamTasks";
import { TeamSettings } from "@/pages/TeamSettings";
import { AcceptInvitation } from "@/pages/AcceptInvitation";
import { IdealScene } from "@/pages/IdealScene";
import { Departments } from "@/pages/Departments";
import { Calendar } from "@/pages/Calendar";
import { Settings } from "@/pages/Settings";
import { LoginPage } from "@/pages/LoginPage";
import { PoliciesPage } from "@/pages/PoliciesPage";
import { RecurringTasks } from "@/pages/RecurringTasks";

// Wrapper component for invitation page with token param
function InvitePage() {
  const [, params] = useRoute("/invite/:token");
  return <AcceptInvitation token={params?.token || ""} />;
}

function AppRoutes() {
  const [location] = useLocation();

  // Login page without layout
  if (location === "/login") {
    return <LoginPage />;
  }

  // Invitation page without auth
  if (location.startsWith("/invite/")) {
    return <InvitePage />;
  }

  return (
    <RequireAuth>
      <MainLayout>
        <Switch>
          {/* CEO & EXECUTIVE routes */}
          <Route path="/">
            <RequireAuth roles={["CEO", "EXECUTIVE"]}>
              <CEODashboard />
            </RequireAuth>
          </Route>

          {/* All authenticated users */}
          <Route path="/my-tasks" component={MyTasks} />
          <Route path="/recurring-tasks" component={RecurringTasks} />
          <Route path="/team-tasks">
            <RequireAuth roles={["CEO", "EXECUTIVE"]}>
              <TeamTasks />
            </RequireAuth>
          </Route>
          <Route path="/calendar" component={Calendar} />

          {/* CEO & EXECUTIVE routes */}
          <Route path="/ideal-scene">
            <RequireAuth roles={["CEO", "EXECUTIVE"]}>
              <IdealScene />
            </RequireAuth>
          </Route>

          <Route path="/departments">
            <RequireAuth roles={["CEO", "EXECUTIVE"]}>
              <Departments />
            </RequireAuth>
          </Route>

          {/* CEO only */}
          <Route path="/settings">
            <RequireAuth roles={["CEO"]}>
              <Settings />
            </RequireAuth>
          </Route>

          <Route path="/team-settings">
            <RequireAuth roles={["CEO", "EXECUTIVE"]}>
              <TeamSettings />
            </RequireAuth>
          </Route>

          {/* CEO only - Policies */}
          <Route path="/policies">
            <RequireAuth roles={["CEO"]}>
              <PoliciesPage />
            </RequireAuth>
          </Route>
        </Switch>
      </MainLayout>
    </RequireAuth>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}

export default App;

