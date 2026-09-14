// src/proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // _next や 画像など以外のすべてに通す（Clerk公式の既定）
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|otf|eot|map)).*)",
    "/(api|trpc)(.*)",
  ],
};