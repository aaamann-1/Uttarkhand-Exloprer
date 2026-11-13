import { createStore, refreshRemoteStores } from "./createStore";
import { isSupabaseConfigured, supabase } from "./supabase";
import { useEffect, useState } from "react";

const authStore = createStore("uk_admin_auth", { session: null, user: null, ready: !isSupabaseConfigured }, {
  persist: false,
  persistLocal: false,
});

function setAuth(session) {
  authStore.setState({
    session,
    user: session?.user || null,
    ready: true,
  });
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    setAuth(session);
    if (session) void refreshRemoteStores();
  });
  supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) throw error;
    if (!data.session) {
      setAuth(null);
      return;
    }
    const { data: isAdmin, error: permissionError } = await supabase.rpc("is_admin");
    if (permissionError) throw permissionError;
    if (!isAdmin) {
      await supabase.auth.signOut();
      setAuth(null);
      return;
    }
    setAuth(data.session);
    await refreshRemoteStores();
  }).catch((error) => {
    authStore.setState({ session: null, user: null, ready: true, error: error.message });
  });
}

export async function login(email, password) {
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured. Add the project URL and anon key to .env.local." };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: error.message };

  const { data: isAdmin, error: permissionError } = await supabase.rpc("is_admin");
  if (permissionError || !isAdmin) {
    await supabase.auth.signOut();
    return { ok: false, error: permissionError?.message || "This account has not been granted admin access." };
  }
  setAuth(data.session);
  return { ok: true };
}

export async function logout() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  setAuth(null);
}

export function isLoggedIn() {
  return Boolean(authStore.getState().session);
}

export function useAdminSession() {
  const auth = useAuthState();
  return {
    loggedIn: Boolean(auth.session),
    loading: !auth.ready,
    login,
    logout,
  };
}

function useAuthState() {
  const [auth, setAuthState] = useState(authStore.getState());
  useEffect(() => authStore.subscribe(setAuthState), []);
  return auth;
}

function toProfile(user) {
  return {
    name: user?.user_metadata?.name || user?.email?.split("@")[0] || "Admin",
    email: user?.email || "",
    avatarDataUrl: user?.user_metadata?.avatar_url || null,
  };
}

export function useAdminProfile() {
  const { user } = useAuthState();
  const updateProfile = async ({ name, email, avatarDataUrl }) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { name, avatar_url: avatarDataUrl },
    });
    if (metadataError) throw metadataError;
    const currentEmail = authStore.getState().user?.email;
    if (email && email !== currentEmail) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    }
  };
  return { profile: toProfile(user), updateProfile };
}

export async function changePassword(currentPassword, newPassword) {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const email = authStore.getState().user?.email;
  if (!email) return { ok: false, error: "You are not signed in." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) return { ok: false, error: "Current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
