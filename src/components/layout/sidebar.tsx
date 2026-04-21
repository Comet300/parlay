import { Link, useMatches } from '@tanstack/react-router'
import { LayoutDashboard, Settings } from 'lucide-react'

const navItems = [
  { to: '/dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings' as const, label: 'Settings', icon: Settings },
]

export function Sidebar({ onNavClick }: { onNavClick?: () => void }) {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-surface">
      <div className="p-5">
        <Link
          to="/dashboard"
          onClick={onNavClick}
          className="text-xl font-extrabold tracking-tight text-primary"
          style={{ fontWeight: 800, letterSpacing: '-0.03em' }}
        >
          parlay<span className="text-accent">.</span>
        </Link>
      </div>
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavClick}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-l-[2.5px] border-primary bg-primary-subtle text-primary'
                  : 'text-text-muted hover:bg-border-light hover:text-text'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
