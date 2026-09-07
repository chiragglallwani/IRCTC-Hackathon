import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell";
import { AssistantProvider } from "@/components/assistant/assistant-context";

export const metadata: Metadata = {
  title: "RailEase — Journey planning made clear",
  description:
    "Citizen-first multimodal railway and tourism planning prototype",
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AssistantProvider>
            <AppShell>{children}</AppShell>
          </AssistantProvider>
        </Providers>
      </body>
    </html>
  );
}
