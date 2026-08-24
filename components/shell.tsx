"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accessibility,
  Bot,
  BriefcaseBusiness,
  Compass,
  Home,
  Menu,
  TrainFront,
  UserCircle,
  X,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "./providers";
import { AuthModal } from "./auth-modal";

export function Header() {
  const pathname = usePathname();
  const {
    t,
    language,
    setLanguage,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    user,
    signOut,
    setAuthOpen,
  } = useApp();
  const [accessOpen, setAccessOpen] = useState(false);
  const links = [
    ["/", t("navigation.primary.home")],
    ["/", t("navigation.primary.book")],
    ["/search", t("navigation.primary.explore")],
    ["/tourism", t("navigation.primary.tourism")],
    ["/my-trips", t("navigation.primary.trips")],
  ];
  return (
    <>
      <header className="site-header">
        <Link href="/" className="logo">
          <TrainFront />
          <span>{t("common.brand")}</span>
        </Link>
        <nav aria-label={t("navigation.primary.label")}>
          {links.map(([href, label], i) => (
            <Link
              key={`${href}-${i}`}
              href={href}
              className={
                pathname === href && (href !== "/" || i === 0) ? "active" : ""
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button onClick={() => setAccessOpen(!accessOpen)}>
            <Accessibility />
            <span>{t("components.accessibility.title")}</span>
          </button>
          <select
            aria-label={t("navigation.language")}
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
          >
            <option value="en">EN</option>
            <option value="hi">हिं</option>
          </select>
          {user ? (
            <button onClick={signOut} title={t("navigation.signOut")}>
              <UserCircle />
              <span>{user.name}</span>
            </button>
          ) : (
            <button onClick={() => setAuthOpen(true)}>
              <UserCircle />
              <span>{t("navigation.signIn")}</span>
            </button>
          )}
        </div>
        {accessOpen && (
          <div
            className="access-panel"
            role="dialog"
            aria-label={t("components.accessibility.settings")}
          >
            <button
              className="icon-btn close"
              onClick={() => setAccessOpen(false)}
            >
              <X />
            </button>
            <h3>{t("components.accessibility.title")}</h3>
            <p>{t("components.accessibility.textSize")}</p>
            <div className="segmented">
              <button
                onClick={() => setFontSize("normal")}
                className={fontSize === "normal" ? "active" : ""}
              >
                A
              </button>
              <button
                onClick={() => setFontSize("large")}
                className={fontSize === "large" ? "active" : ""}
              >
                A+
              </button>
              <button
                onClick={() => setFontSize("xl")}
                className={fontSize === "xl" ? "active" : ""}
              >
                A++
              </button>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
              />{" "}
              {t("components.accessibility.highContrast")}
            </label>
          </div>
        )}
      </header>
      <AuthModal />
    </>
  );
}

export function AIAssistant() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replyKey, setReplyKey] = useState("components.assistant.welcome");
  const ask = (value = query) => {
    const normalized = value.toLowerCase();
    const answer = normalized.includes("rac")
      ? "rac"
      : normalized.includes("quota") || normalized.includes("कोटा")
        ? "quota"
        : normalized.includes("cancel") || normalized.includes("रद्द")
          ? "cancellation"
          : normalized.includes("ticket") || normalized.includes("टिकट")
            ? "ticket"
            : normalized.includes("cheap") || normalized.includes("सस्त")
              ? "cheaper"
              : null;
    setReplyKey(
      answer
        ? `components.assistant.answers.${answer}`
        : "components.assistant.fallback",
    );
    setQuery("");
  };
  return (
    <>
      <button
        className="assistant-fab"
        onClick={() => setOpen(!open)}
        aria-label={t("components.assistant.open")}
      >
        <Bot />
      </button>
      {open && (
        <aside
          className="assistant-panel"
          role="dialog"
          aria-label={t("components.assistant.label")}
        >
          <div className="assistant-title">
            <span>
              <Bot /> {t("components.assistant.title")}
            </span>
            <button onClick={() => setOpen(false)}>
              <X />
            </button>
          </div>
          <p>{t(replyKey)}</p>
          <div className="quick-prompts">
            {[
              t("components.assistant.promptRac"),
              t("components.assistant.promptQuota"),
              t("components.assistant.promptTicket"),
            ].map((x) => (
              <button key={x} onClick={() => ask(x)}>
                {x}
              </button>
            ))}
          </div>
          <div className="assistant-input">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder={t("components.assistant.placeholder")}
            />
            <button onClick={() => ask()}>{t("common.actions.send")}</button>
          </div>
        </aside>
      )}
    </>
  );
}
export function Footer() {
  const { t } = useApp();
  return (
    <footer>
      <strong>{t("common.brand")}</strong>
      <span>{t("components.footer.description")}</span>
      <div>
        <Link href="/">{t("common.actions.help")}</Link>
        <Link href="/tourism">{t("navigation.primary.tourism")}</Link>
        <Link href="/my-trips">{t("navigation.primary.trips")}</Link>
      </div>
    </footer>
  );
}
export function MobileNav() {
  const { t } = useApp();
  return (
    <nav className="mobile-nav" aria-label={t("navigation.mobile.label")}>
      <Link href="/">
        <Home />
        <span>{t("navigation.mobile.home")}</span>
      </Link>
      <Link href="/">
        <TrainFront />
        <span>{t("navigation.mobile.book")}</span>
      </Link>
      <Link href="/search">
        <Compass />
        <span>{t("navigation.mobile.explore")}</span>
      </Link>
      <Link href="/my-trips">
        <BriefcaseBusiness />
        <span>{t("navigation.mobile.trips")}</span>
      </Link>
      <Link href="/">
        <Menu />
        <span>{t("navigation.mobile.more")}</span>
      </Link>
    </nav>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <AIAssistant />
      <MobileNav />
    </>
  );
}
