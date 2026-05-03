import Link from "next/link";

const navItems = [
  { href: "/shifts",  label: "勤務表",      description: "月間勤務表の作成・編集・自動補完" },
  { href: "/staff",   label: "スタッフ管理", description: "スタッフの登録・編集・個別条件設定" },
  { href: "/rules",   label: "ルール設定",   description: "連勤・夜勤・必要人数などのルール設定" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">勤務表作成支援ツール</h1>
        <p className="mt-2 text-gray-500">固定勤務を先に入れて、未確定部分だけを自動補完</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-2 hover:border-blue-400 hover:shadow-sm transition-all"
          >
            <span className="text-lg font-semibold text-gray-800">{item.label}</span>
            <span className="text-sm text-gray-500">{item.description}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
