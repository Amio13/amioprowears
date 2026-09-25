import Image from "next/image";
import Link from "next/link";
import { JerseyCard } from "@/components/store/JerseyCard";
import { buttonClasses } from "@/components/ui/Button";
import { COLLECTION_LABELS, sortProducts } from "@/lib/catalogue";
import { getActiveProducts } from "@/lib/products";
import type { CollectionSlug } from "@/types";

// Static, refreshed at most every 5 minutes (and on demand when admin saves a product).
export const revalidate = 300;

const STEPS = [
  { title: "Pick your jersey", body: "Club, country or vintage — in men's, women's and kids' sizes." },
  { title: "Make it yours", body: "Add your name, number and badges and see it live before you pay." },
  { title: "Collect at the park", body: "We send it to the motor park you choose, anywhere in Nigeria." },
];

/** Homepage rows, in display order. Empty collections are skipped. */
const HOME_COLLECTIONS: CollectionSlug[] = ["new-arrivals", "super-eagles", "champions-league", "female-kits", "vintage"];
const ROW_LIMIT = 8;

export default async function HomePage() {
  const products = await getActiveProducts(); // ordered by sort_order
  const featured = products.filter((p) => p.is_featured);
  const hero = (featured.length >= 3 ? featured : products).slice(0, 3);
  const newest = sortProducts(products, "newest");

  const rows = HOME_COLLECTIONS.map((slug) => ({
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
            Your name.
            <br />
            Your number.
            <br />
            <span className="text-brand">Your team.</span>
          </h1>
          <p className="max-w-md text-lg text-muted">
            Custom football jerseys printed with your name, number and badges — delivered to
            your nearest motor park.
          </p>
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
            {hero.map((p, i) => (
              <Link
                key={p.id}
                href={`/jersey/${p.slug}`}
                className={`overflow-hidden rounded-2xl bg-surface transition-transform hover:-translate-y-1 ${i === 1 ? "translate-y-6 hover:translate-y-5" : ""}`}
              >
                <Image
                  // Middle tile shows the back (name + number) to hint at customisation.
                  src={(i === 1 && p.image_back) || p.image_front}
                  alt={`${p.name}, ${i === 1 && p.image_back ? "back" : "front"} view`}
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

      <section aria-labelledby="how-it-works" className="mt-8 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 id="how-it-works" className="mb-8 font-display text-4xl tracking-wide">
            How it works
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-6">
                <span className="font-display text-5xl text-brand">{i + 1}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
