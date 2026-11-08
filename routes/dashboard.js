const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // 'YYYY-MM'

    // 1. Saldo em Caixa
    const cashIncome = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'INCOME'")?.total || 0;
    const cashExpense = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'EXPENSE'")?.total || 0;
    const saldoAtual = cashIncome - cashExpense;

    // Entradas e Saídas do Mês Atual
    const cashIncomeMonth = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'INCOME' AND date LIKE ?", [`${currentMonth}%`])?.total || 0;
    const cashExpenseMonth = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'EXPENSE' AND date LIKE ?", [`${currentMonth}%`])?.total || 0;

    // 2. Contas a Pagar
    const aPagarTotal = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE status = 'PENDING'")?.total || 0;
    const aPagarHoje = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE status = 'PENDING' AND due_date = ?", [today])?.total || 0;
    const aPagarMes = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE status = 'PENDING' AND due_date LIKE ?", [`${currentMonth}%`])?.total || 0;
    const aPagarAtrasado = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM payables WHERE status = 'PENDING' AND due_date < ?", [today]) || { total: 0, count: 0 };

    // 3. Contas a Receber (Repasses Shopee / Geral)
    const aReceberTotal = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'PENDING'")?.total || 0;
    const aReceberHoje = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'PENDING' AND due_date = ?", [today])?.total || 0;
    const aReceberMes = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'PENDING' AND due_date LIKE ?", [`${currentMonth}%`])?.total || 0;
    const aReceberShopee = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'PENDING' AND origin = 'SHOPEE'")?.total || 0;

    // 4. Estoque
    const totalItensEstoque = db.queryOne("SELECT COALESCE(SUM(stock_quantity), 0) as total FROM products")?.total || 0;
    const totalCustoEstoque = db.queryOne("SELECT COALESCE(SUM(stock_quantity * cost_price), 0) as total FROM products")?.total || 0;
    const totalVendaEstoque = db.queryOne("SELECT COALESCE(SUM(stock_quantity * selling_price), 0) as total FROM products")?.total || 0;
    
    // Alertas de Estoque Baixo
    const produtosEstoqueBaixo = db.query("SELECT id, name, sku, stock_quantity, min_stock, cost_price, selling_price FROM products WHERE stock_quantity <= min_stock ORDER BY stock_quantity ASC LIMIT 10");
    const countEstoqueBaixo = db.queryOne("SELECT COUNT(*) as total FROM products WHERE stock_quantity <= min_stock")?.total || 0;

    // 5. Últimas Movimentações de Estoque
    const ultimasMovimentacoes = db.query(`
      SELECT m.*, p.name as product_name, p.sku as product_sku, v.name as variation_name
      FROM stock_movements m
      JOIN products p ON m.product_id = p.id
      LEFT JOIN product_variations v ON m.variation_id = v.id
      ORDER BY m.id DESC LIMIT 6
    `);

    // 6. Próximos Vencimentos a Pagar
    const proximosAPagar = db.query(`
      SELECT id, description, supplier, amount, due_date, status, category
      FROM payables
      WHERE status = 'PENDING'
      ORDER BY due_date ASC LIMIT 5
    `);

    // 7. Próximos Repasses a Receber
    const proximosAReceber = db.query(`
      SELECT id, description, customer, order_sn, amount, due_date, status, origin
      FROM receivables
      WHERE status = 'PENDING'
      ORDER BY due_date ASC LIMIT 5
    `);

    // 8. Gráfico de Fluxo de Caixa (Últimos 14 dias)
    const chartData = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const inc = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'INCOME' AND date = ?", [dateStr])?.total || 0;
      const exp = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'EXPENSE' AND date = ?", [dateStr])?.total || 0;
      
      const dayLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      chartData.push({
        date: dateStr,
        label: dayLabel,
        entradas: inc,
        saidas: exp,
        saldoDoDia: inc - exp
      });
    }

    res.json({
      success: true,
      data: {
        financeiro: {
          saldoAtual,
          cashIncomeMonth,
          cashExpenseMonth,
          lucroOperacionalMes: cashIncomeMonth - cashExpenseMonth,
          aPagarTotal,
          aPagarHoje,
          aPagarMes,
          aPagarAtrasadoTotal: aPagarAtrasado.total,
          aPagarAtrasadoCount: aPagarAtrasado.count,
          aReceberTotal,
          aReceberHoje,
          aReceberMes,
          aReceberShopee
        },
        estoque: {
          totalItensEstoque,
          totalCustoEstoque,
          totalVendaEstoque,
          countEstoqueBaixo,
          produtosEstoqueBaixo
        },
        ultimasMovimentacoes,
        proximosAPagar,
        proximosAReceber,
        chartData
      }
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
