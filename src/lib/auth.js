// Lightweight, client-only login gate — NOT real security. There's no
// backend, so credentials live in this browser's localStorage in plain
// text; anyone who opens devtools can read them or flip their own role.
// What this DOES do: stop casual accidental edits from a "viewer" account,
// since every data-mutating setter in the app is guarded behind isAdmin.
// The user list is included in the Export/Import bundle (see
// exportImport.js) since it's per-browser like everything else here.
import { useEffect, useState } from "react";
import { newId } from "./storage";

export const AUTH_USERS_KEY = "vend.authUsers.v1";
export const AUTH_SESSION_KEY = "vend.authSession.v1";

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function readSessionUserId() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY))?.userId ?? null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [users, setUsers] = useState(readUsers);
  const [sessionUserId, setSessionUserId] = useState(readSessionUserId);

  useEffect(() => writeUsers(users), [users]);
  useEffect(() => {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ userId: sessionUserId }));
  }, [sessionUserId]);

  const currentUser = users.find((u) => u.id === sessionUserId) || null;
  const isAdmin = currentUser?.role === "admin";

  function createFirstAdmin(username, password) {
    const user = { id: newId(), username: username.trim(), password, role: "admin" };
    setUsers([user]);
    setSessionUserId(user.id);
  }

  function login(username, password) {
    const match = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );
    if (!match) return false;
    setSessionUserId(match.id);
    return true;
  }

  function logout() {
    setSessionUserId(null);
  }

  function addUser(username, password, role) {
    const trimmed = username.trim();
    if (!trimmed || !password) return { ok: false, error: "Username and password are required." };
    if (users.some((u) => u.username.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: "That username is already taken." };
    }
    setUsers((cur) => [...cur, { id: newId(), username: trimmed, password, role }]);
    return { ok: true };
  }

  function updateUser(id, patch) {
    setUsers((cur) => cur.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  function removeUser(id) {
    setUsers((cur) => cur.filter((u) => u.id !== id));
    if (sessionUserId === id) setSessionUserId(null);
  }

  return {
    users,
    currentUser,
    isAdmin,
    hasAnyUsers: users.length > 0,
    createFirstAdmin,
    login,
    logout,
    addUser,
    updateUser,
    removeUser,
  };
}
