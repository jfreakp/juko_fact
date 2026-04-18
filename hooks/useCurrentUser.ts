"use client";

import { useState, useEffect } from "react";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPLOYED";
  companyId: string | null;
  branchId: string | null;
  company: { id: string; ruc: string; razonSocial: string; ambiente: string } | null;
  branch: { id: string; nombre: string } | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUser(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
