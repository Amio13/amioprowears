import {
  Alfa_Slab_One,
  Anton,
  Audiowide,
  Barlow_Condensed,
  Bebas_Neue,
  Black_Ops_One,
  Chakra_Petch,
  Graduate,
  Orbitron,
  Oswald,
  Racing_Sans_One,
  Roboto,
  Russo_One,
  Saira_Condensed,
  Squada_One,
  Staatliches,
  Teko,
} from "next/font/google";

/**
 * All site fonts. Roboto (UI) and Bebas Neue (headings) are preloaded; the jersey print
 * fonts (lib/jersey-fonts.ts) are not — the browser only downloads one when a page
 * actually draws text in it, so extra fonts cost nothing on other pages.
 */
const roboto = Roboto({ variable: "--font-roboto", weight: ["400", "500", "700"], subsets: ["latin"] });
const bebas = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });

// next/font needs literal options on every call (no shared object or spread).
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], preload: false, display: "swap" });
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const staatliches = Staatliches({ variable: "--font-staatliches", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const teko = Teko({ variable: "--font-teko", weight: "600", subsets: ["latin"], preload: false, display: "swap" });
const saira = Saira_Condensed({ variable: "--font-saira", weight: "700", subsets: ["latin"], preload: false, display: "swap" });
const barlow = Barlow_Condensed({ variable: "--font-barlow", weight: "700", subsets: ["latin"], preload: false, display: "swap" });
const squada = Squada_One({ variable: "--font-squada", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const russo = Russo_One({ variable: "--font-russo", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const orbitron = Orbitron({ variable: "--font-orbitron", weight: "800", subsets: ["latin"], preload: false, display: "swap" });
const chakra = Chakra_Petch({ variable: "--font-chakra", weight: "700", subsets: ["latin"], preload: false, display: "swap" });
const audiowide = Audiowide({ variable: "--font-audiowide", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const racing = Racing_Sans_One({ variable: "--font-racing", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const graduate = Graduate({ variable: "--font-graduate", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const alfa = Alfa_Slab_One({ variable: "--font-alfa", weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const blackops = Black_Ops_One({ variable: "--font-blackops", weight: "400", subsets: ["latin"], preload: false, display: "swap" });

/** Put on <html> so every font variable is available everywhere. */
export const fontVariables = [
  roboto, bebas, oswald, anton, staatliches, teko, saira, barlow, squada,
  russo, orbitron, chakra, audiowide, racing, graduate, alfa, blackops,
]
  .map((f) => f.variable)
  .join(" ");
