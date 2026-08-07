import { useState } from "react";
import { LogOut, Users } from "lucide-react";
import { VendMark } from "../components/Logo";
import { useAuth } from "../lib/auth";
import { AuthForm, PendingScreen, ManageUsersModal, SetPasswordScreen } from "../components/auth/AuthScreens";
import ProjectTracker from "./ProjectTracker";
import LocationsMap from "../components/globe/LocationsMap";

const TABS = [
  { id: "schedule", label: "Installation Schedule" },
  { id: "map", label: "Map" },
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
    return <AuthForm onSignUp={auth.signUp} onLogin={auth.login} />;
  }

  if (auth.isPending) {
    return <PendingScreen email={auth.profile?.email || auth.session.user.email} onLogout={auth.logout} />;
  }

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
            {auth.profile.display_name} · {auth.isAdmin ? "Admin" : "Viewer"}
          </span>
          {auth.isAdmin && (
            <button
              type="button"
              onClick={() => setShowUsers(true)}
              title="Approve new sign-ups, change roles"
              className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
            >
              <Users size={13} /> Manage users
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
      </div>

      <ManageUsersModal
        open={showUsers}
        onClose={() => setShowUsers(false)}
        users={auth.users}
        currentUser={auth.profile}
        onUpdateRole={auth.updateUserRole}
        onRevoke={auth.revokeAccess}
        onInvite={auth.inviteUser}
        onDelete={auth.deleteUser}
      />
    </div>
  );
}
