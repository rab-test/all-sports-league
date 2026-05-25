import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      {/* Red brand strip */}
      <div className="h-1 bg-red" />
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Ultimate Sports League"
            height={40}
            width={160}
            className="h-10 w-auto object-contain"
          />
        </Link>
        <nav className="flex items-center gap-5 text-xs font-bold uppercase tracking-wider">
          <Link href="/" className="text-navy transition-colors hover:text-accent">Home</Link>
          <Link href="/schedule" className="text-navy transition-colors hover:text-accent">Schedule</Link>
          <Link href="/standings" className="text-navy transition-colors hover:text-accent">Standings</Link>
          <Link href="/rules" className="text-navy transition-colors hover:text-accent">Rules</Link>
          <Link href="/squads" className="text-navy transition-colors hover:text-accent">Squads</Link>
        </nav>
      </div>
    </header>
  );
}
