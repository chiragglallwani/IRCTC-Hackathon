"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { useApp } from "./providers";

export function AuthModal() {
  const { authOpen, setAuthOpen, signIn, t } = useApp();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError(t("components.auth.invalidEmail"));
    if (tab === "signup" && name.trim().length < 2)
      return setError(t("components.auth.invalidName"));
    signIn(email, name);
  };
  return (
    <Dialog.Root open={authOpen} onOpenChange={setAuthOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-card"
          aria-describedby="auth-description"
        >
          <button
            className="icon-btn absolute right-4 top-4"
            onClick={() => setAuthOpen(false)}
            aria-label={t("common.actions.close")}
          >
            <X />
          </button>
          <div className="brand-mark">
            <ShieldCheck /> {t("components.auth.secure")}
          </div>
          <Dialog.Title>
            {tab === "signin"
              ? t("components.auth.welcome")
              : t("components.auth.createTitle")}
          </Dialog.Title>
          <Dialog.Description id="auth-description">
            {t("components.auth.description")}
          </Dialog.Description>
          <div className="segmented">
            <button
              className={tab === "signin" ? "active" : ""}
              onClick={() => setTab("signin")}
            >
              {t("components.auth.signInTab")}
            </button>
            <button
              className={tab === "signup" ? "active" : ""}
              onClick={() => setTab("signup")}
            >
              {t("components.auth.signUpTab")}
            </button>
          </div>
          {tab === "signup" && (
            <label>
              {t("common.fields.name")}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("components.auth.namePlaceholder")}
              />
            </label>
          )}
          <label>
            {t("common.fields.email")}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("components.auth.emailPlaceholder")}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full" onClick={submit}>
            {tab === "signin"
              ? t("components.auth.signInTab")
              : t("components.auth.createProfile")}
            <ArrowRight />
          </button>
          <p className="microcopy">{t("components.auth.prototype")}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
