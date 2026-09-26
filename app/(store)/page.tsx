import Image from "next/image";
import Link from "next/link";
import { JerseyCard } from "@/components/store/JerseyCard";
import { buttonClasses } from "@/components/ui/Button";
import { COLLECTION_LABELS, sortProducts } from "@/lib/catalogue";
import { pickHeroTiles } from "@/lib/homepage";
import { getActiveProducts, getHomepageConfig } from "@/lib/products";

// Static, refreshed at most every 5 minutes (and on demand when admin saves a product).
export const revalidate = 300;

const ROW_LIMIT = 8;

/** Content (headline, top pictures, rows, steps) is set in admin → Homepage. */
export default async function HomePage() {
  const [products, home] = await Promise.all([getActiveProducts(), getHomepageConfig()]); // products in sort order
  const hero = pickHeroTiles(home.hero, products);
  const newest = sortProducts(products, "newest");
  const headline = home.headline.split("\n");

  // Rows in the owner's order; empty collections are skipped.
  const rows = home.rows.map((slug) => ({
    slug,
    title: COLLECTION_LABELS[slug],
    // New arrivals: newest first. Other collections: the owner's sort order.
    items: (slug === "new-arrivals" ? newest : products).filter((p) => p.collections.includes(slug)),
  })).filter((r) => r.items.length > 0);

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-20">
        <div className="space-y-6">
          <h1 className="font-display text-6xl leading-[0.9] tracking-wide md:text-8xl">
            {headline.map((line, i) => (
              <span key={i} className={i === headline.length - 1 && headline.length > 1 ? "block text-brand" : "block"}>
                {line}
              </span>
            ))}
          </h1>
          {home.subtext && <p className="max-w-md text-lg text-muted">{home.subtext}</p>}
          <div className="flex flex-wrap gap-3">
            <Link href="/catalogue" className={buttonClasses({ size: "lg" })}>
              Shop jerseys
            </Link>
            <Link href="/track" className={buttonClasses({ size: "lg", variant: "secondary" })}>
              Track an order
            </Link>
          </div>
        </div>
        {hero.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {hero.map(({ product: p, side }, i) => (
              <Link
                key={p.id}
                href={`/jersey/${p.slug}`}
                className={`overflow-hidden rounded-2xl bg-surface transition-transform hover:-translate-y-1 ${i === 1 ? "translate-y-6 hover:translate-y-5" : ""}`}
              >
                <Image
                  src={(side === "back" && p.image_back) || p.image_front}
                  alt={`${p.name}, ${side === "back" && p.image_back ? "back" : "front"} view`}
                  width={400}
                  height={500}
                  priority={i === 0}
                  unoptimized
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {rows.map((row) => (
        <section key={row.slug} aria-labelledby={`row-${row.slug}`} className="mx-auto max-w-7xl py-8 md:py-10">
          <div className="mb-4 flex items-end justify-between gap-4 px-4">
            <h2 id={`row-${row.slug}`} className="font-display text-4xl leading-none tracking-wide">
              {row.title}
            </h2>
            <Link
              href={`/catalogue?collection=${row.slug}`}
              className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium underline underline-offset-4 hover:text-brand"
            >
              See all<span className="sr-only"> {row.title}</span>
            </Link>
          </div>
          {/* Phones: swipe sideways, with the next card peeking in. Desktop: 4-column grid. */}
          <ul className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-4 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {row.items.slice(0, ROW_LIMIT).map((p, i) => (
              <li key={p.id} className={`w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto ${i >= 4 ? "md:hidden" : ""}`}>
                <JerseyCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {home.showSteps && (
        <section aria-labelledby="how-it-works" className="mt-8 bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <h2 id="how-it-works" className="mb-8 font-display text-4xl tracking-wide">
              How it works
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {home.steps.map((s, i) => (
                <li key={i} className="rounded-2xl bg-white p-6">
                  <span className="font-display text-5xl text-brand">{i + 1}</span>
                  <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
