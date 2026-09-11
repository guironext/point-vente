"use client";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f3ece0",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: 28 * 16, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, color: "#14352c" }}>
            Cette page n&apos;a pas pu s&apos;afficher
          </h1>
          <p style={{ marginTop: 12, color: "#57534e" }}>
            Une erreur serveur s&apos;est produite. Réessayez, ou reconnectez-vous.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                height: 44,
                padding: "0 16px",
                border: 0,
                borderRadius: 12,
                background: "#c45c26",
                color: "white",
                fontWeight: 600,
              }}
            >
              Réessayer
            </button>
            <a
              href="/connexion"
              style={{
                height: 44,
                padding: "0 16px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 12,
                background: "white",
                color: "#14352c",
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid #e4d9c8",
              }}
            >
              Connexion
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
