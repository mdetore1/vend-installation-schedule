import { useState } from "react";
import { X } from "lucide-react";
import { VendMark } from "../Logo";
import { Field, TextInput } from "../fields";

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

// No self-service sign-up — this project has no outbound email configured,
// so a confirmation-link flow would just strand people. An admin creates
// every login from Manage Users instead (see ManageUsersModal below), which
// hands back a password directly instead of emailing anything.
export function AuthForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await onLogin(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <AuthShell title="Log in" subtitle="Vend Installation Schedule">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Work email">
          <TextInput autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@vendpark.io" />
        </Field>
        <Field label="Password">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-xs font-semibold text-alert-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-vend-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Log in
        </button>
      </form>
    </AuthShell>
  );
}

export function SetPasswordScreen({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const res = await onSubmit(password);
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <AuthShell title="Set your password" subtitle="Finish setting up your account before continuing.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="New password">
          <TextInput autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="text-xs font-semibold text-alert-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-vend-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Save password
        </button>
      </form>
    </AuthShell>
  );
}

export function PendingScreen({ email, onLogout }) {
  return (
    <AuthShell title="Waiting for approval" subtitle={email}>
      <p className="text-sm text-slate-500">
        Your account was created but doesn't have access yet — an admin needs to approve you from{" "}
        <span className="font-semibold text-vend-black">Manage users</span> before you can see anything. If you're
        supposed to be the first admin, they'll give you a one-time SQL command to run in Supabase to promote
        yourself.
      </p>
      <button
        type="button"
        onClick={onLogout}
        className="mt-5 w-full rounded-full border border-concrete-300 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
      >
        Log out
      </button>
    </AuthShell>
  );
}

export function ManageUsersModal({
  open,
  onClose,
  users,
  currentUser,
  onUpdateRole,
  onRevoke,
  onDelete,
  onCreateLogin,
  onResetPassword,
  onDismissAdminRequest,
}) {
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createResult, setCreateResult] = useState(null); // { email, password } | { error }

  const [pwResetResult, setPwResetResult] = useState(null); // { email, password } | { email, error }
  const [resetOpenId, setResetOpenId] = useState(null);
  const [manualPassword, setManualPassword] = useState("");

  if (!open) return null;

  async function submitCreate(e) {
    e.preventDefault();
    if (!createEmail) return;
    setCreateBusy(true);
    setCreateResult(null);
    const res = await onCreateLogin(createEmail, createName);
    setCreateBusy(false);
    if (res.ok) {
      setCreateResult({ email: createEmail, password: res.password });
      setCreateName("");
      setCreateEmail("");
    } else {
      setCreateResult({ error: res.error });
    }
  }

  function confirmDelete(u) {
    if (window.confirm(`Permanently delete ${u.display_name}'s account? This can't be undone.`)) {
      onDelete(u.id);
    }
  }

  function toggleResetForm(u) {
    setResetOpenId((id) => (id === u.id ? null : u.id));
    setManualPassword("");
  }

  async function submitResetPassword(e, u) {
    e.preventDefault();
    setPwResetResult(null);
    const res = await onResetPassword(u.id, manualPassword || undefined);
    setPwResetResult(res.ok ? { email: u.email, password: res.password } : { email: u.email, error: res.error });
    if (res.ok) {
      setResetOpenId(null);
      setManualPassword("");
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-vend-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-concrete-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-vend-black">Manage users</h2>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-vend-black">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-concrete-200 px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Add a teammate</p>
          <form onSubmit={submitCreate} className="space-y-2">
            <TextInput value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Their name" />
            <TextInput
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="Their work email"
            />
            <button
              type="submit"
              disabled={createBusy || !createEmail}
              className="w-full rounded-full bg-vend-black px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Create login
            </button>
          </form>
          {createResult?.password && (
            <div className="mt-3 rounded-xl border border-go-100 bg-go-100/40 p-3 text-xs">
              <p className="font-semibold text-vend-black">Give them these to log in — they can't be shown again:</p>
              <p className="mt-1">
                Link:{" "}
                <a
                  href="https://vend-installation-schedule.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold underline"
                >
                  vend-installation-schedule.vercel.app
                </a>
              </p>
              <p>
                Email: <span className="font-mono font-semibold">{createResult.email}</span>
              </p>
              <p>
                Password: <span className="font-mono font-semibold">{createResult.password}</span>
              </p>
            </div>
          )}
          {createResult?.error && <p className="mt-2 text-xs font-semibold text-alert-600">{createResult.error}</p>}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-6">
          <p className="mb-1 text-xs text-slate-400">People you've created a login for above show up here — approve them below.</p>
          {pwResetResult?.password && (
            <div className="rounded-xl border border-go-100 bg-go-100/40 p-3 text-xs">
              <p className="font-semibold text-vend-black">
                New password for {pwResetResult.email} — give it to them directly, it can't be shown again:
              </p>
              <p className="mt-1 font-mono font-semibold">{pwResetResult.password}</p>
            </div>
          )}
          {pwResetResult?.error && <p className="text-xs font-semibold text-alert-600">{pwResetResult.error}</p>}
          {users.map((u) => (
            <div key={u.id}>
            <div className="rounded-xl border border-concrete-200 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-vend-black">
                    {u.display_name}
                    {u.id === currentUser?.id ? " (you)" : ""}
                  </p>
                  <p className="truncate text-xs text-slate-400">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {u.admin_requested && u.role !== "pending" && (
                    <span className="rounded-full bg-caution-100 px-2 py-0.5 text-[10px] font-semibold text-caution-700">
                      Requested admin
                    </span>
                  )}
                  {u.role !== "pending" && (
                    <span className="rounded-full bg-concrete-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {u.role === "admin" ? "Admin" : "Viewer"}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-concrete-100 pt-2">
                {u.role === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateRole(u.id, "viewer")}
                      className="rounded-full border border-concrete-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-vend-black hover:text-vend-black"
                    >
                      Approve as viewer
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRole(u.id, "admin")}
                      className="rounded-full bg-vend-black px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Approve as admin
                    </button>
                  </>
                )}
                {u.role !== "pending" && (
                  <>
                    {u.admin_requested && u.role !== "admin" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateRole(u.id, "admin")}
                          className="rounded-full bg-vend-black px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Approve as admin
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismissAdminRequest(u.id)}
                          className="text-xs font-semibold text-slate-500 hover:text-vend-black"
                        >
                          Dismiss request
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onUpdateRole(u.id, u.role === "admin" ? "viewer" : "admin")}
                      className="text-xs font-semibold text-slate-500 hover:text-vend-black"
                    >
                      Make {u.role === "admin" ? "viewer" : "admin"}
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => onRevoke(u.id)}
                        className="text-xs font-semibold text-alert-600 hover:text-alert-700"
                      >
                        Revoke
                      </button>
                    )}
                  </>
                )}
                {u.id !== currentUser?.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleResetForm(u)}
                      className="text-xs font-semibold text-slate-500 hover:text-vend-black"
                      title="Set or generate a new password to hand them directly"
                    >
                      New password
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(u)}
                      className="text-xs font-semibold text-alert-600 hover:text-alert-700"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            {resetOpenId === u.id && (
              <form
                onSubmit={(e) => submitResetPassword(e, u)}
                className="mt-1.5 flex items-center gap-2 rounded-xl border border-concrete-200 bg-concrete-100/40 px-3 py-2"
              >
                <TextInput
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="Type a password, or leave blank to generate one"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-vend-black px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Set
                </button>
              </form>
            )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
