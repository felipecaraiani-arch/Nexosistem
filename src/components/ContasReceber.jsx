import React, { useState, useEffect } from 'react';
import {
  ArrowUpCircle,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  DollarSign,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

export default function ContasReceber({ onRefreshDashboard }) {
  const [receivables, setReceivables] = useState([]);
  const [totals, setTotals] = useState({ totalPendente: 0, totalRecebido: 0, totalShopeePendente: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [originFilter, setOriginFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState(null);
  const [receivableToReceive, setReceivableToReceive] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    origin: 'SHOPEE',
    customer: '',
    order_sn: '',
    amount: '',
    gross_amount: '',
    shopee_fee: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    payment_method: 'Shopee Repasse',
    notes: ''
  });

  const [receiveData, setReceiveData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    payment_method: 'Shopee Repasse'
  });

  useEffect(() => {
    loadReceivables();
  }, [statusFilter, originFilter, selectedMonth, search]);

  async function loadReceivables() {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (originFilter !== 'ALL') params.origin = originFilter;
      if (selectedMonth) params.month = selectedMonth;
      if (search) params.q = search;

      const res = await api.getReceivables(params);
      setReceivables(res.data);
      setTotals(res.totals || { totalPendente: 0, totalRecebido: 0, totalShopeePendente: 0 });
    } catch (err) {
      console.error('Erro ao carregar contas a receber:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateModal() {
    setEditingReceivable(null);
    setFormData({
      description: '',
      origin: 'SHOPEE',
      customer: '',
      order_sn: `24${Date.now().toString().slice(-8)}`,
      amount: '',
      gross_amount: '',
      shopee_fee: '',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      payment_method: 'Shopee Repasse',
      notes: ''
    });
    setIsModalOpen(true);
  }

  function handleOpenEditModal(r) {
    setEditingReceivable(r);
    setFormData({
      description: r.description,
      origin: r.origin || 'SHOPEE',
      customer: r.customer || '',
      order_sn: r.order_sn || '',
      amount: r.amount,
      gross_amount: r.gross_amount || r.amount,
      shopee_fee: r.shopee_fee || 0,
      due_date: r.due_date,
      payment_method: r.payment_method || 'Shopee Repasse',
      notes: r.notes || ''
    });
    setIsModalOpen(true);
  }

  // Auto cálculo de taxa Shopee e valor líquido
  function handleGrossAmountChange(val) {
    const gross = Number(val) || 0;
    // Estimativa de taxa padrão Shopee (~14% + R$ 4)
    const fee = gross > 0 ? +(gross * 0.14 + 4.0).toFixed(2) : 0;
    const net = gross > 0 ? +(gross - fee).toFixed(2) : 0;

    setFormData(prev => ({
      ...prev,
      gross_amount: val,
      shopee_fee: prev.origin === 'SHOPEE' ? fee : 0,
      amount: prev.origin === 'SHOPEE' ? net : val
    }));
  }

  async function handleSaveReceivable(e) {
    e.preventDefault();
    try {
      if (editingReceivable) {
        await api.updateReceivable(editingReceivable.id, formData);
      } else {
        await api.createReceivable(formData);
      }
      setIsModalOpen(false);
      loadReceivables();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleOpenReceiveModal(r) {
    setReceivableToReceive(r);
    setReceiveData({
      received_date: new Date().toISOString().split('T')[0],
      payment_method: r.payment_method || 'Shopee Repasse'
    });
    setIsReceiveModalOpen(true);
  }

  async function handleConfirmReceive(e) {
    e.preventDefault();
    if (!receivableToReceive) return;
    try {
      await api.receiveAccount(receivableToReceive.id, receiveData);
      setIsReceiveModalOpen(false);
      loadReceivables();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteReceivable(id) {
    if (!window.confirm('Excluir este lançamento a receber? Se já tiver sido recebido, a entrada será estornada do fluxo de caixa.')) {
      return;
    }
    try {
      await api.deleteReceivable(id);
      loadReceivables();
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Contas a Receber</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhamento de repasses de vendas da Shopee, previsões de pagamento e vendas diretas.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-[#ee4d2d] hover:bg-[#d94426] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <Plus size={16} /> Nova Conta a Receber
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Total a Receber (Geral)</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(totals.totalPendente)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Previsão total pendente</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Repasses Shopee Pendentes</span>
            <ShoppingBag size={16} className="text-[#ee4d2d]" />
          </div>
          <div className="text-2xl font-bold text-[#ee4d2d]">
            {formatCurrency(totals.totalShopeePendente)}
          </div>
          <p className="text-xs text-orange-600/80 mt-1">Aguardando ciclo de liberação Shopee</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Total Já Recebido (Mês)</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totals.totalRecebido)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Creditados no fluxo de caixa</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, pedido Shopee ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Mês Filter */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none"
          />

          {/* Origem Filter */}
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white focus:outline-none"
          >
            <option value="ALL">Todas as Origens</option>
            <option value="SHOPEE">Somente Shopee</option>
            <option value="DIRETA">Vendas Diretas</option>
          </select>

          {/* Status Filter */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'PENDING', label: 'A Receber' },
              { id: 'RECEIVED', label: 'Recebidos' }
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

      {/* Receivables Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Descrição & Pedido</th>
                <th className="py-3 px-4">Canal / Origem</th>
                <th className="py-3 px-4">Data Prevista</th>
                <th className="py-3 px-4">Valor Bruto</th>
                <th className="py-3 px-4">Taxa Retida</th>
                <th className="py-3 px-4">Valor Líquido</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Carregando contas a receber...
                  </td>
                </tr>
              ) : receivables.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Nenhum recebimento encontrado.
                  </td>
                </tr>
              ) : (
                receivables.map((r) => {
                  const isReceived = r.status === 'RECEIVED';
                  const isShopee = r.origin === 'SHOPEE';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{r.description}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          {r.order_sn && (
                            <span className="font-mono text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded font-medium">
                              #{r.order_sn}
                            </span>
                          )}
                          {r.customer && <span>Cliente: {r.customer}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isShopee ? (
                          <span className="inline-flex items-center gap-1 bg-orange-50 text-[#ee4d2d] border border-orange-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                            <ShoppingBag size={11} /> Shopee
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px]">
                            {r.origin || 'Direta'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">
                          {r.due_date.split('-').reverse().join('/')}
                        </span>
                        {isReceived && r.received_date && (
                          <div className="text-[10px] text-emerald-600">Creditado em: {r.received_date.split('-').reverse().join('/')}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {r.gross_amount ? formatCurrency(r.gross_amount) : '-'}
                      </td>
                      <td className="py-3 px-4 text-rose-500 font-medium">
                        {r.shopee_fee ? `-${formatCurrency(r.shopee_fee)}` : '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700 text-sm">
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isReceived ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Recebido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <Clock size={12} /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isReceived ? (
                            <button
                              onClick={() => handleOpenReceiveModal(r)}
                              className="px-3 py-1 bg-[#ee4d2d] hover:bg-[#d94426] text-white rounded-lg font-medium text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign size={13} /> Receber
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-2">Creditado</span>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteReceivable(r.id)}
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

      {/* MODAL: Nova / Editar Conta a Receber */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReceivable ? 'Editar Conta a Receber' : 'Cadastrar Conta a Receber (Venda / Repasse)'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveReceivable} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Origem da Venda *</label>
              <select
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-orange-500 focus:outline-none"
              >
                <option value="SHOPEE">Shopee (Marketplace)</option>
                <option value="DIRETA">Venda Direta / WhatsApp</option>
                <option value="OUTROS">Outro Canal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cód. Pedido Shopee / Ref</label>
              <input
                type="text"
                placeholder="Ex: 240501X991A"
                value={formData.order_sn}
                onChange={(e) => setFormData({ ...formData, order_sn: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição do Recebimento *</label>
            <input
              type="text"
              required
              placeholder="Ex: Repasse Pedido Shopee - 2x Camiseta Algodão..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Bruto (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.gross_amount}
                onChange={(e) => handleGrossAmountChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Taxa Shopee (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.shopee_fee}
                onChange={(e) => setFormData({ ...formData, shopee_fee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-rose-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Líquido a Receber *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Previsão de Repasse / Data *</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Comprador / Cliente</label>
              <input
                type="text"
                placeholder="Ex: João da Silva..."
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações (Opcional)</label>
            <textarea
              rows="2"
              placeholder="Ex: Código de rastreio, notas fiscais, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
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
              className="px-5 py-2 bg-[#ee4d2d] hover:bg-[#d94426] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Salvar Conta
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Dar Baixa (Receber) */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title="Confirmar Recebimento de Repasse"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmReceive} className="space-y-4">
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs">
            <div className="text-slate-500">Repasse a creditar:</div>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{receivableToReceive?.description}</div>
            <div className="text-emerald-600 font-extrabold text-lg mt-1">{formatCurrency(receivableToReceive?.amount)}</div>
            {receivableToReceive?.order_sn && (
              <div className="text-[11px] text-slate-500 font-mono mt-1">Pedido Shopee #{receivableToReceive.order_sn}</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data Efetiva do Crédito *</label>
            <input
              type="date"
              required
              value={receiveData.received_date}
              onChange={(e) => setReceiveData({ ...receiveData, received_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Canal de Recebimento</label>
            <select
              value={receiveData.payment_method}
              onChange={(e) => setReceiveData({ ...receiveData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="Shopee Repasse">Shopee Repasse (Conta Bancária)</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Transferência">Transferência Bancária</option>
            </select>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>Ao confirmar, este valor será creditado como <b>Entrada</b> no seu <b>Fluxo de Caixa</b> com a data selecionada.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReceiveModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#ee4d2d] hover:bg-[#d94426] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Confirmar e Creditar no Caixa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
