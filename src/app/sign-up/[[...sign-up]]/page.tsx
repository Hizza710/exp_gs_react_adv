// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="studio-shell auth-page">
      <header className="history-intro"><p className="eyebrow">YOUR CAREER ATELIER</p><h1>登録して、あなたのアトリエを。</h1><p className="intro-copy">登録すると、練習の記録があなた専用に保存されます。</p></header>
      <SignUp />
    </main>
  );
}
