import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

const PREVIEW_JERSEYS = [
  { src: "/placeholders/nigeria-home-back.svg", alt: "Green Super Eagles home jersey, back view" },
  { src: "/placeholders/arsenal-home-front.svg", alt: "Red Arsenal home jersey with white sleeves" },
  { src: "/placeholders/nigeria-1994-front.svg", alt: "Green and white Nigeria 1994 retro jersey" },
];

const STEPS = [
  { title: "Pick your jersey", body: "Club, country or vintage — in men's, women's and kids' sizes." },
  { title: "Make it yours", body: "Add your name, number and badges and see it live before you pay." },
  { title: "Collect at the park", body: "We send it to the motor park you choose, anywhere in Nigeria." },
];

export default function HomePage() {
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
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {PREVIEW_JERSEYS.map((j, i) => (
            <div
              key={j.src}
              className={`overflow-hidden rounded-2xl bg-surface ${i === 1 ? "translate-y-6" : ""}`}
            >
              <Image src={j.src} alt={j.alt} width={400} height={500} priority={i === 0} unoptimized />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="bg-surface">
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
