"use client";
import { useEffect } from "react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
export default function SignInPage() {
  const { setAuthOpen, t } = useApp();
  useEffect(() => setAuthOpen(true), [setAuthOpen]);
  return (
    <div className="page">
      <div className="card empty-state">
        <h1>{t("pages.auth.signInTitle")}</h1>
        <p>{t("pages.auth.signInText")}</p>
        <Button onClick={() => setAuthOpen(true)}>
          {t("pages.auth.openSignIn")}
        </Button>
      </div>
    </div>
  );
}
