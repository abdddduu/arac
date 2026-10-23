'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Car,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Nfc,
  Settings,
  X,
} from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { cn } from '@/lib/utils';

type SidebarProps = {
  dealership: {
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
  };
  user: {
    fullName: string;
    role: string;
  };
};

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/dashboard/vehicles', label: 'Araçlar', icon: Car },
  { href: '/dashboard/nfc', label: 'NFC Yazma', icon: Nfc },
  { href: '/dashboard/leads', label: 'Talepler', icon: Inbox },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Sahip',
  manager: 'Yönetici',
  sales: 'Satış',
};

export function DashboardSidebar({ dealership, user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const brandColor = dealership.brandColor || '#0F172A';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
        {dealership.logoUrl ? (
          <Image
            src={dealership.logoUrl}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {dealership.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{dealership.name}</p>
          <p className="text-xs text-slate-500">AracKimlik</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
              style={active ? { color: brandColor, backgroundColor: `${brandColor}14` } : undefined}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
            {user.fullName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        </div>
        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            Çıkış Yap
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          {dealership.logoUrl ? (
            <Image
              src={dealership.logoUrl}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-cover"
            />
          ) : (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {dealership.name.charAt(0)}
            </span>
          )}
          <span className="text-sm font-semibold text-slate-900">{dealership.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menüyü aç"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menüyü kapat"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
