import { ChartCandlestick, LayoutDashboard, ScrollText, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/options', label: 'Options', icon: ChartCandlestick, end: false },
  { to: '/history', label: 'History', icon: ScrollText, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

function itemClass(active: boolean) {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
    active ? 'bg-accent/15 text-text' : 'text-muted hover:bg-white/5 hover:text-text'
  }`
}

export function Sidebar() {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-panel lg:flex">
      <div className="flex items-center gap-3 px-4 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-sm font-bold text-white">N</span>
        <div>
          <p className="text-sm font-semibold">NIFTY AI</p>
          <p className="text-xs text-muted">Direction desk</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => itemClass(isActive)}>
            <link.icon size={16} aria-hidden="true" />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <p className="px-4 py-4 text-xs leading-5 text-muted">Frontend only. No orders are sent.</p>
    </aside>
  )
}

export function MobileNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-line bg-panel px-3 py-2 lg:hidden" aria-label="Primary">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => `shrink-0 rounded-md px-3 py-1.5 text-sm ${itemClass(isActive)}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
