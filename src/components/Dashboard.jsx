import React from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export default function Dashboard({ data, onNavigate, onQuickPay, onQuickReceive, onQuickStockMovement }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const { financeiro, estoque, ultimasMovimentacoes, proximosAPagar, proximosAReceber, chartData } = data;

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const maxChartValue = Math.max(
    ...chartData.map(d => Math.max(d.entradas, d.saidas)),
    50
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Controle</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhe o desempenho do seu estoque e fluxo de caixa da sua operação Shopee.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
          <Calendar size={14} className="text-slate-400" />
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo de Caixa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Atual em Caixa</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(financeiro.saldoAtual)}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Mês: <span className="font-semibold text-emerald-600">+{formatCurrency(financeiro.cashIncomeMonth)}</span></span>
            <span><span className="font-semibold text-rose-500">-{formatCurrency(financeiro.cashExpenseMonth)}</span></span>
          </div>
        </div>

        {/* Card 2: Contas a Pagar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contas a Pagar</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownCircle size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(financeiro.aPagarMes)}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Hoje: <b>{formatCurrency(financeiro.aPagarHoje)}</b></span>
            {financeiro.aPagarAtrasadoCount > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> {financeiro.aPagarAtrasadoCount} atrasada(s)
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">Em dia</span>
            )}
          </div>
        </div>

        {/* Card 3: Contas a Receber */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">A Receber (Shopee)</span>
            <div className="p-2 bg-orange-50 text-[#ee4d2d] rounded-xl">
              <ArrowUpCircle size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(financeiro.aReceberMes)}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Hoje: <b>{formatCurrency(financeiro.aReceberHoje)}</b></span>
            <span>Pendente Shopee: <b>{formatCurrency(financeiro.aReceberShopee)}</b></span>
          </div>
        </div>

        {/* Card 4: Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estoque Geral</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Package size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {estoque.totalItensEstoque} <span className="text-sm font-normal text-slate-400">unidades</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Custo Total: <b>{formatCurrency(estoque.totalCustoEstoque)}</b></span>
            {estoque.countEstoqueBaixo > 0 ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> {estoque.countEstoqueBaixo} baixo(s)
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">Estoque OK</span>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Estoque Baixo (se houver) */}
      {estoque.countEstoqueBaixo > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Atenção: Produtos com estoque crítico para envio Shopee</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Existem {estoque.countEstoqueBaixo} produto(s) abaixo da quantidade mínima recomendada. Evite cancelamentos de pedidos na Shopee por falta de estoque.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {estoque.produtosEstoqueBaixo.slice(0, 4).map(p => (
                  <span key={p.id} className="text-[11px] bg-white border border-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-medium">
                    {p.name.slice(0, 28)}...: <b>{p.stock_quantity} un</b> (Mín: {p.min_stock})
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('estoque', { filter: 'low_stock' })}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
          >
            Ver Produtos em Alerta <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Gráfico de Fluxo de Caixa (14 dias) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Fluxo de Caixa (Últimos 14 dias)</h3>
            <p className="text-xs text-slate-400">Comparativo diário de Entradas (créditos) e Saídas (débitos)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
              <span className="text-slate-600">Entradas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-rose-400 rounded-sm"></span>
              <span className="text-slate-600">Saídas</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-44 flex items-end gap-2 pt-6 border-b border-slate-100">
          {chartData.map((d, idx) => {
            const incHeight = maxChartValue > 0 ? (d.entradas / maxChartValue) * 100 : 0;
            const expHeight = maxChartValue > 0 ? (d.saidas / maxChartValue) * 100 : 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute -top-12 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                  <div>Dia: {d.label}</div>
                  <div className="text-emerald-300">+{formatCurrency(d.entradas)}</div>
                  <div className="text-rose-300">-{formatCurrency(d.saidas)}</div>
                </div>
                {/* Dual Bars */}
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    style={{ height: `${Math.max(incHeight, d.entradas > 0 ? 8 : 2)}%` }}
                    className={`w-1/2 rounded-t-sm transition-all ${
                      d.entradas > 0 ? 'bg-emerald-500' : 'bg-slate-100'
                    }`}
                  ></div>
                  <div
                    style={{ height: `${Math.max(expHeight, d.saidas > 0 ? 8 : 2)}%` }}
                    className={`w-1/2 rounded-t-sm transition-all ${
                      d.saidas > 0 ? 'bg-rose-400' : 'bg-slate-100'
                    }`}
                  ></div>
                </div>
                {/* X Axis Label */}
                <span className="text-[10px] text-slate-400 font-medium">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Próximos Pagamentos & Próximos Repasses Shopee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Contas a Pagar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <ArrowDownCircle size={18} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Próximas Contas a Pagar</h3>
            </div>
            <button
              onClick={() => onNavigate('pagar')}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              Ver todas <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {proximosAPagar.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhuma conta pendente para os próximos dias. Parabéns!
              </div>
            ) : (
              proximosAPagar.map(p => {
                const isOverdue = p.due_date < new Date().toISOString().split('T')[0];
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{p.description}</div>
                      <div className="text-slate-400 mt-0.5">
                        {p.supplier ? `${p.supplier} • ` : ''}Vencimento: <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>{p.due_date.split('-').reverse().join('/')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{formatCurrency(p.amount)}</span>
                      <button
                        onClick={() => onQuickPay(p)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Próximos Repasses Shopee / Contas a Receber */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 text-[#ee4d2d] rounded-lg">
                <ArrowUpCircle size={18} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Próximos Repasses a Receber</h3>
            </div>
            <button
              onClick={() => onNavigate('receber')}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              Ver todos <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {proximosAReceber.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhum repasse pendente para os próximos dias.
              </div>
            ) : (
              proximosAReceber.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{r.description}</div>
                    <div className="text-slate-400 mt-0.5">
                      {r.order_sn ? `Pedido #${r.order_sn} • ` : ''}Previsão: {r.due_date.split('-').reverse().join('/')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600">{formatCurrency(r.amount)}</span>
                    <button
                      onClick={() => onQuickReceive(r)}
                      className="px-2.5 py-1 bg-[#ee4d2d] hover:bg-[#d94426] text-white rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Receber
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
