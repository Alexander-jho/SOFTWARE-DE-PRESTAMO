import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Settings as SettingsIcon, PlusCircle, AlertCircle, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Préstamos', path: '/loans', icon: Wallet },
  { label: 'Nuevo Préstamo', path: '/loans/new', icon: PlusCircle },
  { label: 'Configuración', path: '/settings', icon: SettingsIcon },
];

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
            <Wallet className="w-8 h-8" />
            Prestafácil
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-medium">Gestión Financiera</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-50 text-blue-700 shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <span className="text-sm text-gray-500 font-medium">Panel de Control</span>
             <span className="h-4 w-px bg-gray-200" />
             <span className="text-sm font-bold text-gray-900">
               {NAV_ITEMS.find(n => n.path === location.pathname)?.label || 'Detalles'}
             </span>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <p className="text-sm font-bold leading-none">{user?.displayName || 'Usuario'}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Administrador</p>
             </div>
             {user?.photoURL ? (
               <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
             ) : (
               <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold uppercase">
                  {user?.displayName?.slice(0, 2) || 'AD'}
               </div>
             )}
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
