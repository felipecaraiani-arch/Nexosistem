import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  DollarSign,
  PieChart,
  Trash2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

export default function FluxoCaixa({ onRefreshDashboard }) {
  const [cashFlow, setCashFlow] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    saldoPeriodo: 0,
    saldoGeral: 0,
    categoriesIncome: [],
    categoriesExpense: []
  });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // Modal Lançamento Avulso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    category: 'Operacional',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'PIX',
    notes: ''
  });

  const categoriesExpense = [
    'Fornecedor / Mercadoria',
    'Embalagens',
    'Frete / Coleta Shopee',
    'Taxas & Impostos',
    'Operacional',
    'Pró-labore / Retirada',
    'Outros'
  ];

  const categoriesIncome = [
    'Repasse Shopee',
    'Venda Direta',
    'Aporte de Capital',
    'Reembolso',
    'Outras Receitas'
  ];

  useEffect(() => {
    loadCashFlow();
  }, [typeFilter, categoryFilter, selectedMonth]);

  async function loadCashFlow() {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (selectedMonth) params.month = selectedMonth;

      const res = await api.getCashFlow(params);
      setCashFlow(res.data);
      setSummary(res.summary || {
        totalIncome: 0,
        totalExpense: 0,
        saldoPeriodo: 0,
        saldoGeral: 0,
        categoriesIncome: [],
        categoriesExpense: []
      });
    } catch (err) {
      console.error('Erro ao carregar fluxo de caixa:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateModal() {
    setFormData({
      type: 'EXPENSE',
      category: 'Operacional',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'PIX',
      notes: ''
    });
    setIsModalOpen(true);
  }

  async function handleSaveEntry(e) {
    e.preventDefault();
    try {
      await api.createCashEntry(formData);
      setIsModalOpen(false);
      loadCashFlow();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteEntry(id) {
    if (!window.confirm('Excluir este lançamento do caixa? Se ele foi gerado a partir de um Contas a Pagar ou Receber, o status da conta voltará para Pendente.')) {
      return;
    }
    try {
      await api.deleteCashEntry(id);
      loadCashFlow();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fluxo de Caixa</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão consolidada de todas as entradas e saídas de dinheiro da sua operação.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <Plus size={16} /> Novo Lançamento Avulso
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Geral */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Saldo Geral Acumulado</span>
            <Wallet size={16} className="text-emerald-500" />
          </div>
          <div className={`text-2xl font-bold ${summary.saldoGeral >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            {formatCurrency(summary.saldoGeral)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Saldo real total disponível</p>
        </div>

        {/* Entradas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Entradas no Período</span>
            <ArrowUpRight size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            +{formatCurrency(summary.totalIncome)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Repasses e vendas recebidas</p>
        </div>

        {/* Saídas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Saídas no Período</span>
            <ArrowDownLeft size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            -{formatCurrency(summary.totalExpense)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Despesas e pagamentos efetuados</p>
        </div>

        {/* Resultado Operacional */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Resultado Operacional</span>
            {summary.saldoPeriodo >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
          </div>
          <div className={`text-2xl font-bold ${summary.saldoPeriodo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(summary.saldoPeriodo)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {summary.saldoPeriodo >= 0 ? 'Lucro operacional no período' : 'Déficit no período'}
          </p>
        </div>
      </div>

      {/* Despesas por Categoria (Mini Analytics) */}
      {summary.categoriesExpense && summary.categoriesExpense.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <PieChart size={16} className="text-orange-600" />
            Para onde foi o dinheiro este mês (Despesas por Categoria):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {summary.categoriesExpense.map((c, i) => {
              const pct = summary.totalExpense > 0 ? ((c.total / summary.totalExpense) * 100).toFixed(1) : 0;
              return (
                <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{c.category}</span>
                    <span className="font-bold text-rose-600">{formatCurrency(c.total)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div style={{ width: `${pct}%` }} className="bg-rose-500 h-1.5 rounded-full"></div>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right mt-1">{pct}% das despesas</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Mês Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
            {[
              { id: 'ALL', label: 'Tudo' },
              { id: 'INCOME', label: 'Entradas (+)' },
              { id: 'EXPENSE', label: 'Saídas (-)' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  typeFilter === t.id ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Mostrando {cashFlow.length} lançamento(s)
        </div>
      </div>

      {/* Cash Flow Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Forma Pagto</th>
                <th className="py-3 px-4">Origem / Referência</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    Carregando extrato...
                  </td>
                </tr>
              ) : cashFlow.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    Nenhum lançamento no período selecionado.
                  </td>
                </tr>
              ) : (
                cashFlow.map((item) => {
                  const isIncome = item.type === 'INCOME';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.description}</div>
                        {item.notes && <div className="text-[11px] text-slate-400">{item.notes}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.payment_method || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-slate-500">
                          {item.reference_type === 'PAYABLE' && 'Conta a Pagar Quitado'}
                          {item.reference_type === 'RECEIVABLE' && 'Repasse Recebido'}
                          {item.reference_type === 'SHOPEE_SALE' && 'Venda Shopee'}
                          {item.reference_type === 'MANUAL' && 'Lançamento Manual'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm">
                        <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteEntry(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir lançamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Novo Lançamento Avulso */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Lançamento Avulso no Caixa"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Lançamento *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'INCOME', category: 'Outras Receitas' })}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition-colors cursor-pointer ${
                  formData.type === 'INCOME'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight size={16} /> Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: 'Operacional' })}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition-colors cursor-pointer ${
                  formData.type === 'EXPENSE'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft size={16} /> Saída (-)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição *</label>
            <input
              type="text"
              required
              placeholder={formData.type === 'INCOME' ? 'Ex: Aporte, venda avulsa...' : 'Ex: Tarifa bancária, lanche da equipe...'}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-slate-800 focus:outline-none"
              >
                {(formData.type === 'INCOME' ? categoriesIncome : categoriesExpense).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Forma de Pagamento</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-slate-800 focus:outline-none"
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
                <option value="Transferência">Transferência</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações (Opcional)</label>
            <input
              type="text"
              placeholder="Detalhes adicionais..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
