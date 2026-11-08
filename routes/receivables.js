const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar contas a receber
router.get('/', (req, res) => {
  try {
    const { status, month, origin, q } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let queryStr = `SELECT * FROM receivables WHERE 1=1`;
    const params = [];

    if (month) {
      queryStr += ` AND due_date LIKE ?`;
      params.push(`${month}%`);
    }

    if (origin && origin !== 'ALL') {
      queryStr += ` AND origin = ?`;
      params.push(origin);
    }

    if (q) {
      queryStr += ` AND (description LIKE ? OR customer LIKE ? OR order_sn LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
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

    const receivables = db.query(queryStr, params);

    // Ajusta status dinâmico para OVERDUE se pendente e vencido
    const enriched = receivables.map(r => {
      let currentStatus = r.status;
      if (r.status === 'PENDING' && r.due_date < today) {
        currentStatus = 'OVERDUE';
      }
      return {
        ...r,
        effective_status: currentStatus
      };
    });

    // Totais calculados
    const totalPendente = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'PENDING'")?.total || 0;
    const totalRecebido = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'RECEIVED'")?.total || 0;
    const totalShopeePendente = db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'PENDING' AND origin = 'SHOPEE'")?.total || 0;

    res.json({
      success: true,
      data: enriched,
      totals: {
        totalPendente,
        totalRecebido,
        totalShopeePendente
      }
    });
  } catch (err) {
    console.error('Erro ao listar contas a receber:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Criar nova conta a receber (Repasse Shopee ou Venda Direta)
router.post('/', (req, res) => {
  try {
    const {
      description,
      origin = 'SHOPEE',
      customer = '',
      order_sn = '',
      amount,
      gross_amount,
      shopee_fee = 0,
      due_date,
      payment_method = 'Shopee Repasse',
      notes = ''
    } = req.body;

    if (!description || !amount || !due_date) {
      return res.status(400).json({ success: false, message: 'Descrição, valor líquido e data prevista são obrigatórios' });
    }

    const netAmount = Number(amount);
    if (isNaN(netAmount) || netAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valor deve ser numérico e positivo' });
    }

    const result = db.run(`
      INSERT INTO receivables (description, origin, customer, order_sn, amount, gross_amount, shopee_fee, due_date, status, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `, [
      description.trim(),
      origin,
      customer ? customer.trim() : '',
      order_sn ? order_sn.trim() : '',
      netAmount,
      gross_amount ? Number(gross_amount) : netAmount,
      Number(shopee_fee) || 0,
      due_date,
      payment_method,
      notes.trim()
    ]);

    res.json({ success: true, message: 'Conta a receber cadastrada com sucesso', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Erro ao cadastrar conta a receber:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Atualizar conta a receber
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.queryOne("SELECT * FROM receivables WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Conta a receber não encontrada' });
    }

    const {
      description,
      origin,
      customer,
      order_sn,
      amount,
      gross_amount,
      shopee_fee,
      due_date,
      payment_method,
      notes
    } = req.body;

    db.run(`
      UPDATE receivables
      SET description = ?, origin = ?, customer = ?, order_sn = ?, amount = ?, gross_amount = ?, shopee_fee = ?, due_date = ?, payment_method = ?, notes = ?
      WHERE id = ?
    `, [
      description !== undefined ? description.trim() : existing.description,
      origin !== undefined ? origin : existing.origin,
      customer !== undefined ? customer.trim() : existing.customer,
      order_sn !== undefined ? order_sn.trim() : existing.order_sn,
      amount !== undefined ? Number(amount) : existing.amount,
      gross_amount !== undefined ? Number(gross_amount) : existing.gross_amount,
      shopee_fee !== undefined ? Number(shopee_fee) : existing.shopee_fee,
      due_date !== undefined ? due_date : existing.due_date,
      payment_method !== undefined ? payment_method : existing.payment_method,
      notes !== undefined ? notes.trim() : existing.notes,
      id
    ]);

    // Se já estava recebida e lançada no caixa, atualiza o valor no caixa
    if (existing.cashflow_id && amount !== undefined) {
      db.run("UPDATE cash_flow SET amount = ?, description = ? WHERE id = ?", [
        Number(amount),
        `Recebimento: ${description || existing.description}`,
        existing.cashflow_id
      ]);
    }

    res.json({ success: true, message: 'Conta a receber atualizada com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dar baixa (Receber valor) -> Lança automaticamente no Fluxo de Caixa!
router.post('/:id/receive', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const receivable = db.queryOne("SELECT * FROM receivables WHERE id = ?", [id]);
    if (!receivable) {
      return res.status(404).json({ success: false, message: 'Conta a receber não encontrada' });
    }

    const {
      received_date = new Date().toISOString().split('T')[0],
      payment_method = receivable.payment_method || 'Shopee Repasse'
    } = req.body;

    // 1. Cria entrada no Fluxo de Caixa
    const categoryName = receivable.origin === 'SHOPEE' ? 'Repasse Shopee' : 'Venda Direta';
    const cashResult = db.run(`
      INSERT INTO cash_flow (type, category, description, amount, date, payment_method, reference_type, reference_id, notes)
      VALUES ('INCOME', ?, ?, ?, ?, ?, 'RECEIVABLE', ?, ?)
    `, [
      categoryName,
      `Recebimento: ${receivable.description}${receivable.order_sn ? ` (Ped: ${receivable.order_sn})` : ''}`,
      receivable.amount,
      received_date,
      payment_method,
      id,
      receivable.notes || ''
    ]);

    // 2. Atualiza a conta a receber
    db.run(`
      UPDATE receivables
      SET status = 'RECEIVED', received_date = ?, payment_method = ?, cashflow_id = ?
      WHERE id = ?
    `, [
      received_date,
      payment_method,
      cashResult.lastInsertRowid,
      id
    ]);

    res.json({
      success: true,
      message: 'Recebimento registrado com sucesso e creditado no Fluxo de Caixa!',
      cashflow_id: cashResult.lastInsertRowid
    });
  } catch (err) {
    console.error('Erro ao receber conta:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Excluir conta a receber
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const receivable = db.queryOne("SELECT * FROM receivables WHERE id = ?", [id]);
    if (!receivable) {
      return res.status(404).json({ success: false, message: 'Conta não encontrada' });
    }

    // Se já tinha lançamento no caixa, remove o lançamento do caixa
    if (receivable.cashflow_id) {
      db.run("DELETE FROM cash_flow WHERE id = ?", [receivable.cashflow_id]);
    }

    db.run("DELETE FROM receivables WHERE id = ?", [id]);

    res.json({ success: true, message: 'Conta a receber excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
