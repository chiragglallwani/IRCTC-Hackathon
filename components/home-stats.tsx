"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, MapPinned, Zap } from "lucide-react";

import { useApp } from "@/components/providers";

const stats = [
  { key: "coverage", icon: MapPinned },
  { key: "electrification", icon: Zap },
  { key: "languages", icon: Languages },
] as const;

function AnimatedNumber({
  value,
  decimals,
  active,
  delay,
}: {
  value: number;
  decimals: number;
  active: boolean;
  delay: number;
}) {
  const { locale } = useApp();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    const duration = 1500;
    const start = performance.now() + delay;
    let frame: number;

    const animate = (now: number) => {
      if (now < start) {
        frame = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, delay, value]);

  return displayValue.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function HomeStats() {
  const { t } = useApp();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="px-4 py-16 lg:px-[max(24px,calc((100vw_-_1280px)/2))] lg:py-24"
      aria-labelledby="home-stats-title"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="eyebrow">{t("pages.home.stats.eyebrow")}</span>
          <h2 id="home-stats-title" className="mt-2">
            {t("pages.home.stats.title")}
          </h2>
          <p className="lede">{t("pages.home.stats.subtitle")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {stats.map(({ key, icon: Icon }, index) => {
            const value = Number(t(`pages.home.stats.${key}.value`));
            const decimals = Number(t(`pages.home.stats.${key}.decimals`));
            const suffix = t(`pages.home.stats.${key}.suffix`);

            return (
              <article
                key={key}
                className={`rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_12px_36px_rgba(25,28,30,0.08)] transition-all duration-700 ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-8 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 140}ms` }}
              >
                <div className="mb-6 grid size-12 place-items-center rounded-xl bg-[#fff1e7] text-[#c84d00]">
                  <Icon aria-hidden="true" />
                </div>
                <p
                  className="mb-2 text-4xl font-extrabold tracking-tight text-[var(--primary-dark)] lg:text-5xl"
                  aria-label={`${value.toLocaleString()}${suffix}`}
                >
                  <span aria-hidden="true">
                    <AnimatedNumber
                      value={value}
                      decimals={decimals}
                      active={isVisible}
                      delay={index * 250}
                    />
                    {suffix}
                  </span>
                </p>
                <h3>{t(`pages.home.stats.${key}.title`)}</h3>
                <p className="muted mt-2">
                  {t(`pages.home.stats.${key}.description`)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
