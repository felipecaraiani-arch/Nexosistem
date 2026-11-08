import React, { useState, useEffect } from 'react';
import {
  Store,
  Key,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ExternalLink,
  Play,
  ShoppingBag,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function ShopeeConfig({ onRefreshDashboard }) {
  const [config, setConfig] = useState({
    partner_id: '',
    partner_key: '',
    partner_key_masked: '',
    shop_id: '',
    auto_sync_stock: false,
    is_connected: false,
    last_sync_at: 'Aguardando configuração'
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Simulador de venda Shopee
  const [simProduct, setSimProduct] = useState('');
  const [simQty, setSimQty] = useState(1);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [cfgRes, prodRes] = await Promise.all([
        api.getShopeeConfig(),
        api.getProducts()
      ]);
      setConfig(prev => ({
        ...prev,
        ...cfgRes.data,
        partner_key: ''
      }));
      setProducts(prodRes.data || []);
      if (prodRes.data?.length > 0) {
        setSimProduct(prodRes.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da Shopee:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.saveShopeeConfig(config);
      setMessage({ type: 'success', text: res.message });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSimulateSale(e) {
    e.preventDefault();
    if (!simProduct) {
      alert('Cadastre um produto antes de simular!');
      return;
    }

    try {
      setSimLoading(true);
      setSimResult(null);
      const res = await api.simulateSale({
        product_id: simProduct,
        quantity: simQty
      });
      setSimResult(res);
      loadData();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setSimLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Integração Shopee Open Platform</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#ee4d2d]">
              API v2.0 Pronta
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Estrutura técnica 100% preparada para conectar diretamente com a sua loja Shopee quando você quiser.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Modo Manual (Aguardando Chaves API)</span>
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl p-6">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Store size={20} className="text-[#ee4d2d]" />
          Como vai funcionar quando você decidir ativar a API?
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Você não precisará mexer em nenhum código ou banco de dados! O ERP já foi construído com as tabelas, SKUs, identificadores de pedido (`order_sn`) e lógica de repasse calculada.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-sm">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px]">1</span>
              Cadastro de Chaves
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Você cria sua conta de desenvolvedor no <b>Shopee Open Platform</b> e gera seu Partner ID e Partner Key.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-sm">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px]">2</span>
              Autorização da Loja
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              O ERP gera o link oficial da Shopee onde você faz login com a conta da sua loja e autoriza a leitura de pedidos e estoque.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-sm">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px]">3</span>
              Sincronização 100% Automática
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Cada pedido vendido na Shopee dará baixa automática no estoque do ERP e criará a entrada no seu Contas a Receber.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Configuração das Chaves Shopee */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
            <Key size={18} className="text-orange-600" />
            Credenciais do Shopee Open Platform
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Quando estiver pronto para conectar, preencha as chaves abaixo:
          </p>

          {message && (
            <div className={`p-3 rounded-xl mb-4 text-xs font-medium ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Partner ID (Shopee)</label>
              <input
                type="text"
                placeholder="Ex: 1002345"
                value={config.partner_id}
                onChange={(e) => setConfig({ ...config, partner_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Partner Key (Chave Secreta Shopee)</label>
              <input
                type="password"
                placeholder={config.partner_key_masked || "Digite a chave secreta..."}
                value={config.partner_key}
                onChange={(e) => setConfig({ ...config, partner_key: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-mono"
              />
              {config.partner_key_masked && (
                <div className="text-[10px] text-slate-400 mt-1">Chave atual salva: {config.partner_key_masked}</div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shop ID (ID da sua Loja Shopee)</label>
              <input
                type="text"
                placeholder="Ex: 298374921"
                value={config.shop_id}
                onChange={(e) => setConfig({ ...config, shop_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.auto_sync_stock}
                  onChange={(e) => setConfig({ ...config, auto_sync_stock: e.target.checked })}
                  className="rounded text-orange-600"
                />
                <span className="font-semibold text-slate-700">Atualizar estoque automaticamente ao receber pedidos Shopee</span>
              </label>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">URL do Webhook do ERP:</span>
              <div className="font-mono bg-white p-1.5 mt-1 border border-slate-200 rounded text-slate-600 select-all">
                http://localhost:3000/api/shopee/webhook
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-[#ee4d2d] hover:bg-[#d94426] text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações da Shopee'}
              </button>
            </div>
          </form>
        </div>

        {/* Simulador de Venda Shopee (Demonstração Prática) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                Simulador de Venda Shopee
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Teste Imediato
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Teste agora mesmo como o ERP se comportará quando sua loja Shopee enviar um novo pedido:
            </p>

            <form onSubmit={handleSimulateSale} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Selecione o Produto Vendido *</label>
                <select
                  value={simProduct}
                  onChange={(e) => setSimProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-orange-500 focus:outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Saldo Atual: {p.stock_quantity} un | Preço: R$ {p.selling_price?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantidade Vendida *</label>
                <input
                  type="number"
                  min="1"
                  value={simQty}
                  onChange={(e) => setSimQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="p-4 bg-orange-50/60 border border-orange-100 rounded-xl text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-orange-900">Ao clicar em simular, o ERP fará:</div>
                <div>1. Redução imediata de {simQty} unidade(s) do saldo em estoque.</div>
                <div>2. Registro de auditoria no histórico de movimentações.</div>
                <div>3. Criação automática da conta a receber com desconto da comissão Shopee (~14% + R$4).</div>
              </div>

              <button
                type="submit"
                disabled={simLoading || products.length === 0}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={14} /> {simLoading ? 'Processando...' : 'Executar Simulação de Venda Shopee'}
              </button>
            </form>
          </div>

          {/* Resultado da Simulação */}
          {simResult && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Sucesso! Venda Shopee Processada:
              </div>
              <div className="text-emerald-900">{simResult.message}</div>
              <div className="text-[11px] text-slate-600 pt-1 font-mono">
                Código Pedido: <b>#{simResult.order_sn}</b> | Valor Líquido: <b>R$ {simResult.net_amount?.toFixed(2)}</b>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
