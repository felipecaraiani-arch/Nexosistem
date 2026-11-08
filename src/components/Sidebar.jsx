import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  ShoppingBag,
  Store,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, counts = {} }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Visão Geral',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'estoque',
      label: 'Estoque & Produtos',
      icon: Package,
      badge: counts.lowStock > 0 ? { text: counts.lowStock, color: 'bg-amber-500 text-white' } : null
    },
    {
      id: 'pagar',
      label: 'Contas a Pagar',
      icon: ArrowDownCircle,
      badge: counts.overduePayables > 0 ? { text: counts.overduePayables, color: 'bg-rose-500 text-white' } : null
    },
    {
      id: 'receber',
      label: 'Contas a Receber',
      icon: ArrowUpCircle,
      badge: counts.pendingShopeeReceivables > 0 ? { text: counts.pendingShopeeReceivables, color: 'bg-orange-500 text-white' } : null
    },
    {
      id: 'caixa',
      label: 'Fluxo de Caixa',
      icon: Wallet,
      badge: null
    },
    {
      id: 'shopee',
      label: 'Integração Shopee',
      icon: Store,
      badge: { text: 'API Futura', color: 'bg-slate-200 text-slate-700' }
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ee4d2d] to-[#ff7337] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
          <ShoppingBag size={22} className="stroke-[2.2]" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-base leading-tight flex items-center gap-1.5">
            Shopee ERP <span className="text-[10px] bg-orange-100 text-[#ee4d2d] font-semibold px-1.5 py-0.5 rounded">Lite</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Gestão & Finanças</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu Principal
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-orange-50 text-[#ee4d2d] shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={19} className={isActive ? 'text-[#ee4d2d]' : 'text-slate-400'} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badge.color}`}>
                    {item.badge.text}
                  </span>
                )}
                {isActive && <ChevronRight size={14} className="text-[#ee4d2d]" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Status da Loja */}
      <div className="p-4 m-3 rounded-xl bg-orange-50/70 border border-orange-100/80">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-700">Sistema Local Ativo</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Estoque, caixa e contas sincronizados localmente no banco SQLite.
        </p>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-center text-xs text-slate-400">
        ERP Shopee • v1.0.0
      </div>
    </aside>
  );
}
