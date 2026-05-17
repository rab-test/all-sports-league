import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-charcoal">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Ultimate Sports League" height={40} width={160} className="h-10 w-auto object-contain" />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/" className="text-white/80 hover:text-accent transition-colors">Home</Link>
          <Link href="/schedule" className="text-white/80 hover:text-accent transition-colors">Schedule</Link>
          <Link href="/standings" className="text-white/80 hover:text-accent transition-colors">Standings</Link>
          <Link href="/squads" className="text-white/80 hover:text-accent transition-colors">Squads</Link>
        </nav>
      </div>
    </header>
  );
}
