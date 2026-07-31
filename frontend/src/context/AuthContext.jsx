import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, tokenStore, setUnauthorizedHandler } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);      // null = unknown/checking or logged out
  const [checking, setChecking] = useState(true);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch (_) {}
    tokenStore.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setChecking(false); return; }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch (_) {
      tokenStore.clear();
      setUser(null);
    } finally { setChecking(false); }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, checking, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
