import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatButton } from "@/components/store/ChatButton";
import { JerseyCard } from "@/components/store/JerseyCard";
import { Price } from "@/components/store/Price";
import { ProductGallery, type GalleryImage } from "@/components/store/ProductGallery";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { Badge } from "@/components/ui/Badge";
import { ERA_LABELS, GENDER_LABELS, slugify, TYPE_LABELS, type CatalogueProduct } from "@/lib/catalogue";
import { effectivePrice } from "@/lib/pricing";
import { getActiveProducts, getProductBySlug } from "@/lib/products";
import type { Product } from "@/types";

// Every active product is prerendered at build time and refreshed at most every
// 5 minutes. Products added later are rendered on their first visit, then cached.
export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/jersey/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description:
      product.description ?? `${product.name} — add your name, number and badges. Delivered to your nearest motor park.`,
    openGraph: { images: [{ url: product.image_front, alt: `${product.name}, front view` }] },
  };
}

export default async function JerseyPage({ params }: PageProps<"/jersey/[slug]">) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getProductBySlug(slug), getActiveProducts()]);
  if (!product) notFound();

  const images: GalleryImage[] = [
    { src: product.image_front, alt: `${product.name}, front view` },
    ...(product.image_back ? [{ src: product.image_back, alt: `${product.name}, back view` }] : []),
    ...product.gallery.map((src, i) => ({ src, alt: `${product.name}, photo ${i + 3}` })),
  ];
  const onSale = effectivePrice(product) < product.price;
  const related = relatedProducts(product, all);

  const details = [
    { term: "Club", value: product.club },
    { term: "Season", value: product.season },
    { term: "Version", value: TYPE_LABELS[product.type] },
    { term: "Fit", value: GENDER_LABELS[product.gender] },
    { term: "Era", value: ERA_LABELS[product.era] },
  ].filter((d) => d.value);

  return (
    // Lifts this page's chat button above the mobile sticky "Add to cart" bar.
    <div className="[--sticky-bar-height:4.75rem] md:[--sticky-bar-height:0px]">
      <div className="mx-auto max-w-7xl px-4 py-4 md:py-10">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/catalogue" className="inline-flex min-h-11 items-center hover:text-ink md:min-h-0">
                Shop all
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/catalogue?club=${slugify(product.club)}`}
                className="inline-flex min-h-11 items-center hover:text-ink md:min-h-0"
              >
                {product.club}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-16">
          <ProductGallery images={images} />

          <div className="space-y-6">
            <div className="space-y-2">
              {onSale && <Badge tone="brand">Sale</Badge>}
              <h1 className="font-display text-4xl leading-none tracking-wide md:text-5xl">{product.name}</h1>
              <p className="text-muted">{[product.club, product.season].filter(Boolean).join(" · ")}</p>
              <Price price={product.price} salePrice={product.sale_price} size="lg" />
            </div>

            <ProductPurchase
              productId={product.id}
              sizes={product.sizes}
              outOfStockSizes={product.out_of_stock_sizes}
              price={product.price}
              salePrice={product.sale_price}
            />

            {product.description && <p className="leading-relaxed">{product.description}</p>}

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-6 text-sm">
              {details.map((d) => (
                <div key={d.term} className="contents">
                  <dt className="text-muted">{d.term}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-2xl bg-surface p-4 text-sm">
              <h2 className="mb-1 font-bold">Motor-park delivery</h2>
              <p className="text-muted">
                We send your order to the motor park you choose. The logistics company will call the phone
                number you give us when it arrives. Bring your order number and a valid ID to pick it up.{" "}
                <Link href="/delivery" className="text-ink underline underline-offset-4 hover:text-brand">
                  Delivery fees
                </Link>
              </p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-16">
            <h2 id="related-heading" className="mb-6 font-display text-3xl tracking-wide md:text-4xl">
              You might also like
            </h2>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
              {related.map((p) => (
                <li key={p.id}>
                  <JerseyCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <ChatButton message={`Hi, I have a question about ${product.name}`} />
    </div>
  );
}

/** Up to 4 other jerseys: same club first, then ones sharing a collection. */
function relatedProducts(product: Product, all: CatalogueProduct[]): CatalogueProduct[] {
  const score = (p: CatalogueProduct) =>
    (p.club === product.club ? 2 : 0) + (p.collections.some((c) => product.collections.includes(c)) ? 1 : 0);
  return all
    .filter((p) => p.id !== product.id && score(p) > 0)
    .sort((a, b) => score(b) - score(a) || a.sort_order - b.sort_order)
    .slice(0, 4);
}
