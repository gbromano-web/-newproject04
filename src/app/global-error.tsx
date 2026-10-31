"use client";

/** Last resort when the layout itself fails. Renders its own document, so styles are inline. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f6f8fa", color: "#0b2233" }}>
        <title>Go Search Property</title>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>Go Search Property is having a moment</h1>
          <p style={{ color: "#4a5b68", lineHeight: 1.5 }}>Something went wrong on our side. Please try again shortly.</p>
          <button
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "12px 20px", borderRadius: 999, border: 0, background: "#0b3a53", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
