import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Estoque from './components/Estoque';
import ContasPagar from './components/ContasPagar';
import ContasReceber from './components/ContasReceber';
import FluxoCaixa from './components/FluxoCaixa';
import ShopeeConfig from './components/ShopeeConfig';
import Modal from './components/Modal';
import { api } from './services/api';
import { RefreshCw, Bell, Search, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [estoqueFilter, setEstoqueFilter] = useState(null);

  // Quick Action Modals
  const [quickPayItem, setQuickPayItem] = useState(null);
  const [quickPayData, setQuickPayData] = useState({ payment_date: '', payment_method: 'PIX' });
  const [quickReceiveItem, setQuickReceiveItem] = useState(null);
  const [quickReceiveData, setQuickReceiveData] = useState({ received_date: '', payment_method: 'Shopee Repasse' });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      setDashboardData(res.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleNavigate(tab, options = {}) {
    setActiveTab(tab);
    if (tab === 'estoque' && options.filter) {
      setEstoqueFilter(options.filter);
    }
  }

  function handleQuickPay(payable) {
    setQuickPayItem(payable);
    setQuickPayData({
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: payable.payment_method || 'PIX'
    });
  }

  async function confirmQuickPay(e) {
    e.preventDefault();
    if (!quickPayItem) return;
    try {
      await api.payAccount(quickPayItem.id, quickPayData);
      setQuickPayItem(null);
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleQuickReceive(receivable) {
    setQuickReceiveItem(receivable);
    setQuickReceiveData({
      received_date: new Date().toISOString().split('T')[0],
      payment_method: receivable.payment_method || 'Shopee Repasse'
    });
  }

  async function confirmQuickReceive(e) {
    e.preventDefault();
    if (!quickReceiveItem) return;
    try {
      await api.receiveAccount(quickReceiveItem.id, quickReceiveData);
      setQuickReceiveItem(null);
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  const counts = {
    lowStock: dashboardData?.estoque?.countEstoqueBaixo || 0,
    overduePayables: dashboardData?.financeiro?.aPagarAtrasadoCount || 0,
    pendingShopeeReceivables: dashboardData?.financeiro?.aReceberShopee > 0 ? 1 : 0
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex w-full min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased">
      {/* Sidebar de Navegação */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setEstoqueFilter(null);
          setActiveTab(tab);
        }}
        counts={counts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'estoque' && 'Controle de Estoque'}
              {activeTab === 'pagar' && 'Contas a Pagar'}
              {activeTab === 'receber' && 'Contas a Receber'}
              {activeTab === 'caixa' && 'Fluxo de Caixa'}
              {activeTab === 'shopee' && 'Integração Shopee API'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Balance Badge */}
            {dashboardData && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="text-slate-400 font-medium">Caixa:</span>
                <span className={`font-bold ${dashboardData.financeiro.saldoAtual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(dashboardData.financeiro.saldoAtual)}
                </span>
              </div>
            )}

            <button
              onClick={loadDashboard}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              data={dashboardData}
              onNavigate={handleNavigate}
              onQuickPay={handleQuickPay}
              onQuickReceive={handleQuickReceive}
            />
          )}

          {activeTab === 'estoque' && (
            <Estoque
              initialFilter={estoqueFilter}
              onRefreshDashboard={loadDashboard}
            />
          )}

          {activeTab === 'pagar' && (
            <ContasPagar
              onRefreshDashboard={loadDashboard}
            />
          )}

          {activeTab === 'receber' && (
            <ContasReceber
              onRefreshDashboard={loadDashboard}
            />
          )}

          {activeTab === 'caixa' && (
            <FluxoCaixa
              onRefreshDashboard={loadDashboard}
            />
          )}

          {activeTab === 'shopee' && (
            <ShopeeConfig
              onRefreshDashboard={loadDashboard}
            />
          )}
        </main>
      </div>

      {/* QUICK MODAL: Pagar direto do Dashboard */}
      <Modal
        isOpen={Boolean(quickPayItem)}
        onClose={() => setQuickPayItem(null)}
        title="Liquidar Pagamento"
        maxWidth="max-w-md"
      >
        <form onSubmit={confirmQuickPay} className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <div className="text-slate-500">Conta:</div>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{quickPayItem?.description}</div>
            <div className="text-rose-600 font-bold text-base mt-1">{formatCurrency(quickPayItem?.amount)}</div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Data do Pagamento *</label>
            <input
              type="date"
              required
              value={quickPayData.payment_date}
              onChange={(e) => setQuickPayData({ ...quickPayData, payment_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Forma de Pagamento</label>
            <select
              value={quickPayData.payment_method}
              onChange={(e) => setQuickPayData({ ...quickPayData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="PIX">PIX</option>
              <option value="Boleto">Boleto</option>
              <option value="Cartão">Cartão</option>
              <option value="Transferência">Transferência</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickPayItem(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Confirmar Pagamento
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK MODAL: Receber direto do Dashboard */}
      <Modal
        isOpen={Boolean(quickReceiveItem)}
        onClose={() => setQuickReceiveItem(null)}
        title="Confirmar Recebimento"
        maxWidth="max-w-md"
      >
        <form onSubmit={confirmQuickReceive} className="space-y-4 text-xs">
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
            <div className="text-slate-500">Repasse:</div>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{quickReceiveItem?.description}</div>
            <div className="text-emerald-600 font-bold text-base mt-1">{formatCurrency(quickReceiveItem?.amount)}</div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Data Efetiva *</label>
            <input
              type="date"
              required
              value={quickReceiveData.received_date}
              onChange={(e) => setQuickReceiveData({ ...quickReceiveData, received_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Canal de Recebimento</label>
            <select
              value={quickReceiveData.payment_method}
              onChange={(e) => setQuickReceiveData({ ...quickReceiveData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="Shopee Repasse">Shopee Repasse</option>
              <option value="PIX">PIX</option>
              <option value="Conta Bancária">Conta Bancária</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickReceiveItem(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#ee4d2d] hover:bg-[#d94426] text-white rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Confirmar Recebimento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
