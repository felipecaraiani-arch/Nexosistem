const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar contas a pagar
router.get('/', (req, res) => {
  try {
    const { status, month, supplier } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let queryStr = `SELECT * FROM payables WHERE 1=1`;
    const params = [];

    if (month) {
      queryStr += ` AND due_date LIKE ?`;
      params.push(`${month}%`);
    }

    if (supplier) {
      queryStr += ` AND (supplier LIKE ? OR description LIKE ?)`;
      params.push(`%${supplier}%`, `%${supplier}%`);
    }

    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
        queryStr += ` AND status = 'PENDING' AND due_date < ?`;
        params.push(today);
      } else {
        queryStr += ` AND status = ?`;
        params.push(status);
      }
    }

    queryStr += ` ORDER BY due_date ASC, id DESC`;

    const payables = db.query(queryStr, params);

    // Ajusta status dinâmico para OVERDUE se pendente e vencido
    const enriched = payables.map(p => {
      let currentStatus = p.status;
      if (p.status === 'PENDING' && p.due_date < today) {
        currentStatus = 'OVERDUE';
      }
      return {
        ...p,
        effective_status: currentStatus
      };
    });

    // Totais calculados
    const totalPendente = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE status = 'PENDING'")?.total || 0;
    const totalPago = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE status = 'PAID'")?.total || 0;
    const totalVencido = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE status = 'PENDING' AND due_date < ?", [today])?.total || 0;

    res.json({
      success: true,
      data: enriched,
      totals: {
        totalPendente,
        totalPago,
        totalVencido
      }
    });
  } catch (err) {
    console.error('Erro ao listar contas a pagar:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Criar nova conta a pagar
router.post('/', (req, res) => {
  try {
    const {
      description,
      category = 'Fornecedor',
      supplier = '',
      amount,
      due_date,
      payment_method = 'Boleto',
      notes = ''
    } = req.body;

    if (!description || !amount || !due_date) {
      return res.status(400).json({ success: false, message: 'Descrição, valor e data de vencimento são obrigatórios' });
    }

    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: 'Valor deve ser numérico e maior que zero' });
    }

    const result = db.run(`
      INSERT INTO payables (description, category, supplier, amount, due_date, status, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `, [
      description.trim(),
      category.trim(),
      supplier ? supplier.trim() : '',
      val,
      due_date,
      payment_method,
      notes.trim()
    ]);

    res.json({ success: true, message: 'Conta a pagar lançada com sucesso', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Erro ao criar conta a pagar:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Atualizar conta a pagar
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.queryOne("SELECT * FROM payables WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Conta a pagar não encontrada' });
    }

    const {
      description,
      category,
      supplier,
      amount,
      due_date,
      payment_method,
      notes
    } = req.body;

    db.run(`
      UPDATE payables
      SET description = ?, category = ?, supplier = ?, amount = ?, due_date = ?, payment_method = ?, notes = ?
      WHERE id = ?
    `, [
      description !== undefined ? description.trim() : existing.description,
      category !== undefined ? category.trim() : existing.category,
      supplier !== undefined ? supplier.trim() : existing.supplier,
      amount !== undefined ? Number(amount) : existing.amount,
      due_date !== undefined ? due_date : existing.due_date,
      payment_method !== undefined ? payment_method : existing.payment_method,
      notes !== undefined ? notes.trim() : existing.notes,
      id
    ]);

    // Se a conta já estava paga e tem lançamento no caixa, atualiza o valor no caixa também
    if (existing.cashflow_id && amount !== undefined) {
      db.run("UPDATE cash_flow SET amount = ?, description = ? WHERE id = ?", [
        Number(amount),
        `Pagamento: ${description || existing.description} (${supplier || existing.supplier})`,
        existing.cashflow_id
      ]);
    }

    res.json({ success: true, message: 'Conta a pagar atualizada com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dar baixa (Pagar a conta) -> Lança automaticamente no Fluxo de Caixa!
router.post('/:id/pay', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payable = db.queryOne("SELECT * FROM payables WHERE id = ?", [id]);
    if (!payable) {
      return res.status(404).json({ success: false, message: 'Conta a pagar não encontrada' });
    }

    const {
      payment_date = new Date().toISOString().split('T')[0],
      payment_method = payable.payment_method || 'PIX'
    } = req.body;

    // 1. Cria saída no Fluxo de Caixa
    const cashResult = db.run(`
      INSERT INTO cash_flow (type, category, description, amount, date, payment_method, reference_type, reference_id, notes)
      VALUES ('EXPENSE', ?, ?, ?, ?, ?, 'PAYABLE', ?, ?)
    `, [
      payable.category || 'Fornecedor',
      `Pagamento: ${payable.description}${payable.supplier ? ` (${payable.supplier})` : ''}`,
      payable.amount,
      payment_date,
      payment_method,
      id,
      payable.notes || ''
    ]);

    // 2. Atualiza a conta a pagar
    db.run(`
      UPDATE payables
      SET status = 'PAID', payment_date = ?, payment_method = ?, cashflow_id = ?
      WHERE id = ?
    `, [
      payment_date,
      payment_method,
      cashResult.lastInsertRowid,
      id
    ]);

    res.json({
      success: true,
      message: 'Pagamento registrado com sucesso e lançado no Fluxo de Caixa!',
      cashflow_id: cashResult.lastInsertRowid
    });
  } catch (err) {
    console.error('Erro ao pagar conta:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Excluir conta a pagar
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payable = db.queryOne("SELECT * FROM payables WHERE id = ?", [id]);
    if (!payable) {
      return res.status(404).json({ success: false, message: 'Conta não encontrada' });
    }

    // Se já estava com lançamento em caixa, remove o lançamento do caixa também
    if (payable.cashflow_id) {
      db.run("DELETE FROM cash_flow WHERE id = ?", [payable.cashflow_id]);
    }

    db.run("DELETE FROM payables WHERE id = ?", [id]);

    res.json({ success: true, message: 'Conta a pagar excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
