import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700 bg-charcoal">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white tracking-tight">
          All Sports League
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">Home</Link>
          <Link href="/schedule" className="text-slate-400 hover:text-white transition-colors">Schedule</Link>
          <Link href="/standings" className="text-slate-400 hover:text-white transition-colors">Standings</Link>
          <Link href="/squads" className="text-slate-400 hover:text-white transition-colors">Squads</Link>
        </nav>
      </div>
    </header>
  );
}
