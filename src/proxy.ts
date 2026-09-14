// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// ログインしていなくても開けるページ（ログイン・新規登録の画面だけ）
const isPublicPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
// API は各 route.ts の中で auth() を確かめ、401（ログインしてください）を返す。
// ここで protect() すると、未ログインの fetch に 404 が返ってしまい、画面で理由を伝えられないため。
const isApi = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    // それ以外のページは、未ログインならログイン画面へ移動させる
    if (!isPublicPage(req) && !isApi(req)) {
      await auth.protect();
    }
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    // _next や 画像など以外のすべてに通す（Clerk公式の既定）
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|otf|eot|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
