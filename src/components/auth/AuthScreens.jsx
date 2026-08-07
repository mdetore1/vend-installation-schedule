import { useState } from "react";
import { X } from "lucide-react";
import { VendMark } from "../Logo";
import { Field, TextInput, Select } from "../fields";

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex h-screen items-center justify-center bg-concrete-100/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-concrete-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <VendMark size={36} />
          <h1 className="mt-3 font-display text-lg font-bold text-vend-black">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function FirstAdminSetup({ onCreate, onImportClick }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter a username and password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    onCreate(username, password);
  }

  return (
    <AuthShell
      title="Set up the admin account"
      subtitle="This first account gets edit access. Add more people — as admins or view-only — from Manage users once you're in."
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Username">
          <TextInput autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. matt" />
        </Field>
        <Field label="Password">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="text-xs font-semibold text-alert-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-vend-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Create admin account
        </button>
      </form>
      {onImportClick && (
        <button
          type="button"
          onClick={onImportClick}
          className="mt-4 w-full text-center text-xs font-semibold text-slate-400 hover:text-vend-black"
        >
          Someone already shared a backup file with you? Import it instead
        </button>
      )}
    </AuthShell>
  );
}

export function LoginForm({ onLogin, onImportClick }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const ok = onLogin(username, password);
    if (!ok) setError("Incorrect username or password.");
  }

  return (
    <AuthShell title="Log in" subtitle="Vend Installation Schedule">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Username">
          <TextInput autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Password">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-xs font-semibold text-alert-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-vend-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Log in
        </button>
      </form>
      {onImportClick && (
        <button
          type="button"
          onClick={onImportClick}
          className="mt-4 w-full text-center text-xs font-semibold text-slate-400 hover:text-vend-black"
        >
          Have a backup file instead? Import it
        </button>
      )}
    </AuthShell>
  );
}

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer — can't edit" },
  { value: "admin", label: "Admin — can edit" },
];

export function ManageUsersModal({ open, onClose, users, currentUser, onAddUser, onUpdateUser, onRemoveUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState("");

  if (!open) return null;

  function submit() {
    const res = onAddUser(username, password, role);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUsername("");
    setPassword("");
    setRole("viewer");
    setError("");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-vend-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-concrete-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-vend-black">Manage users</h2>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-vend-black">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">People</p>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-concrete-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-vend-black">
                      {u.username}
                      {u.id === currentUser?.id ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-slate-400">{u.role === "admin" ? "Admin — can edit" : "Viewer — can't edit"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onUpdateUser(u.id, { role: u.role === "admin" ? "viewer" : "admin" })}
                      className="text-xs font-semibold text-slate-500 hover:text-vend-black"
                    >
                      Make {u.role === "admin" ? "viewer" : "admin"}
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => onRemoveUser(u.id)}
                        className="text-xs font-semibold text-alert-600 hover:text-alert-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Add a person</p>
            <div className="space-y-3">
              <Field label="Username">
                <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. cerel" />
              </Field>
              <Field label="Password">
                <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Access">
                <Select value={role} onChange={(e) => setRole(e.target.value)} options={ROLE_OPTIONS} />
              </Field>
              {error && <p className="text-xs font-semibold text-alert-600">{error}</p>}
              <button
                type="button"
                onClick={submit}
                className="w-full rounded-full bg-vend-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Add person
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
