//THIS IS FOR CLERK

//The clerkMiddleware helper enables authentication and is where you'll configure your protected routes.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // run middleware on all app routes + api
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
