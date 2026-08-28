"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "./providers";
import { Button } from "@/components/ui/button";

export function AuthModal() {
  const { authOpen, setAuthOpen, signIn, signUp, t, user } = useApp();
  const pathname = usePathname();
  const authenticationRequired =
    pathname === "/checkout" || pathname.startsWith("/checkout/");
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordRules = [
    {
      key: "length",
      valid: password.length >= 6 && password.length <= 12,
    },
    { key: "uppercase", valid: /[A-Z]/.test(password) },
    { key: "lowercase", valid: /[a-z]/.test(password) },
    { key: "number", valid: /\d/.test(password) },
    { key: "special", valid: /[^A-Za-z0-9\s]/.test(password) },
  ];
  const passwordValid = passwordRules.every((rule) => rule.valid);

  useEffect(() => {
    if (!authOpen) return;
    setTab(pathname.endsWith("/sign-up") ? "signup" : "signin");
    setError("");
    setPassword("");
    setPasswordVisible(false);
  }, [authOpen, pathname]);

  useEffect(() => {
    if (authenticationRequired && !user) setAuthOpen(true);
  }, [authenticationRequired, setAuthOpen, user]);

  const changeOpen = (open: boolean) => {
    if (!open && authenticationRequired && !user) return;
    setAuthOpen(open);
  };

  const changeTab = (value: string) => {
    setTab(value as "signin" | "signup");
    setError("");
    setPassword("");
    setPasswordVisible(false);
  };

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError(t("components.auth.invalidEmail"));
    if (tab === "signup" && name.trim().length < 2)
      return setError(t("components.auth.invalidName"));
    if (!password) return setError(t("components.auth.passwordRequired"));
    if (tab === "signup" && !passwordValid)
      return setError(t("components.auth.passwordRequirementsError"));

    setSubmitting(true);
    setError("");
    const result =
      tab === "signup"
        ? await signUp(email, name, password)
        : await signIn(email, password);
    setSubmitting(false);
    if (result === "account_not_found")
      setError(t("components.auth.accountNotFound"));
    else if (result === "invalid_credentials")
      setError(t("components.auth.invalidCredentials"));
    else if (result === "email_exists")
      setError(t("components.auth.emailExists"));
  };
  return (
    <Dialog open={authOpen} onOpenChange={changeOpen}>
      <DialogContent
        closeLabel={t("common.actions.close")}
        aria-describedby="auth-description"
        className="[&_p]:m-0"
        showClose={!authenticationRequired || Boolean(user)}
        onEscapeKeyDown={(event) => {
          if (authenticationRequired && !user) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (authenticationRequired && !user) event.preventDefault();
        }}
      >
        <div className="flex gap-2 font-bold text-[var(--primary-dark)] [&_svg]:w-5">
          <ShieldCheck /> {t("components.auth.secure")}
        </div>
        <DialogTitle>
          {tab === "signin"
            ? t("components.auth.welcome")
            : t("components.auth.createTitle")}
        </DialogTitle>
        <DialogDescription id="auth-description">
          {t("components.auth.description")}
        </DialogDescription>
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className="flex w-full rounded-[9px] bg-[#f0f2f5] p-1">
            <TabsTrigger
              className="min-h-10 flex-1 rounded-[7px] border-0 bg-transparent px-3 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:text-[var(--primary-dark)] data-[state=active]:shadow-[0_1px_4px_#0001]"
              value="signin"
            >
              {t("components.auth.signInTab")}
            </TabsTrigger>
            <TabsTrigger
              className="min-h-10 flex-1 rounded-[7px] border-0 bg-transparent px-3 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:text-[var(--primary-dark)] data-[state=active]:shadow-[0_1px_4px_#0001]"
              value="signup"
            >
              {t("components.auth.signUpTab")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
        <label>
          {t("components.auth.password")}
          <span className="relative block">
            <input
              className="pe-12"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              type={passwordVisible ? "text" : "password"}
              autoComplete={
                tab === "signup" ? "new-password" : "current-password"
              }
              minLength={6}
              maxLength={12}
              placeholder={t("components.auth.passwordPlaceholder")}
            />
            <button
              type="button"
              className="absolute end-1 top-1 grid size-11 place-items-center rounded-lg border-0 bg-transparent text-slate-500 hover:bg-slate-100"
              aria-label={t(
                passwordVisible
                  ? "components.auth.hidePassword"
                  : "components.auth.showPassword",
              )}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? <EyeOff /> : <Eye />}
            </button>
          </span>
        </label>
        {tab === "signup" && (
          <div
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            aria-live="polite"
          >
            <strong className="text-sm text-slate-700">
              {t("components.auth.passwordMustContain")}
            </strong>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {passwordRules.map((rule) => (
                <span
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    rule.valid ? "text-emerald-700" : "text-slate-400"
                  }`}
                  key={rule.key}
                >
                  {rule.valid ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Circle className="size-4" />
                  )}
                  {t(`components.auth.passwordRules.${rule.key}`)}
                </span>
              ))}
            </div>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={submitting} onClick={submit}>
          {submitting && <LoaderCircle className="animate-spin" />}
          {tab === "signin"
            ? t("components.auth.signInTab")
            : t("components.auth.createProfile")}
          {!submitting && <ArrowRight />}
        </Button>
        <p className="microcopy">{t("components.auth.prototype")}</p>
      </DialogContent>
    </Dialog>
  );
}
