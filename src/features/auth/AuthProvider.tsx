import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";

export type AuthResult = { ok: true } | { ok: false; message: string };

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: { email: string; password: string; fullName: string }) => Promise<AuthResult>;
  signInWithMagicLink: (email: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  updateProfile: (patch: { full_name?: string | null }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageOf(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile(data ?? null);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: error.message } : { ok: true };
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async ({ email, password, fullName }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }, []);

  const signInWithMagicLink = useCallback<AuthContextValue["signInWithMagicLink"]>(async email => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }, []);

  const sendPasswordReset = useCallback<AuthContextValue["sendPasswordReset"]>(async email => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }, []);

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(async password => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { ok: false, message: error.message } : { ok: true };
  }, []);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(async patch => {
    if (!userId) return { ok: false, message: "Not signed in." };
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) return { ok: false, message: error.message };
    setProfile(data);
    return { ok: true };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user: session?.user ?? null,
      session,
      profile,
      signIn,
      signUp,
      signInWithMagicLink,
      sendPasswordReset,
      updatePassword,
      updateProfile,
      signOut,
    }),
    [loading, session, profile, signIn, signUp, signInWithMagicLink, sendPasswordReset, updatePassword, updateProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

export { messageOf };
