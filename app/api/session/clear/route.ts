import { NextResponse } from "next/server";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/constants";

export function GET(request: Request) {
  const url = new URL("/connexion", request.url);
  const response = NextResponse.redirect(url);
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
