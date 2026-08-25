"use client";
import Image from "next/image";
import { SearchCard } from "@/components/search-card";
import { useApp } from "@/components/providers";
import { HomeStats } from "@/components/home-stats";

export default function HomePage() {
  const { t } = useApp();
  return (
    <>
      <section className="relative isolate min-h-[760px] overflow-hidden px-4 pb-16 pt-14 lg:min-h-[670px] lg:px-[max(24px,calc((100vw_-_1280px)/2))] lg:pb-20 lg:pt-20">
        <Image
          src="/images/vande-bharat-saffron-hero-v2.webp"
          fill
          sizes="100vw"
          className="-z-20 object-cover object-center"
          alt={t("pages.home.hero.imageAlt")}
          priority
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,20,31,0.78)_0%,rgba(8,20,31,0.5)_48%,rgba(8,20,31,0.2)_100%)]" />
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9 max-w-3xl text-white drop-shadow-sm">
            <h1 className="text-white">{t("pages.home.hero.title")}</h1>
            <p className="lede !text-white/90">
              {t("pages.home.hero.subtitle")}
            </p>
          </div>
          <SearchCard />
        </div>
      </section>
      <HomeStats />
    </>
  );
}
