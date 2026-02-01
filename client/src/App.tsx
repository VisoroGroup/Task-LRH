import { Route, Switch, useLocation, useRoute } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider, RequireAuth } from "@/components/AuthProvider";
import { CEODashboard } from "@/pages/CEODashboard";
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
          {/* All authenticated users routes */}
          <Route path="/" component={CEODashboard} />
          <Route path="/my-tasks" component={TeamTasks} />
          <Route path="/recurring-tasks" component={RecurringTasks} />
          <Route path="/team-tasks" component={TeamTasks} />
          <Route path="/sarcini" component={TeamTasks} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/ideal-scene" component={IdealScene} />
          <Route path="/departments" component={Departments} />
          <Route path="/policies" component={PoliciesPage} />

          {/* CEO only - Settings */}
          <Route path="/settings">
            <RequireAuth roles={["CEO"]}>
              <Settings />
            </RequireAuth>
          </Route>

          {/* CEO & EXECUTIVE only - Team Settings */}
          <Route path="/team-settings">
            <RequireAuth roles={["CEO", "EXECUTIVE"]}>
              <TeamSettings />
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

