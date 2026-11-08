const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todos os produtos com filtros
router.get('/', (req, res) => {
  try {
    const { q, category, low_stock } = req.query;
    let queryStr = `
      SELECT p.*,
        (SELECT COUNT(*) FROM product_variations v WHERE v.product_id = p.id) as variations_count
      FROM products p
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      queryStr += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
      const search = `%${q}%`;
      params.push(search, search, search);
    }

    if (category) {
      queryStr += ` AND p.category = ?`;
      params.push(category);
    }

    if (low_stock === 'true') {
      queryStr += ` AND p.stock_quantity <= p.min_stock`;
    }

    queryStr += ` ORDER BY p.id DESC`;

    const products = db.query(queryStr, params);

    // Carregar variações de cada produto se houver
    const enriched = products.map(prod => {
      const variations = db.query("SELECT * FROM product_variations WHERE product_id = ? ORDER BY id ASC", [prod.id]);
      return {
        ...prod,
        variations
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Buscar produto por ID com histórico
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const variations = db.query("SELECT * FROM product_variations WHERE product_id = ? ORDER BY id ASC", [id]);
    const movements = db.query(`
      SELECT m.*, v.name as variation_name
      FROM stock_movements m
      LEFT JOIN product_variations v ON m.variation_id = v.id
      WHERE m.product_id = ?
      ORDER BY m.id DESC LIMIT 30
    `, [id]);

    res.json({
      success: true,
      data: {
        ...product,
        variations,
        movements
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Criar novo produto
router.post('/', (req, res) => {
  try {
    const {
      name,
      sku,
      barcode = '',
      category = 'Geral',
      cost_price = 0,
      selling_price = 0,
      stock_quantity = 0,
      min_stock = 5,
      shopee_item_id = '',
      notes = '',
      variations = []
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ success: false, message: 'Nome e SKU são obrigatórios' });
    }

    // Verifica SKU duplicado
    const existingSku = db.queryOne("SELECT id FROM products WHERE sku = ?", [sku]);
    if (existingSku) {
      return res.status(400).json({ success: false, message: 'SKU já cadastrado para outro produto' });
    }

    // Calcula estoque inicial somando variações se informadas
    let totalStock = Number(stock_quantity) || 0;
    if (variations && variations.length > 0) {
      totalStock = variations.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
    }

    const result = db.run(`
      INSERT INTO products (name, sku, barcode, category, cost_price, selling_price, stock_quantity, min_stock, shopee_item_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      sku.trim(),
      barcode.trim(),
      category.trim(),
      Number(cost_price) || 0,
      Number(selling_price) || 0,
      totalStock,
      Number(min_stock) || 5,
      shopee_item_id ? shopee_item_id.trim() : '',
      notes.trim()
    ]);

    const productId = result.lastInsertRowid;

    // Inserir variações se houver
    if (variations && Array.isArray(variations)) {
      for (const v of variations) {
        if (v.name) {
          const varSku = v.sku || `${sku}-${v.name.replace(/\s+/g, '-').toUpperCase()}`;
          const varQty = Number(v.stock_quantity) || 0;
          db.run(`
            INSERT INTO product_variations (product_id, name, sku, cost_price, selling_price, stock_quantity)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            productId,
            v.name.trim(),
            varSku.trim(),
            Number(v.cost_price) || Number(cost_price) || 0,
            Number(v.selling_price) || Number(selling_price) || 0,
            varQty
          ]);
        }
      }
    }

    // Registrar movimentação de estoque inicial se > 0
    if (totalStock > 0) {
      db.run(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_cost, reason)
        VALUES (?, 'ENTRY', ?, 0, ?, ?, 'Estoque inicial de cadastro')
      `, [productId, totalStock, totalStock, Number(cost_price) || 0]);
    }

    res.json({ success: true, message: 'Produto cadastrado com sucesso', id: productId });
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Atualizar produto
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const {
      name,
      sku,
      barcode = '',
      category = 'Geral',
      cost_price = 0,
      selling_price = 0,
      min_stock = 5,
      shopee_item_id = '',
      notes = '',
      variations = []
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ success: false, message: 'Nome e SKU são obrigatórios' });
    }

    // Verifica SKU duplicado
    const duplicateSku = db.queryOne("SELECT id FROM products WHERE sku = ? AND id != ?", [sku, id]);
    if (duplicateSku) {
      return res.status(400).json({ success: false, message: 'SKU já em uso por outro produto' });
    }

    db.run(`
      UPDATE products
      SET name = ?, sku = ?, barcode = ?, category = ?, cost_price = ?, selling_price = ?, min_stock = ?, shopee_item_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name.trim(),
      sku.trim(),
      barcode.trim(),
      category.trim(),
      Number(cost_price) || 0,
      Number(selling_price) || 0,
      Number(min_stock) || 5,
      shopee_item_id ? shopee_item_id.trim() : '',
      notes.trim(),
      id
    ]);

    // Atualiza variações se enviadas
    if (Array.isArray(variations)) {
      // Recarrega variações existentes
      const currentVars = db.query("SELECT id FROM product_variations WHERE product_id = ?", [id]);
      const currentIds = new Set(currentVars.map(v => v.id));
      const incomingIds = new Set(variations.filter(v => v.id).map(v => Number(v.id)));

      // Remove variações deletadas
      for (const curId of currentIds) {
        if (!incomingIds.has(curId)) {
          db.run("DELETE FROM product_variations WHERE id = ?", [curId]);
        }
      }

      // Atualiza ou insere
      for (const v of variations) {
        if (v.id && currentIds.has(Number(v.id))) {
          db.run(`
            UPDATE product_variations
            SET name = ?, sku = ?, cost_price = ?, selling_price = ?
            WHERE id = ?
          `, [
            v.name.trim(),
            (v.sku || `${sku}-${v.name.replace(/\s+/g, '-').toUpperCase()}`).trim(),
            Number(v.cost_price) || Number(cost_price) || 0,
            Number(v.selling_price) || Number(selling_price) || 0,
            v.id
          ]);
        } else if (v.name) {
          db.run(`
            INSERT INTO product_variations (product_id, name, sku, cost_price, selling_price, stock_quantity)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            id,
            v.name.trim(),
            (v.sku || `${sku}-${v.name.replace(/\s+/g, '-').toUpperCase()}`).trim(),
            Number(v.cost_price) || Number(cost_price) || 0,
            Number(v.selling_price) || Number(selling_price) || 0,
            Number(v.stock_quantity) || 0
          ]);
        }
      }

      // Se houver variações, recalcula estoque total do produto
      const varStock = db.queryOne("SELECT SUM(stock_quantity) as total FROM product_variations WHERE product_id = ?", [id])?.total;
      if (varStock !== null && varStock !== undefined) {
        db.run("UPDATE products SET stock_quantity = ? WHERE id = ?", [varStock, id]);
      }
    }

    res.json({ success: true, message: 'Produto atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Movimentação manual de estoque (Entrada, Saída, Ajuste, Venda)
router.post('/:id/movement', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = db.queryOne("SELECT * FROM products WHERE id = ?", [productId]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const {
      type, // 'ENTRY', 'EXIT', 'ADJUSTMENT', 'SALE'
      quantity,
      variation_id = null,
      unit_cost = 0,
      reason = '',
      reference_id = '',
      create_cashflow = false,
      unit_price = 0
    } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
    }

    let currentStock = product.stock_quantity;
    let newStock = currentStock;

    if (type === 'ENTRY') {
      newStock = currentStock + qty;
    } else if (type === 'EXIT' || type === 'SALE') {
      newStock = Math.max(0, currentStock - qty);
    } else if (type === 'ADJUSTMENT') {
      newStock = qty; // No ajuste, a quantidade informada é o novo saldo real em estoque
    } else {
      return res.status(400).json({ success: false, message: 'Tipo de movimentação inválido' });
    }

    // Atualiza estoque do produto
    db.run("UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newStock, productId]);

    // Se tiver variação selecionada, atualiza também a variação
    if (variation_id) {
      const varId = parseInt(variation_id);
      const variation = db.queryOne("SELECT * FROM product_variations WHERE id = ? AND product_id = ?", [varId, productId]);
      if (variation) {
        let newVarStock = variation.stock_quantity;
        if (type === 'ENTRY') newVarStock += qty;
        else if (type === 'EXIT' || type === 'SALE') newVarStock = Math.max(0, variation.stock_quantity - qty);
        else if (type === 'ADJUSTMENT') newVarStock = qty;
        db.run("UPDATE product_variations SET stock_quantity = ? WHERE id = ?", [newVarStock, varId]);
      }
    }

    // Registra movimentação no histórico
    db.run(`
      INSERT INTO stock_movements (product_id, variation_id, type, quantity, previous_stock, new_stock, unit_cost, reason, reference_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      productId,
      variation_id ? parseInt(variation_id) : null,
      type,
      qty,
      currentStock,
      newStock,
      Number(unit_cost) || product.cost_price,
      reason.trim(),
      reference_id ? reference_id.trim() : ''
    ]);

    // Opcional: Se foi venda e marcou lançar no caixa
    if (type === 'SALE' && create_cashflow && unit_price > 0) {
      const totalSale = Number(unit_price) * qty;
      const today = new Date().toISOString().split('T')[0];
      db.run(`
        INSERT INTO cash_flow (type, category, description, amount, date, payment_method, reference_type, notes)
        VALUES ('INCOME', 'Venda Shopee/Direta', ?, ?, ?, 'PIX', 'SHOPEE_SALE', ?)
      `, [
        `Venda: ${qty}x ${product.name} (SKU: ${product.sku})`,
        totalSale,
        today,
        `Ref: ${reference_id || 'Venda manual de balcão/Shopee'}`
      ]);
    }

    res.json({
      success: true,
      message: 'Movimentação realizada com sucesso',
      previous_stock: currentStock,
      new_stock: newStock
    });
  } catch (err) {
    console.error('Erro na movimentação:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Deletar produto
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    db.run("DELETE FROM product_variations WHERE product_id = ?", [id]);
    db.run("DELETE FROM stock_movements WHERE product_id = ?", [id]);
    db.run("DELETE FROM products WHERE id = ?", [id]);

    res.json({ success: true, message: 'Produto excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
