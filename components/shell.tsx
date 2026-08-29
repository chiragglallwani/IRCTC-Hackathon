"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Accessibility,
  Bot,
  Minus,
  Plus,
  UserCircle,
  X,
  HomeIcon,
  Search,
  PlaneIcon,
  PlaneTakeoff,
  BriefcaseBusiness,
  LucideProps,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import {
  FONT_SIZE_STEP,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  useApp,
} from "./providers";
import { AuthModal } from "./auth-modal";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languageOptions } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const IconMap: Record<string, React.ComponentType<LucideProps>> = {
  home: HomeIcon,
  search: Search,
  tourism: PlaneIcon,
  trips: PlaneTakeoff,
  packages: BriefcaseBusiness,
};

const links = [
  {
    route: "/",
    key: "home",
    value: "navigation.primary.home",
  },
  {
    route: "/search",
    key: "search",
    value: "navigation.primary.explore",
  },
  {
    route: "/tourism",
    key: "tourism",
    value: "navigation.primary.tourism",
  },
  {
    route: "/tourism/bookings",
    key: "packages",
    value: "navigation.primary.packages",
  },
  {
    route: "/my-trips",
    key: "trips",
    value: "navigation.primary.trips",
  },
];

function navIcons({ key }: { key: string }) {
  const IconComponent = IconMap[key];

  return <IconComponent size={20} />;
}

