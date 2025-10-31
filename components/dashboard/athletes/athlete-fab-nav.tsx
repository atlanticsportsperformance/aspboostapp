'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  hasWorkouts?: boolean;
}

interface AthleteFABNavProps {
  items: NavItem[];
  athleteId: string;
}

export default function AthleteFABNav({ items, athleteId }: AthleteFABNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* Navigation Menu - Appears above FAB */}
        <div
          className={`absolute bottom-full right-0 mb-3 transition-all duration-300 origin-bottom-right ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[220px] overflow-hidden">
            <div className="p-2 space-y-1">
              {items.map((item) => {
                const isTodayWithWorkouts = item.id === 'today' && item.hasWorkouts;
                const content = (
                  <div
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      item.active
                        ? 'bg-[#9BDDFF]/20 text-[#9BDDFF] border border-[#9BDDFF]/30'
                        : isTodayWithWorkouts
                        ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 border border-amber-500/20'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick?.();
                      setIsOpen(false);
                    }}
                    className="w-full"
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] rounded-full shadow-lg shadow-[#9BDDFF]/30 hover:shadow-xl hover:shadow-[#9BDDFF]/50 transition-all hover:scale-110 active:scale-95 flex items-center justify-center group relative overflow-hidden"
          aria-label={isOpen ? 'Close Menu' : 'Open Navigation Menu'}
        >
          {/* Glossy overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />

          {/* Icon */}
          <svg
            className={`w-6 h-6 text-black transition-transform duration-300 ${
              isOpen ? 'rotate-45' : 'rotate-0'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
