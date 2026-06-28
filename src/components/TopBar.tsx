import { useLocation, Link } from 'wouter'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '@/auth'
import { useTheme } from '@/theme'
import type { UserInfo } from '@/api'

function getInitials(info: UserInfo): string {
  return [info.firstName[0], info.lastName[0]].filter(Boolean).join('').toUpperCase();
}

const NAV_LINKS = [
  { label: 'Schedule', href: '/schedule' },
  { label: 'Aircraft', href: '/aircraft' },
];

export default function TopBar() {
  const { userInfo, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [location] = useLocation();

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  const initials = userInfo ? getInitials(userInfo) : '';
  const displayName = userInfo ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : '';

  return (
    <div
      className="shrink-0 px-3 py-2 md:px-[18px] md:py-0"
      style={{ minHeight: 54, background: '#003057', color: '#fff' }}
    >
      <div className="w-full flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between md:h-[54px]">
        <div className="flex items-center justify-between gap-3 min-w-0 md:flex-1">
          <div className="flex items-center gap-[9px] min-w-0 md:flex-1">
            <div
              className="w-[28px] h-[28px] md:w-[30px] md:h-[30px] rounded-full flex items-center justify-center font-mono font-semibold text-[11px] tracking-tight shrink-0"
              style={{ background: 'var(--club-gold)', color: '#003057' }}
            >
              YJ
            </div>
            <span className="font-bold text-[14px] md:text-[15px] tracking-[0.01em] truncate hidden sm:inline">Yellow Jacket Flying Club</span>
            <span className="font-bold text-[14px] tracking-[0.01em] truncate sm:hidden">YJ Flying Club</span>
            <div className="hidden md:block" style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.22)' }} />

            <nav className="hidden md:flex gap-[18px] text-[13px] font-medium ml-[2px]">
              {NAV_LINKS.map(({ label, href }) => {
                const active = location.startsWith(href);
                return (
                  <Link key={href} href={href}>
                    <span
                      className="cursor-pointer whitespace-nowrap"
                      style={{
                        color: active ? '#fff' : 'rgba(255,255,255,0.78)',
                        fontWeight: active ? 600 : 500,
                        borderBottom: active ? '2px solid var(--club-gold)' : '2px solid transparent',
                        paddingBottom: 3,
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-[8px] text-[12px] md:text-[13px] shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {userInfo && (
              <div className="flex items-center gap-[7px] px-[8px] md:px-[10px] py-[4px] rounded-[20px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="w-[20px] h-[20px] md:w-[22px] md:h-[22px] rounded-full flex items-center justify-center font-mono font-bold text-[10px] md:text-[11px]"
                  style={{ background: 'var(--club-gold)', color: '#003057' }}
                >
                  {initials}
                </div>
                <span className="font-semibold hidden md:inline">{displayName}</span>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="w-[30px] h-[30px] flex items-center justify-center rounded cursor-pointer transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={logout}
              className="text-xs font-medium px-3 py-1.5 rounded cursor-pointer transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="flex md:hidden gap-[8px] text-[13px] font-medium overflow-x-auto pb-[2px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {NAV_LINKS.map(({ label, href }) => {
            const active = location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <span
                  className="cursor-pointer whitespace-nowrap rounded-[7px] px-[10px] py-[4px]"
                  style={{
                    color: active ? '#fff' : 'rgba(255,255,255,0.78)',
                    fontWeight: active ? 600 : 500,
                    borderBottom: '2px solid transparent',
                    background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
