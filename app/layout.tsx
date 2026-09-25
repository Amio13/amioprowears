import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Oswald, Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? "Amioprowears";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${storeName} — Custom football jerseys in Nigeria`, template: `%s | ${storeName}` },
  description:
    "Club and national team jerseys with your name, number and badges. Delivered to your nearest motor park anywhere in Nigeria.",
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NG"
      className={`${roboto.variable} ${bebas.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
