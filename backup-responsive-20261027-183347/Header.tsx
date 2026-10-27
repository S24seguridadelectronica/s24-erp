import { Bell, Search } from 'lucide-react'
import { APP_CONFIG } from '@/utils/constants'
import './Header.css'

export function Header() {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="page-title">{APP_CONFIG.name}</h1>
      </div>
      <div className="header-right">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Buscar..." />
        </div>
        <button className="icon-btn" aria-label="Notificaciones">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
      </div>
    </header>
  )
}