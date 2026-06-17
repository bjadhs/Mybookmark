import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything is public by default — guests can browse the library and open any
// bookmark detail (/[slug]). Only /settings and /add are hard-gated here.
// The managed members-area pages (/server, /agents, /category, /p/*) gate
// themselves per-page via enforcePageAccess (lib/page-access), which respects
// each page's `locked` flag and steers guests to the friendly /locked teaser.
const isProtectedRoute = createRouteMatcher(["/settings(.*)", "/add(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