function navLinkIsActive(pathname: string, route: string) {
  if (route === "/") return pathname === route;
  if (route === "/tourism/bookings") return pathname.startsWith(route);
  if (route === "/tourism")
    return (
      pathname.startsWith(route) && !pathname.startsWith("/tourism/bookings")
    );
  return pathname === route || pathname.startsWith(`${route}/`);
}

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

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center gap-2 border-b border-[var(--line)] bg-white px-3 sm:h-[72px] sm:gap-4 sm:px-[18px] lg:h-[88px] lg:gap-[42px] lg:px-[max(24px,calc((100vw_-_1280px)/2))] [&>button_span]:hidden">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/images/logo.png"
            alt={t("common.brand")}
            width={150}
            height={70}
            priority
            className="h-[50px] w-[88px] object-contain sm:h-[58px] sm:w-[122px] lg:h-[72px] lg:w-[150px]"
          />
        </Link>
        <nav
          className="mx-auto hidden h-full items-stretch gap-[34px] lg:flex"
          aria-label={t("navigation.primary.label")}
        >
          {links.map((item) => (
            <Link
              key={item.key}
              href={item.route}
              className={`flex items-center whitespace-nowrap border-b-[3px] font-semibold text-[#454957] hover:border-[var(--primary)] hover:text-[var(--primary-dark)] ${
                navLinkIsActive(pathname, item.route)
                  ? "border-[var(--primary)] text-[var(--primary-dark)]"
                  : "border-transparent"
              }`}
            >
              <div className="flex gap-x-2 items-center">
                {navIcons({
                  key: item.key,
                })}
                {t(item.value)}
              </div>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-3 lg:ms-0 [&>button]:min-h-11 [&>button]:min-w-11 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[7px] [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[#454957] [&_button_span]:hidden [&_svg]:w-[21px] lg:[&_button_span]:inline">
          <Popover>
            <PopoverTrigger asChild>
              <button>
                <Accessibility />
                <span>{t("components.accessibility.title")}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[230px] px-6 py-4"
              align="end"
              aria-label={t("components.accessibility.settings")}
            >
              <div className="flex items-center justify-between">
                <h3>{t("components.accessibility.title")}</h3>
                <PopoverClose className="grid place-items-center">
                  <X />
                  <span className="sr-only">{t("common.actions.close")}</span>
                </PopoverClose>
              </div>
              <div className="mt-4 flex flex-col gap-y-3">
                <div className="flex flex-col gap-y-2">
                  <p>{t("components.accessibility.textSize")}</p>
                  <div
                    className="flex items-center justify-evenly gap-2"
                    aria-label={t("components.accessibility.textSize")}
                  >
                    <button
                      className="grid h-7 w-7 place-items-center rounded-full border border-[var(--primary)] bg-transparent text-[var(--primary)] hover:bg-[#eef1f5] disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[#f1f3f6] disabled:text-[#999eaa] disabled:opacity-70"
                      onClick={() => setFontSize(fontSize - FONT_SIZE_STEP)}
                      disabled={fontSize <= MIN_FONT_SIZE}
                      aria-label={t("components.accessibility.decreaseText")}
                    >
                      <Minus />
                    </button>
                    <output
                      className="min-w-[76px] text-center font-bold text-[var(--primary-dark)]"
                      aria-live="polite"
                    >
                      {t("components.accessibility.currentSize", {
                        size: fontSize,
                      })}
                    </output>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-full border border-[var(--primary)] bg-transparent text-[var(--primary)] hover:bg-[#eef1f5] disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[#f1f3f6] disabled:text-[#999eaa] disabled:opacity-70"
                      onClick={() => setFontSize(fontSize + FONT_SIZE_STEP)}
                      disabled={fontSize >= MAX_FONT_SIZE}
                      aria-label={t("components.accessibility.increaseText")}
                    >
                      <Plus />
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-x-2">
                  <Checkbox
                    checked={highContrast}
                    onCheckedChange={(checked) =>
                      setHighContrast(checked === true)
                    }
                  />
                  {t("components.accessibility.highContrast")}
                </label>
              </div>
            </PopoverContent>
          </Popover>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger
              className="min-h-10 w-[82px] flex-shrink-0 rounded-lg border-[var(--line)] px-2 text-start sm:w-[100px] [&>span]:!inline-block [&>span]:!truncate"
              aria-label={t("navigation.language")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {languageOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="md"
                  aria-label={t("navigation.profileMenu")}
                  title={t("navigation.profileMenu")}
                >
                  <UserCircle />
                  <span>{user.name}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="end">
                <div className="border-b border-[var(--line)] px-4 py-3">
                  <p className="text-xs text-[var(--muted)]">
                    {t("navigation.signedInAs")}
                  </p>
                  <p className="mt-1 truncate font-bold text-[var(--ink)]">
                    {user.name}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {user.email}
                  </p>
                </div>
                <div className="p-2">
                  <PopoverClose asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-[#ba1a1a] hover:bg-[#fff0ee] hover:text-[#93000a]"
                      onClick={signOut}
                    >
                      <LogOut />
                      {t("navigation.logout")}
                    </Button>
                  </PopoverClose>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              className="whitespace-nowrap"
              onClick={() => setAuthOpen(true)}
            >
              <UserCircle />
              <span>{t("navigation.signIn")}</span>
            </button>
          )}
        </div>
      </header>
      <AuthModal />
    </>
  );
}

export function AIAssistant() {
  const { t } = useApp();
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="fixed bottom-[calc(88px_+_env(safe-area-inset-bottom))] end-3 z-[60] grid h-14 w-14 place-items-center rounded-full border-[3px] border-white bg-[var(--primary)] text-white shadow-[0_8px_28px_#0003] sm:end-4 sm:h-[62px] sm:w-[62px] lg:bottom-7 lg:end-7 lg:h-[66px] lg:w-[66px] lg:border-4"
          aria-label={t("components.assistant.open")}
        >
          <Bot />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(380px,calc(100vw_-_32px))] p-5"
        side="top"
        align="end"
        sideOffset={10}
        aria-label={t("components.assistant.label")}
      >
        <div className="flex items-center justify-between font-extrabold text-[var(--primary-dark)]">
          <span className="flex gap-2">
            <Bot /> {t("components.assistant.title")}
          </span>
          <PopoverClose className="border-0 bg-transparent">
            <X />
            <span className="sr-only">{t("common.actions.close")}</span>
          </PopoverClose>
        </div>
        <p>{t(replyKey)}</p>
        <div className="grid gap-[7px]">
          {[
            t("components.assistant.promptRac"),
            t("components.assistant.promptQuota"),
            t("components.assistant.promptTicket"),
          ].map((x) => (
            <button
              className="rounded-[7px] border border-[var(--line)] bg-white p-2 text-start"
              key={x}
              onClick={() => ask(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="mt-[14px] flex">
          <input
            className="min-h-11 rounded-e-none rounded-s-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder={t("components.assistant.placeholder")}
          />
          <button
            className="rounded-e-lg rounded-s-none border-0 bg-[var(--primary)] px-[14px] text-white"
            onClick={() => ask()}
          >
            {t("common.actions.send")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
export function Footer() {
  const { t } = useApp();
  return (
    <footer className="mb-[calc(76px_+_env(safe-area-inset-bottom))] grid items-center gap-[30px] border-t border-[var(--line)] px-6 py-8 text-[var(--muted)] lg:mb-0 lg:flex lg:px-[max(24px,calc((100vw_-_1280px)/2))]">
      <strong className="text-xl text-[var(--ink)]">{t("common.brand")}</strong>
      <span>{t("components.footer.description")}</span>
      <div className="flex gap-6 lg:ml-auto">
        <Link href="/">{t("common.actions.help")}</Link>
        <Link href="/tourism">{t("navigation.primary.tourism")}</Link>
        <Link href="/tourism/bookings">{t("navigation.primary.packages")}</Link>
        <Link href="/my-trips">{t("navigation.primary.trips")}</Link>
      </div>
    </footer>
  );
}
export function MobileNav() {
  const { t } = useApp();
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label={t("navigation.mobile.label")}>
      <div className="mobile-nav-list">
        {links.map((item) => {
          const active = navLinkIsActive(pathname, item.route);
          return (
            <Link
              key={item.key}
              href={item.route}
              className={`mobile-nav-link ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="mobile-nav-icon">
                {navIcons({ key: item.key })}
              </span>
              <span className="mobile-nav-label">{t(item.value)}</span>
            </Link>
          );
        })}
      </div>
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
