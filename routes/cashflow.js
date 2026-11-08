const express = require('express');
const router = express.Router();
const db = require('../db');

// Extrato do Fluxo de Caixa
router.get('/', (req, res) => {
  try {
    const { month, type, category } = req.query;

    let queryStr = `SELECT * FROM cash_flow WHERE 1=1`;
    const params = [];

    if (month) {
      queryStr += ` AND date LIKE ?`;
      params.push(`${month}%`);
    }

    if (type && type !== 'ALL') {
      queryStr += ` AND type = ?`;
      params.push(type);
    }

    if (category) {
      queryStr += ` AND category = ?`;
      params.push(category);
    }

    queryStr += ` ORDER BY date DESC, id DESC`;

    const records = db.query(queryStr, params);

    // Resumo financeiro
    let totalIncome = 0;
    let totalExpense = 0;

    if (month) {
      totalIncome = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'INCOME' AND date LIKE ?", [`${month}%`])?.total || 0;
      totalExpense = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'EXPENSE' AND date LIKE ?", [`${month}%`])?.total || 0;
    } else {
      totalIncome = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'INCOME'")?.total || 0;
      totalExpense = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'EXPENSE'")?.total || 0;
    }

    const saldoGeral = (db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'INCOME'")?.total || 0) -
                       (db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM cash_flow WHERE type = 'EXPENSE'")?.total || 0);

    // Agrupamento por categoria
    const categoriesIncome = db.query(`
      SELECT category, SUM(amount) as total
      FROM cash_flow
      WHERE type = 'INCOME' ${month ? "AND date LIKE ?" : ""}
      GROUP BY category
      ORDER BY total DESC
    `, month ? [`${month}%`] : []);

    const categoriesExpense = db.query(`
      SELECT category, SUM(amount) as total
      FROM cash_flow
      WHERE type = 'EXPENSE' ${month ? "AND date LIKE ?" : ""}
      GROUP BY category
      ORDER BY total DESC
    `, month ? [`${month}%`] : []);

    res.json({
      success: true,
      data: records,
      summary: {
        totalIncome,
        totalExpense,
        saldoPeriodo: totalIncome - totalExpense,
        saldoGeral,
        categoriesIncome,
        categoriesExpense
      }
    });
  } catch (err) {
    console.error('Erro no fluxo de caixa:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Lançamento manual avulso no Caixa
router.post('/', (req, res) => {
  try {
    const {
      type, // 'INCOME' ou 'EXPENSE'
      category,
      description,
      amount,
      date = new Date().toISOString().split('T')[0],
      payment_method = 'PIX',
      notes = ''
    } = req.body;

    if (!type || !description || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Tipo, descrição, categoria e valor são obrigatórios' });
    }

    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: 'Valor deve ser numérico e maior que zero' });
    }

    const result = db.run(`
      INSERT INTO cash_flow (type, category, description, amount, date, payment_method, reference_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', ?)
    `, [
      type,
      category.trim(),
      description.trim(),
      val,
      date,
      payment_method,
      notes.trim()
    ]);

    res.json({ success: true, message: 'Lançamento registrado com sucesso', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Erro ao lançar no caixa:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Deletar lançamento manual
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.queryOne("SELECT * FROM cash_flow WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Lançamento não encontrado' });
    }

    // Se for atrelado a payable ou receivable, avisa ou desvincula
    if (existing.reference_type === 'PAYABLE' && existing.reference_id) {
      db.run("UPDATE payables SET status = 'PENDING', payment_date = NULL, cashflow_id = NULL WHERE id = ?", [existing.reference_id]);
    } else if (existing.reference_type === 'RECEIVABLE' && existing.reference_id) {
      db.run("UPDATE receivables SET status = 'PENDING', received_date = NULL, cashflow_id = NULL WHERE id = ?", [existing.reference_id]);
    }

    db.run("DELETE FROM cash_flow WHERE id = ?", [id]);

    res.json({ success: true, message: 'Lançamento excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
