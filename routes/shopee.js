const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

// Obter configurações atuais da API Shopee
router.get('/config', (req, res) => {
  try {
    const config = db.queryOne("SELECT * FROM shopee_config WHERE id = 1");
    res.json({
      success: true,
      data: {
        partner_id: config?.partner_id || '',
        partner_key_masked: config?.partner_key ? '••••••••' + config.partner_key.slice(-4) : '',
        shop_id: config?.shop_id || '',
        is_connected: Boolean(config?.is_connected),
        auto_sync_stock: Boolean(config?.auto_sync_stock),
        last_sync_at: config?.last_sync_at || 'Nunca sincronizado'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Salvar configurações de API Shopee
router.post('/config', (req, res) => {
  try {
    const { partner_id, partner_key, shop_id, auto_sync_stock } = req.body;

    const current = db.queryOne("SELECT * FROM shopee_config WHERE id = 1");
    const newKey = partner_key && !partner_key.includes('••••') ? partner_key.trim() : (current?.partner_key || '');

    db.run(`
      UPDATE shopee_config
      SET partner_id = ?, partner_key = ?, shop_id = ?, auto_sync_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      partner_id ? partner_id.trim() : '',
      newKey,
      shop_id ? shop_id.trim() : '',
      auto_sync_stock ? 1 : 0
    ]);

    res.json({
      success: true,
      message: 'Configurações da Shopee salvas com sucesso! A estrutura está pronta para a ativação quando você desejar.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Gerar URL de Autorização Shopee Open Platform v2
router.get('/auth-url', (req, res) => {
  try {
    const config = db.queryOne("SELECT * FROM shopee_config WHERE id = 1");
    if (!config || !config.partner_id || !config.partner_key) {
      return res.status(400).json({
        success: false,
        message: 'Preencha o Partner ID e Partner Key nas configurações antes de gerar a autorização.'
      });
    }

    const partnerId = Number(config.partner_id);
    const partnerKey = config.partner_key;
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/shop/auth_partner';
    const redirectUrl = 'http://localhost:3000/api/shopee/callback';

    // Shopee v2 HMAC-SHA256 signature
    const baseStr = `${partnerId}${apiPath}${timestamp}`;
    const sign = crypto.createHmac('sha256', partnerKey).update(baseStr).digest('hex');

    const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;

    res.json({
      success: true,
      authUrl,
      timestamp,
      sign
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Simular Venda da Shopee (para testar o fluxo de baixa de estoque e entrada no Contas a Receber)
router.post('/simulate-sale', (req, res) => {
  try {
    const { product_id, variation_id = null, quantity = 1, order_sn = '' } = req.body;

    const prod = db.queryOne("SELECT * FROM products WHERE id = ?", [Number(product_id)]);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const qty = Number(quantity) || 1;
    if (prod.stock_quantity < qty) {
      return res.status(400).json({ success: false, message: `Estoque insuficiente! Saldo atual: ${prod.stock_quantity}` });
    }

    const generatedOrderSn = order_sn || `SHOPEE-${Date.now().toString().slice(-6)}`;
    const sellingPrice = prod.selling_price || 0;
    const grossTotal = sellingPrice * qty;
    
    // Taxa média padrão Shopee: aprox 14% + R$ 4 por item
    const commissionFee = +(grossTotal * 0.14 + (4.00 * qty)).toFixed(2);
    const netTotal = +(grossTotal - commissionFee).toFixed(2);

    // 1. Dá baixa no Estoque
    const newStock = prod.stock_quantity - qty;
    db.run("UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newStock, prod.id]);

    if (variation_id) {
      db.run("UPDATE product_variations SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ?", [qty, Number(variation_id)]);
    }

    // Registra auditoria da movimentação
    db.run(`
      INSERT INTO stock_movements (product_id, variation_id, type, quantity, previous_stock, new_stock, unit_cost, reason, reference_id)
      VALUES (?, ?, 'SALE', ?, ?, ?, ?, 'Venda Shopee (Simulação/Sincronização)', ?)
    `, [prod.id, variation_id ? Number(variation_id) : null, qty, prod.stock_quantity, newStock, prod.cost_price, generatedOrderSn]);

    // 2. Cria lançamento em Contas a Receber
    const dueDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]; // Previsão de liberação em 10 dias
    const recResult = db.run(`
      INSERT INTO receivables (description, origin, customer, order_sn, amount, gross_amount, shopee_fee, due_date, status, payment_method, notes)
      VALUES (?, 'SHOPEE', 'Comprador Shopee', ?, ?, ?, ?, ?, 'PENDING', 'Shopee Repasse', ?)
    `, [
      `Venda Shopee: ${qty}x ${prod.name}`,
      generatedOrderSn,
      netTotal,
      grossTotal,
      commissionFee,
      dueDate,
      `Venda sincronizada. Pedido Shopee #${generatedOrderSn}. Taxa retida: R$ ${commissionFee.toFixed(2)}`
    ]);

    res.json({
      success: true,
      message: `Venda simulada com sucesso! Estoque atualizado de ${prod.stock_quantity} para ${newStock} e gerado Contas a Receber no valor líquido de R$ ${netTotal.toFixed(2)}.`,
      order_sn: generatedOrderSn,
      receivable_id: recResult.lastInsertRowid,
      net_amount: netTotal,
      fee: commissionFee
    });
  } catch (err) {
    console.error('Erro ao simular venda:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Endpoint receptor de Webhook Shopee (já preparado para quando ativar a API)
router.post('/webhook', (req, res) => {
  console.log('[Shopee Webhook] Notificação recebida:', req.body);
  // No futuro, processa eventos como: order_status_push, tracking_no_push, item_promotion_push
  res.status(200).json({ code: 0, message: 'Webhook processado com sucesso' });
});

module.exports = router;
