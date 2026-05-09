import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "看護師勤務表",
  description: "看護師向け勤務表作成支援ツール",
};

const NAV_ITEMS = [
  { href: "/shifts", label: "勤務表" },
  { href: "/staff", label: "スタッフ" },
  { href: "/shift-types", label: "勤務種別" },
  { href: "/skills", label: "技能設定" },
  { href: "/rules", label: "ルール設定" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} antialiased bg-gray-50 min-h-screen`}>
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 flex items-center gap-8 h-14">
            <Link href="/" className="font-bold text-gray-900 text-sm shrink-0">
              看護師勤務表
            </Link>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
