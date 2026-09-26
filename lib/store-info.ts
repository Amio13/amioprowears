/** Public business details, from NEXT_PUBLIC_* build variables (safe in the browser). */
export const STORE = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Amioprowears",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://amioprowears.com").replace(/\/+$/, ""),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@amioprowears.com",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || null, // 234XXXXXXXXXX
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_CHAT_NUMBER || null, // 234XXXXXXXXXX
};

/** Physical shop, shown in the footer and on /contact. One entry per line. */
export const ADDRESS = {
  lines: [
    "@mekusstandard",
    "Shop GFD/36, State Line",
    "Young Shall Grow Plaza",
    "Main Market, Onitsha, Anambra State",
  ],
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Young Shall Grow Plaza, Main Market, Onitsha, Anambra State"),
} as const;

/** Social media profiles, shown in the footer and on /contact. */
export const SOCIALS = [
  { name: "Instagram", handle: "@amioprowears", url: "https://instagram.com/amioprowears" },
  { name: "TikTok", handle: "@amioprowears", url: "https://tiktok.com/@amioprowears" },
  { name: "X", handle: "@amioprowears", url: "https://x.com/amioprowears" },
] as const;

export type SocialName = (typeof SOCIALS)[number]["name"];

/** When the policy pages were last changed — update when their wording changes. */
export const POLICIES_UPDATED = "26 September 2026";

/** Store rules quoted by the policy pages, kept together so they can't disagree. */
export const POLICY = {
  dispatchDays: "1–3 working days",
  transitDays: "1–3 days",
  exchangeWindow: "24 hours",
};
