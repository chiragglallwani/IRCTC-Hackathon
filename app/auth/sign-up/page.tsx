"use client";
import { useEffect } from "react";
import { useApp } from "@/components/providers";
export default function SignUpPage() {
  const { setAuthOpen, t } = useApp();
  useEffect(() => setAuthOpen(true), [setAuthOpen]);
  return (
    <div className="page">
      <div className="card empty-state">
        <h1>{t("pages.auth.signUpTitle")}</h1>
        <p>{t("pages.auth.signUpText")}</p>
        <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>
          {t("pages.auth.openSignUp")}
        </button>
      </div>
    </div>
  );
}
