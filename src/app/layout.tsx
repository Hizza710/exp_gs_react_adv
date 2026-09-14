
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "AI練習コーチ",
  description: "表情・音声・AIで練習するコーチ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body>
          <header style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 12 }}>
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

// import type { Metadata } from "next";
// import { Geist, Geist_Mono, Sawarabi_Gothic } from "next/font/google";
// import "./globals.css";
// import Link from "next/link";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// const sawarabiGothic = Sawarabi_Gothic({
//   variable: "--font-sawarabi-gothic",
//   subsets: ["latin"],
//   weight: "400",
// });

// export const metadata: Metadata = {
//   title: "ほんねキャリア工房 | AI面接練習",
//   description: "話す、気づく、また試す。あなたらしい言葉を磨くキャリア面接練習スタジオ。",
// };

// export default function RootLayout({ children }: LayoutProps<"/">) {
//   return (
//     <html
//       lang="ja"
//       className={`${geistSans.variable} ${geistMono.variable} ${sawarabiGothic.variable} h-full antialiased`}
//     >
//       <body className="min-h-full flex flex-col">
//         <nav className="studio-nav" aria-label="メインナビゲーション">
//           <Link href="/" className="studio-brand"><span className="brand-mark" aria-hidden="true">a.</span><span>ホンネキャリア工房<small>YOUR SPACE FOR INTERVIEW PRACTICE</small></span></Link>
//           <div className="nav-links"><Link href="/">練習する</Link><Link href="/history">練習の記録 <span aria-hidden="true">↗</span></Link></div>
//         </nav>
//         {children}
//         <footer className="studio-footer site-footer">
//           <span>EVERY WORD WEAVES YOUR WAY.</span>
//           <span className="copyright">©︎HIZZA710</span>
//           <span>今日の一歩を、大切に。</span>
//         </footer>
//       </body>
//     </html>
//   );
// }
