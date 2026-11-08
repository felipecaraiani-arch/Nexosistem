import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  ArrowUpDown,
  Search,
  Filter,
  AlertTriangle,
  History,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  Tag
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

export default function Estoque({ initialFilter = null, onRefreshDashboard }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(initialFilter === 'low_stock');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [productHistory, setProductHistory] = useState([]);

  // Form State Produto
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Geral',
    cost_price: '',
    selling_price: '',
    stock_quantity: 0,
    min_stock: 5,
    shopee_item_id: '',
    notes: '',
    variations: []
  });

  // Form State Movimentação
  const [movementData, setMovementData] = useState({
    product_id: '',
    variation_id: '',
    type: 'ENTRY',
    quantity: '',
    unit_cost: '',
    unit_price: '',
    reason: '',
    reference_id: '',
    create_cashflow: false
  });

  const categories = ['Geral', 'Embalagens', 'Vestuário', 'Eletrônicos', 'Beleza', 'Casa & Decoração', 'Acessórios', 'Outros'];

  useEffect(() => {
    loadProducts();
  }, [search, filterLowStock, selectedCategory]);

  async function loadProducts() {
    try {
      setLoading(true);
      const params = {};
      if (search) params.q = search;
      if (filterLowStock) params.low_stock = 'true';
      if (selectedCategory) params.category = selectedCategory;

      const res = await api.getProducts(params);
      setProducts(res.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleRowExpand(id) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOpenCreateModal() {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: '',
      category: 'Geral',
      cost_price: '',
      selling_price: '',
      stock_quantity: 0,
      min_stock: 5,
      shopee_item_id: '',
      notes: '',
      variations: []
    });
    setIsProductModalOpen(true);
  }

  function handleOpenEditModal(prod) {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      barcode: prod.barcode || '',
      category: prod.category || 'Geral',
      cost_price: prod.cost_price || '',
      selling_price: prod.selling_price || '',
      stock_quantity: prod.stock_quantity,
      min_stock: prod.min_stock,
      shopee_item_id: prod.shopee_item_id || '',
      notes: prod.notes || '',
      variations: prod.variations ? prod.variations.map(v => ({ ...v })) : []
    });
    setIsProductModalOpen(true);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }
      setIsProductModalOpen(false);
      loadProducts();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm('Tem certeza que deseja excluir este produto e todo seu histórico de estoque?')) {
      return;
    }
    try {
      await api.deleteProduct(id);
      loadProducts();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleOpenMovementModal(prod = null) {
    const targetProd = prod || products[0];
    if (!targetProd) return;

    setSelectedProductForMovement(targetProd);
    setMovementData({
      product_id: targetProd.id,
      variation_id: targetProd.variations && targetProd.variations.length > 0 ? targetProd.variations[0].id : '',
      type: 'ENTRY',
      quantity: '',
      unit_cost: targetProd.cost_price,
      unit_price: targetProd.selling_price,
      reason: 'Entrada de compra de fornecedor',
      reference_id: '',
      create_cashflow: false
    });
    setIsMovementModalOpen(true);
  }

  async function handleSaveMovement(e) {
    e.preventDefault();
    if (!movementData.quantity || Number(movementData.quantity) <= 0) {
      alert('Informe uma quantidade válida!');
      return;
    }

    try {
      await api.addMovement(movementData.product_id, movementData);
      setIsMovementModalOpen(false);
      loadProducts();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleOpenHistoryModal(prod) {
    setSelectedProductForHistory(prod);
    try {
      const res = await api.getProduct(prod.id);
      setProductHistory(res.data.movements || []);
      setIsHistoryModalOpen(true);
    } catch (err) {
      alert(err.message);
    }
  }

  // Manipulação de Variações no Formulário
  function addVariation() {
    setFormData(prev => ({
      ...prev,
      variations: [
        ...prev.variations,
        {
          name: '',
          sku: `${prev.sku}-VAR${prev.variations.length + 1}`,
          cost_price: prev.cost_price,
          selling_price: prev.selling_price,
          stock_quantity: 0
        }
      ]
    }));
  }

  function removeVariation(index) {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }));
  }

  function updateVariation(index, field, value) {
    setFormData(prev => {
      const updated = [...prev.variations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variations: updated };
    });
  }

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Totais do Estoque Atual
  const totalItens = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  const totalCusto = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0);
  const totalVenda = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.selling_price || 0)), 0);
  const totalBaixo = products.filter(p => p.stock_quantity <= p.min_stock).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Controle de Estoque</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie os produtos, variações, SKUs Shopee e movimentações de entrada/saída.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenMovementModal()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
          >
            <ArrowUpDown size={16} /> Movimentar Estoque
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-[#ee4d2d] hover:bg-[#d94426] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Cadastrados</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{products.length} produtos</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Unidades em Estoque</div>
          <div className="text-xl font-bold text-blue-600 mt-1">{totalItens} un</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Valor a Preço de Custo</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(totalCusto)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Estoque Crítico (Alerta)</div>
          <div className={`text-xl font-bold mt-1 ${totalBaixo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {totalBaixo} produto(s)
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU Shopee ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-orange-500 bg-white"
          >
            <option value="">Todas as Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              filterLowStock
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={14} /> Estoque Baixo ({totalBaixo})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Produto & SKU</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Preço Custo</th>
                <th className="py-3 px-4">Preço Venda</th>
                <th className="py-3 px-4">Margem</th>
                <th className="py-3 px-4 text-center">Estoque Atual</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    Carregando estoque...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock_quantity <= p.min_stock;
                  const hasVariations = p.variations && p.variations.length > 0;
                  const isExpanded = expandedRows.has(p.id);
                  const margin = p.selling_price > 0
                    ? (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(0)
                    : 0;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-slate-50/60 transition-colors ${isLow ? 'bg-amber-50/25' : ''}`}>
                        <td className="py-3 px-4">
                          {hasVariations && (
                            <button
                              onClick={() => toggleRowExpand(p.id)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors cursor-pointer"
                              title="Ver variações"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded font-medium">
                              {p.sku}
                            </span>
                            {p.barcode && <span className="text-[11px] text-slate-400">Cód: {p.barcode}</span>}
                            {hasVariations && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                {p.variations.length} variações
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">{formatCurrency(p.cost_price)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{formatCurrency(p.selling_price)}</td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${Number(margin) >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                            isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {p.stock_quantity} un
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={11} /> Repor Estoque
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenMovementModal(p)}
                              className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="Movimentar estoque deste produto"
                            >
                              <ArrowUpDown size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenHistoryModal(p)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Histórico de movimentações"
                            >
                              <History size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar produto"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir produto"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-tabela de Variações */}
                      {hasVariations && isExpanded && (
                        <tr className="bg-slate-50/60 border-b border-slate-100">
                          <td colSpan="9" className="p-3 pl-12">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              Variações Shopee deste produto:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {p.variations.map(v => (
                                <div key={v.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-semibold text-slate-800">{v.name}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">SKU: {v.sku}</div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-slate-700">{v.stock_quantity} un</span>
                                    <div className="text-[10px] text-slate-400">{formatCurrency(v.selling_price || p.selling_price)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Cadastro / Edição de Produto */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Produto na Shopee *</label>
              <input
                type="text"
                required
                placeholder="Ex: Camiseta Básica Algodão Premium..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU do Produto *</label>
              <input
                type="text"
                required
                placeholder="Ex: CAM-BAS-01"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-orange-500 focus:outline-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preço de Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preço de Venda Shopee (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            {!editingProduct && (!formData.variations || formData.variations.length === 0) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque Inicial (unidades)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque Mínimo (Alerta de Reposição)</label>
              <input
                type="number"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Barras / EAN (Opcional)</label>
              <input
                type="text"
                placeholder="789..."
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shopee Item ID (Para sincronização futura)</label>
              <input
                type="text"
                placeholder="Opcional: ID na Shopee"
                value={formData.shopee_item_id}
                onChange={(e) => setFormData({ ...formData, shopee_item_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Variações (Cor, Tamanho) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-semibold text-slate-700">Variações do Produto (Shopee)</span>
                <p className="text-[11px] text-slate-400">Ex: Cor, Tamanho, Modelo com estoque individual</p>
              </div>
              <button
                type="button"
                onClick={addVariation}
                className="px-2.5 py-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
              >
                + Adicionar Variação
              </button>
            </div>

            {formData.variations.map((v, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <input
                  type="text"
                  placeholder="Nome (Ex: Preto / M)"
                  value={v.name}
                  onChange={(e) => updateVariation(idx, 'name', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                  required
                />
                <input
                  type="text"
                  placeholder="SKU da Variação"
                  value={v.sku}
                  onChange={(e) => updateVariation(idx, 'sku', e.target.value)}
                  className="w-36 px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                />
                {!editingProduct && (
                  <input
                    type="number"
                    placeholder="Estoque"
                    value={v.stock_quantity}
                    onChange={(e) => updateVariation(idx, 'stock_quantity', e.target.value)}
                    className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeVariation(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#ee4d2d] hover:bg-[#d94426] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Salvar Produto
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Movimentação de Estoque */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Movimentar Estoque"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Produto *</label>
            <select
              value={movementData.product_id}
              onChange={(e) => {
                const prod = products.find(p => p.id === Number(e.target.value));
                setSelectedProductForMovement(prod);
                setMovementData({
                  ...movementData,
                  product_id: e.target.value,
                  variation_id: prod?.variations?.length > 0 ? prod.variations[0].id : '',
                  unit_cost: prod?.cost_price || 0,
                  unit_price: prod?.selling_price || 0
                });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-orange-500 focus:outline-none"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.stock_quantity} un | SKU: {p.sku})
                </option>
              ))}
            </select>
          </div>

          {selectedProductForMovement?.variations?.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Variação (Opcional)</label>
              <select
                value={movementData.variation_id}
                onChange={(e) => setMovementData({ ...movementData, variation_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-orange-500 focus:outline-none"
              >
                <option value="">Produto Geral (Sem variação)</option>
                {selectedProductForMovement.variations.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Saldo: {v.stock_quantity} un)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Movimentação *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'ENTRY', label: 'Entrada (+)', desc: 'Compra / Reposição' },
                { id: 'EXIT', label: 'Saída (-)', desc: 'Avaria / Uso' },
                { id: 'SALE', label: 'Venda (-)', desc: 'Venda Shopee/Direta' },
                { id: 'ADJUSTMENT', label: 'Ajuste (=)', desc: 'Contagem Física' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMovementData({ ...movementData, type: t.id })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                    movementData.type === t.id
                      ? 'border-orange-500 bg-orange-50 text-[#ee4d2d] font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {movementData.type === 'ADJUSTMENT' ? 'Nova Quantidade Total *' : 'Quantidade *'}
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ex: 10"
                value={movementData.quantity}
                onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Referência / Pedido</label>
              <input
                type="text"
                placeholder="Ex: Pedido Shopee #123 ou NF 456"
                value={movementData.reference_id}
                onChange={(e) => setMovementData({ ...movementData, reference_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Observação</label>
            <input
              type="text"
              placeholder="Ex: Compra de estoque fornecedor, reposição de caixas, etc."
              value={movementData.reason}
              onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Opção de lançar venda no Caixa */}
          {movementData.type === 'SALE' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={movementData.create_cashflow}
                  onChange={(e) => setMovementData({ ...movementData, create_cashflow: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="text-xs font-semibold text-emerald-800">Lançar valor recebido direto no Fluxo de Caixa</span>
              </label>
              {movementData.create_cashflow && (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-emerald-800 mb-1">Valor Unitário da Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementData.unit_price}
                    onChange={(e) => setMovementData({ ...movementData, unit_price: e.target.value })}
                    className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Confirmar Movimentação
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Histórico de Movimentações */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Histórico de Movimentações: ${selectedProductForHistory?.name || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400">SKU:</span> <b className="font-mono text-orange-600">{selectedProductForHistory?.sku}</b>
            </div>
            <div>
              <span className="text-slate-400">Saldo Atual:</span> <b className="text-slate-800">{selectedProductForHistory?.stock_quantity} unidades</b>
            </div>
          </div>

          {productHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhuma movimentação registrada para este produto.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {productHistory.map(m => {
                const isPositive = m.type === 'ENTRY' || (m.type === 'ADJUSTMENT' && m.new_stock > m.previous_stock);
                return (
                  <div key={m.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {m.type === 'ENTRY' ? 'Entrada (+)' : m.type === 'EXIT' ? 'Saída (-)' : m.type === 'SALE' ? 'Venda (-)' : 'Ajuste de Estoque'}
                          {m.variation_name ? ` • Variação: ${m.variation_name}` : ''}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {m.reason || 'Sem descrição'} {m.reference_id ? `• Ref: ${m.reference_id}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : '-'}{m.quantity} un
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {m.previous_stock} → {m.new_stock} un • {m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
