"use client";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="display text-3xl text-brand">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-3 max-w-md text-sm text-stone-600">
        Une erreur serveur s&apos;est produite. Rechargez la page, ou reconnectez-vous.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-stone-400">{error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-copper px-4 text-sm font-semibold text-white"
        >
          Réessayer
        </button>
        <a
          href="/connexion"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand"
        >
          Aller à la connexion
        </a>
      </div>
    </div>
  );
}
