import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

const stores = new Map();
const publicStateKeys = new Set([
  "uk_destinations_delta",
  "uk_packages_delta",
  "uk_blogs",
  "uk_itinerary_templates",
  "uk_site_settings",
  "uk_gallery_submissions",
]);
const backendStatusListeners = new Set();
const backendErrors = new Map();
let backendError = null;

export function reportBackendError(error, key = "global") {
  if (error) backendErrors.set(key, error.message || String(error));
  else if (key === "global") backendErrors.clear();
  else backendErrors.delete(key);
  backendError = [...backendErrors.values()].join("; ");
  backendStatusListeners.forEach((listener) => listener(backendError));
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    reportBackendError(new Error(`Could not save ${key} in this browser: ${error.message}`), key);
  }
}

async function loadRemoteStore(key) {
  if (!supabase) return null;

  const { data, error } = await supabase.from("app_state").select("value").eq("key", key).maybeSingle();
  if (!error && data) return { value: data.value };
  if (!error) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (sessionData.session) {
      const { data: isAdmin, error: permissionError } = await supabase.rpc("is_admin");
      if (permissionError) throw permissionError;
      if (isAdmin) return { seedFromBrowser: true };
    }
  }
  if (error && !publicStateKeys.has(key)) {
    throw error;
  }
  if (publicStateKeys.has(key)) {
    const { data: publicData, error: publicError } = await supabase.rpc("read_public_state", { p_key: key });
    if (publicError) throw publicError;
    return { value: publicData };
  }
  return null;
}

export async function refreshRemoteStores() {
  if (!supabase) return;
  await Promise.all([...stores.values()].map((store) => store.refresh()));
}

export async function submitPublicRecord(key, payload) {
  if (!supabase) throw new Error("Supabase is not configured. Visitor submissions cannot be saved yet.");
  const { data, error } = await supabase.rpc("submit_public_record", { p_key: key, p_payload: payload });
  if (error) throw error;
  reportBackendError(null, key);
  return data;
}

export function useBackendStatus() {
  const [error, setError] = useState(backendError);
  useEffect(() => {
    backendStatusListeners.add(setError);
    return () => backendStatusListeners.delete(setError);
  }, []);
  return { configured: isSupabaseConfigured, error };
}

export function createStore(key, initialValue, { persist = true, persistLocal = true } = {}) {
  const listeners = new Set();

  function read() {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  }

  let state = read();
  let writeQueue = Promise.resolve();

  function applyState(next, { persistRemote = true } = {}) {
    state = typeof next === "function" ? next(state) : next;
    if (persistLocal) saveLocal(key, state);
    listeners.forEach((listener) => listener(state));

    if (persist && persistRemote && supabase) {
      const snapshot = state;
      writeQueue = writeQueue
        .then(async () => {
          const { error } = await supabase.from("app_state").upsert({ key, value: snapshot, updated_at: new Date().toISOString() });
          if (error) throw error;
          reportBackendError(null, key);
        })
        .catch((error) => reportBackendError(error, key));
    }
    return state;
  }

  function setState(next, options) {
    return applyState(next, options);
  }

  async function refresh() {
    try {
      const remote = await loadRemoteStore(key);
      if (remote?.seedFromBrowser) {
        const { error } = await supabase.from("app_state").upsert({ key, value: state, updated_at: new Date().toISOString() });
        if (error) throw error;
      } else if (remote?.value !== null && remote?.value !== undefined) {
        applyState(remote.value, { persistRemote: false });
      }
      reportBackendError(null, key);
    } catch (error) {
      reportBackendError(error, key);
    }
  }

  function connectRealtime() {
    if (!persist || !supabase) return;
    supabase
      .channel(`app-state:${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state", filter: `key=eq.${key}` }, (payload) => {
        const remote = payload.new?.value;
        if (remote !== undefined) applyState(remote, { persistRemote: false });
        else void refresh();
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reportBackendError(new Error(`Live updates could not connect for ${key}.`), key);
        }
      });
    if (publicStateKeys.has(key)) {
      supabase
        .channel(`public-app-state:${key}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "public_app_state", filter: `key=eq.${key}` }, (payload) => {
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) return;
            const remote = payload.new?.value;
            if (remote !== undefined) applyState(remote, { persistRemote: false });
            else void refresh();
          })
        })
        .subscribe();
    }
    if (publicStateKeys.has(key) && typeof window !== "undefined") {
      window.addEventListener("focus", refresh);
    }
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  const store = { getState, setState, subscribe, refresh };
  if (persist) stores.set(key, store);
  if (persist && supabase) {
    connectRealtime();
    void refresh();
  }
  return store;
}
