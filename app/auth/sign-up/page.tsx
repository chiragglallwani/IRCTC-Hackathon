"use client";
import { useEffect } from "react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
export default function SignUpPage() {
  const { setAuthOpen, t } = useApp();
  useEffect(() => setAuthOpen(true), [setAuthOpen]);
  return (
    <div className="page">
      <div className="card empty-state">
        <h1>{t("pages.auth.signUpTitle")}</h1>
        <p>{t("pages.auth.signUpText")}</p>
        <Button onClick={() => setAuthOpen(true)}>
          {t("pages.auth.openSignUp")}
        </Button>
      </div>
    </div>
  );
}
