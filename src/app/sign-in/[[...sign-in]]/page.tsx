// app/sign-in/[[...sign-in]]/page.tsx
// ログインしていない人は、どのページを開いてもここに案内される（src/proxy.ts）。
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="studio-shell auth-page">
      <header className="history-intro"><p className="eyebrow">YOUR CAREER ATELIER</p><h1>ログインして、練習をはじめよう。</h1><p className="intro-copy">練習・記録・メールでの受け取りは、ログインした人だけが使えます。<br />はじめての方は「Sign up」から登録できます。</p></header>
      <SignIn />
    </main>
  );
}
