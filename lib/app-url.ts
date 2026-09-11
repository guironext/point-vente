import { headers } from "next/headers";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isLocalHost(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

export async function getAppUrl() {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const proto =
    headerStore.get("x-forwarded-proto") ??
    (isLocalHost(host) ? "http" : "https");

  if (host && !isLocalHost(host)) {
    return `${proto}://${host.split(",")[0].trim()}`;
  }

  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    ""
  ).replace(/^https?:\/\//, "");
  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  const explicit = process.env.APP_URL
    ? stripSlash(process.env.APP_URL)
    : "";
  if (explicit && !isLocalHost(explicit)) {
    return explicit;
  }

  if (host) {
    return `${proto}://${host.split(",")[0].trim()}`;
  }

  return explicit || "http://localhost:3000";
}
