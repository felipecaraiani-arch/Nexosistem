import React, { useState, useEffect } from 'react';
import {
  ArrowDownCircle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  DollarSign
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

export default function ContasPagar({ onRefreshDashboard }) {
  const [payables, setPayables] = useState([]);
  const [totals, setTotals] = useState({ totalPendente: 0, totalPago: 0, totalVencido: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState(null);
  const [payableToPay, setPayableToPay] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    category: 'Fornecedor',
    supplier: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'Boleto',
    notes: ''
  });

  const [payData, setPayData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'PIX'
  });

  const categories = [
    'Fornecedor / Mercadoria',
    'Embalagens',
    'Frete / Correios / Coleta',
    'Taxas & Impostos',
    'Operacional & Ferramentas',
    'Outros'
  ];

  const paymentMethods = ['PIX', 'Boleto Bancário', 'Cartão de Crédito', 'Transferência (TED)', 'Dinheiro'];

  useEffect(() => {
    loadPayables();
  }, [statusFilter, selectedMonth, search]);

  async function loadPayables() {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (selectedMonth) params.month = selectedMonth;
      if (search) params.supplier = search;

      const res = await api.getPayables(params);
      setPayables(res.data);
      setTotals(res.totals || { totalPendente: 0, totalPago: 0, totalVencido: 0 });
    } catch (err) {
      console.error('Erro ao carregar contas a pagar:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateModal() {
    setEditingPayable(null);
    setFormData({
      description: '',
      category: 'Fornecedor / Mercadoria',
      supplier: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      payment_method: 'Boleto',
      notes: ''
    });
    setIsModalOpen(true);
  }

  function handleOpenEditModal(p) {
    setEditingPayable(p);
    setFormData({
      description: p.description,
      category: p.category,
      supplier: p.supplier || '',
      amount: p.amount,
      due_date: p.due_date,
      payment_method: p.payment_method || 'Boleto',
      notes: p.notes || ''
    });
    setIsModalOpen(true);
  }

  async function handleSavePayable(e) {
    e.preventDefault();
    try {
      if (editingPayable) {
        await api.updatePayable(editingPayable.id, formData);
      } else {
        await api.createPayable(formData);
      }
      setIsModalOpen(false);
      loadPayables();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleOpenPayModal(p) {
    setPayableToPay(p);
    setPayData({
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: p.payment_method || 'PIX'
    });
    setIsPayModalOpen(true);
  }

  async function handleConfirmPay(e) {
    e.preventDefault();
    if (!payableToPay) return;
    try {
      await api.payAccount(payableToPay.id, payData);
      setIsPayModalOpen(false);
      loadPayables();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeletePayable(id) {
    if (!window.confirm('Excluir esta conta a pagar? Se estiver paga, a saída será estornada do fluxo de caixa.')) {
      return;
    }
    try {
      await api.deletePayable(id);
      loadPayables();
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Contas a Pagar</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle de despesas, compras de produtos, embalagens e custos da sua loja Shopee.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <Plus size={16} /> Nova Conta a Pagar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Total Pendente (Mês)</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(totals.totalPendente)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Aguardando liquidação</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Total Vencido (Atrasadas)</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(totals.totalVencido)}
          </div>
          <p className="text-xs text-rose-500 mt-1">Necessitam pagamento imediato</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Total Pago (Mês)</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totals.totalPago)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Já debitadas do fluxo de caixa</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Mês Filter */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none"
          />

          {/* Status Filter */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'PENDING', label: 'Pendentes' },
              { id: 'OVERDUE', label: 'Vencidas' },
              { id: 'PAID', label: 'Pagas' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === s.id ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payables Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Descrição & Fornecedor</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Forma Pagto</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    Carregando contas...
                  </td>
                </tr>
              ) : payables.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    Nenhuma conta a pagar encontrada.
                  </td>
                </tr>
              ) : (
                payables.map((p) => {
                  const isPaid = p.status === 'PAID';
                  const isOverdue = p.effective_status === 'OVERDUE';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.description}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {p.supplier ? `Fornecedor: ${p.supplier}` : 'Sem fornecedor especificado'}
                          {p.notes ? ` • Obs: ${p.notes}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          {p.due_date.split('-').reverse().join('/')}
                        </span>
                        {isPaid && p.payment_date && (
                          <div className="text-[10px] text-emerald-600">Pago em: {p.payment_date.split('-').reverse().join('/')}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p.payment_method || '-'}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Pago
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full animate-pulse">
                            <AlertTriangle size={12} /> Vencida
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <Clock size={12} /> A Pagar
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid ? (
                            <button
                              onClick={() => handleOpenPayModal(p)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign size={13} /> Pagar
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-2">Liquidado</span>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePayable(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Nova / Editar Conta a Pagar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPayable ? 'Editar Conta a Pagar' : 'Cadastrar Conta a Pagar'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSavePayable} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição da Despesa *</label>
            <input
              type="text"
              required
              placeholder="Ex: Compra de 200 Caixas de Envio, Bobina de Etiquetas..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-rose-500 focus:outline-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fornecedor / Favorecido</label>
              <input
                type="text"
                placeholder="Ex: Fornecedor ABC..."
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Vencimento *</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Forma de Pagamento Prevista</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-rose-500 focus:outline-none"
            >
              {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações (Opcional)</label>
            <textarea
              rows="2"
              placeholder="Ex: Número do pedido com fornecedor, chave pix, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-rose-500 focus:outline-none"
            ></textarea>
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Salvar Conta
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Dar Baixa (Pagar) */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Confirmar Pagamento"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmPay} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs">
            <div className="text-slate-500">Conta a liquidar:</div>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{payableToPay?.description}</div>
            <div className="text-rose-600 font-extrabold text-lg mt-1">{formatCurrency(payableToPay?.amount)}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data Efetiva do Pagamento *</label>
            <input
              type="date"
              required
              value={payData.payment_date}
              onChange={(e) => setPayData({ ...payData, payment_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Forma de Pagamento Utilizada</label>
            <select
              value={payData.payment_method}
              onChange={(e) => setPayData({ ...payData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-emerald-500 focus:outline-none"
            >
              {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>Ao confirmar, este valor será automaticamente debitado do seu <b>Fluxo de Caixa</b> com a data informada.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Confirmar e Debitar do Caixa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
