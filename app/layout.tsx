import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? "Amioprowears";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${storeName} — Custom football jerseys in Nigeria`, template: `%s | ${storeName}` },
  description:
    "Club and national team jerseys with your name, number and badges. Delivered to your nearest motor park anywhere in Nigeria.",
  openGraph: { siteName: storeName, locale: "en_NG", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NG"
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
