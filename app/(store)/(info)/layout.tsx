/** Shared layout for the policy and info pages: a readable column with simple typography. */
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <article
      className={[
        "mx-auto max-w-2xl px-4 py-8 text-base leading-relaxed md:py-12",
        "[&_h1]:font-display [&_h1]:text-5xl [&_h1]:leading-none [&_h1]:tracking-wide",
        "[&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold",
        "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-brand",
      ].join(" ")}
    >
      {children}
    </article>
  );
}
