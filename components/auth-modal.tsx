"use client";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
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
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent
        closeLabel={t("common.actions.close")}
        aria-describedby="auth-description"
        className="[&_p]:m-0"
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
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "signin" | "signup")}
        >
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
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button className="w-full" onClick={submit}>
          {tab === "signin"
            ? t("components.auth.signInTab")
            : t("components.auth.createProfile")}
          <ArrowRight />
        </Button>
        <p className="microcopy">{t("components.auth.prototype")}</p>
      </DialogContent>
    </Dialog>
  );
}
