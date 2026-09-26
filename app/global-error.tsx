"use client";

/**
 * Last-resort error page, used only if the root layout itself fails. It replaces
 * the whole document, so it can't use our CSS or fonts — plain inline styles.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-NG">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#171717", textAlign: "center", padding: "96px 16px" }}>
        <title>Something went wrong | Amioprowears</title>
        <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
        <p style={{ color: "#525252" }}>Please try again in a minute.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 999, padding: "12px 24px", fontSize: 16, cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
