"use client";
import { useEffect } from "react";
import { useApp } from "@/components/providers";
export default function SignInPage() {
  const { setAuthOpen, t } = useApp();
  useEffect(() => setAuthOpen(true), [setAuthOpen]);
  return (
    <div className="page">
      <div className="card empty-state">
        <h1>{t("pages.auth.signInTitle")}</h1>
        <p>{t("pages.auth.signInText")}</p>
        <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>
          {t("pages.auth.openSignIn")}
        </button>
      </div>
    </div>
  );
}
