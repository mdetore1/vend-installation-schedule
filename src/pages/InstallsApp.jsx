import { useState } from "react";
import { LogOut, Users } from "lucide-react";
import { VendMark } from "../components/Logo";
import { useAuth } from "../lib/auth";
import { AuthForm, PendingScreen, ManageUsersModal, SetPasswordScreen } from "../components/auth/AuthScreens";
import ProjectTracker from "./ProjectTracker";
import LocationsMap from "../components/globe/LocationsMap";
import Dashboard from "./Dashboard";

const TABS = [
  { id: "schedule", label: "Installation Schedule" },
  { id: "map", label: "Map" },
  { id: "dashboard", label: "Dashboard" },
];

export default function InstallsApp() {
  const auth = useAuth();
  const [view, setView] = useState("schedule");
  const [showUsers, setShowUsers] = useState(false);

  if (auth.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-concrete-100/50">
        <VendMark size={36} />
      </div>
    );
  }

  if (auth.needsPasswordSet) {
    return <SetPasswordScreen onSubmit={auth.updatePassword} />;
  }

  if (!auth.session) {
    return <AuthForm onLogin={auth.login} />;
  }

  if (auth.isPending) {
    return <PendingScreen email={auth.profile?.email || auth.session.user.email} onLogout={auth.logout} />;
  }

  // The Onboarding Dashboard's edit/delete rights (including Manage
  // Template) are scoped tighter than the app's general admin role — only
  // Super Admins can edit there, regardless of who else holds the regular
  // admin role for the Installation Schedule/Map.
  const isDashboardAdmin = auth.isSuperAdmin;
  const needsAttentionCount = auth.users.filter((u) => u.role === "pending" || u.admin_requested).length;

  return (
    <div className="flex h-screen flex-col bg-concrete-100/50">
      <div className="flex shrink-0 items-center gap-4 border-b border-concrete-200 bg-white px-6 py-2.5">
        <VendMark size={32} />
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                view === t.id ? "bg-vend-black text-white" : "text-slate-500 hover:bg-concrete-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-slate-400">
            {auth.profile.display_name} · {auth.isSuperAdmin ? "Super Admin" : auth.isAdmin ? "Admin" : "Viewer"}
            {!auth.isAdmin &&
              (auth.profile.admin_requested ? (
                <span className="ml-1.5 text-slate-300">(admin requested)</span>
              ) : (
                <button
                  type="button"
                  onClick={auth.requestAdmin}
                  className="ml-1.5 font-semibold text-beacon-700 underline hover:text-beacon-600"
                >
                  Request admin
                </button>
              ))}
          </span>
          {auth.isAdmin && (
            <button
              type="button"
              onClick={() => setShowUsers(true)}
              title="Approve new sign-ups, change roles"
              className="relative inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
            >
              <Users size={13} /> Manage users
              {needsAttentionCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-alert-600 text-[9px] font-bold text-white">
                  {needsAttentionCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={auth.logout}
            title="Log out"
            className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
          >
            <LogOut size={13} /> Log out
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "schedule" && (
          <div className="h-full overflow-y-auto">
            <ProjectTracker isAdmin={auth.isAdmin} />
          </div>
        )}
        {view === "map" && (
          <div className="h-full">
            <LocationsMap isAdmin={auth.isAdmin} />
          </div>
        )}
        {view === "dashboard" && (
          <div className="h-full overflow-y-auto">
            <Dashboard isAdmin={isDashboardAdmin} />
          </div>
        )}
      </div>

      <ManageUsersModal
        open={showUsers}
        onClose={() => setShowUsers(false)}
        users={auth.users}
        currentUser={auth.profile}
        onUpdateRole={auth.updateUserRole}
        onRevoke={auth.revokeAccess}
        onDelete={auth.deleteUser}
        onCreateLogin={auth.createLogin}
        onResetPassword={auth.resetPassword}
        onDismissAdminRequest={auth.dismissAdminRequest}
        onSetSuperAdmin={auth.setSuperAdmin}
      />
    </div>
  );
}
