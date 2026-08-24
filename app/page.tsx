"use client";
import Image from "next/image";
import { Eye, Languages, ShieldCheck } from "lucide-react";
import { SearchCard } from "@/components/search-card";
import { useApp } from "@/components/providers";

export default function HomePage() {
  const { t } = useApp();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>{t("pages.home.hero.title")}</h1>
          <p className="lede">{t("pages.home.hero.subtitle")}</p>
        </div>
        <SearchCard />
        <div className="rail-visual">
          <Image
            src="/images/vande-bharat-hero.webp"
            fill
            sizes="(max-width: 900px) 100vw, 1280px"
            alt={t("pages.home.hero.imageAlt")}
            priority
          />
        </div>
        <div className="feature-grid">
          <div className="feature">
            <Eye />
            <h3>{t("pages.home.features.optionsTitle")}</h3>
            <p className="muted">{t("pages.home.features.optionsText")}</p>
          </div>
          <div className="feature">
            <ShieldCheck />
            <h3>{t("pages.home.features.confidenceTitle")}</h3>
            <p className="muted">{t("pages.home.features.confidenceText")}</p>
          </div>
          <div className="feature">
            <Languages />
            <h3>{t("pages.home.features.languageTitle")}</h3>
            <p className="muted">{t("pages.home.features.languageText")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
