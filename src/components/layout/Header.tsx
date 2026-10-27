import { Bell, Search, Menu } from 'lucide-react'
import { APP_CONFIG } from '@/utils/constants'
import './Header.css'

type HeaderProps = {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Abrir menú de navegación"
        >
          <Menu size={23} />
        </button>
        <h1 className="page-title">{APP_CONFIG.name}</h1>
      </div>

      <div className="header-right">
        <label className="search-box">
          <Search size={18} />
          <input type="search" placeholder="Buscar..." aria-label="Buscar" />
        </label>

        <button className="icon-btn" aria-label="Notificaciones" type="button">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
      </div>
    </header>
  )
}
