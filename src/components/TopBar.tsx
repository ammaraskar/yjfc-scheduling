import { useLocation, Link } from 'wouter'
import { useAuth } from '@/auth'
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
  const [location] = useLocation();

  const initials = userInfo ? getInitials(userInfo) : '';
  const displayName = userInfo ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : '';

  return (
    <div
      className="flex items-center justify-between px-[18px] shrink-0"
      style={{ height: 54, background: '#003057', color: '#fff' }}
    >
      <div className="flex items-center gap-[11px]">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-mono font-semibold text-[11px] tracking-tight shrink-0"
          style={{ background: '#EAAA00', color: '#003057' }}
        >
          YJ
        </div>
        <span className="font-bold text-[15px] tracking-[0.01em]">Yellow Jacket Flying Club</span>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.22)' }} />
        <nav className="flex gap-[18px] text-[13px] font-medium">
          {NAV_LINKS.map(({ label, href }) => {
            const active = location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <span
                  className="cursor-pointer"
                  style={{
                    color: active ? '#fff' : 'rgba(255,255,255,0.78)',
                    fontWeight: active ? 600 : 500,
                    borderBottom: active ? '2px solid #EAAA00' : '2px solid transparent',
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

      <div className="flex items-center gap-[13px] text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {userInfo && (
          <div className="flex items-center gap-[7px] px-[10px] py-[4px] rounded-[20px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-mono font-bold text-[11px]"
              style={{ background: '#EAAA00', color: '#003057' }}
            >
              {initials}
            </div>
            <span className="font-semibold">{displayName}</span>
          </div>
        )}
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
  );
}
