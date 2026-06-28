import { useAuth } from '@/auth'
import type { UserInfo } from '@/api'

function getInitials(info: UserInfo): string {
  return [info.firstName[0], info.lastName[0]].filter(Boolean).join('').toUpperCase();
}

function TopBar() {
  const { userInfo, logout } = useAuth();

  const initials = userInfo ? getInitials(userInfo) : '';
  const displayName = userInfo ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : '';

  return (
    <div
      className="flex items-center justify-between px-[18px] shrink-0"
      style={{ height: 54, background: '#003057', color: '#fff' }}
    >
      <div className="flex items-center gap-[11px]">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-mono font-semibold text-xs tracking-tight"
          style={{ background: '#EAAA00', color: '#003057' }}
        >
          YJFC
        </div>
        <span className="font-semibold text-sm">Yellow Jacket Flying Club</span>
      </div>

      <div className="flex items-center gap-[14px]">
        {userInfo && (
          <div className="flex items-center gap-[10px]">
            <span className="text-sm font-medium" style={{ opacity: 0.9 }}>{displayName}</span>
            <div
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-mono font-semibold text-xs"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
            >
              {initials}
            </div>
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

export default function SchedulePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb]">
      <TopBar />
      <main className="flex-1" />
    </div>
  );
}
