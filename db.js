const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'erp_shopee.db');
let dbInstance = null;

function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error('Erro ao salvar banco de dados em disco:', err);
  }
}

async function initDatabase() {
  if (dbInstance) return;

  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    try {
      const buffer = fs.readFileSync(dbPath);
      dbInstance = new SQL.Database(buffer);
      console.log('✓ Banco de dados existente carregado com sucesso.');
    } catch (e) {
      console.warn('! Erro ao carregar arquivo de banco existente, criando novo banco:', e.message);
      dbInstance = new SQL.Database();
    }
  } else {
    console.log('✓ Criando novo banco de dados SQLite.');
    dbInstance = new SQL.Database();
  }

  // Criação de tabelas
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT,
      category TEXT DEFAULT 'Geral',
      cost_price REAL DEFAULT 0.0,
      selling_price REAL DEFAULT 0.0,
      stock_quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      shopee_item_id TEXT,
      status TEXT DEFAULT 'ACTIVE',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_variations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      shopee_model_id TEXT,
      cost_price REAL,
      selling_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      variation_id INTEGER,
      type TEXT NOT NULL, -- 'ENTRY', 'EXIT', 'ADJUSTMENT', 'SALE'
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      unit_cost REAL DEFAULT 0.0,
      reason TEXT,
      reference_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Fornecedor', 'Embalagens', 'Frete/Envio', 'Taxas/Impostos', 'Operacional', 'Outros'
      supplier TEXT,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL, -- YYYY-MM-DD
      payment_date TEXT,      -- YYYY-MM-DD
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'
      payment_method TEXT,
      notes TEXT,
      cashflow_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receivables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      origin TEXT DEFAULT 'SHOPEE', -- 'SHOPEE', 'DIRETA', 'OUTROS'
      customer TEXT,
      order_sn TEXT, -- Código do Pedido Shopee
      amount REAL NOT NULL, -- Valor Líquido a receber
      gross_amount REAL,
      shopee_fee REAL DEFAULT 0.0,
      due_date TEXT NOT NULL, -- Data prevista
      received_date TEXT,    -- Data recebida
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'RECEIVED', 'OVERDUE', 'CANCELLED'
      payment_method TEXT DEFAULT 'Shopee Repasse',
      notes TEXT,
      cashflow_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_flow (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'INCOME' ou 'EXPENSE'
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      payment_method TEXT,
      reference_type TEXT DEFAULT 'MANUAL', -- 'MANUAL', 'PAYABLE', 'RECEIVABLE', 'SHOPEE_SALE'
      reference_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shopee_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      partner_id TEXT DEFAULT '',
      partner_key TEXT DEFAULT '',
      shop_id TEXT DEFAULT '',
      access_token TEXT DEFAULT '',
      refresh_token TEXT DEFAULT '',
      token_expires_at INTEGER DEFAULT 0,
      is_connected INTEGER DEFAULT 0,
      auto_sync_stock INTEGER DEFAULT 0,
      last_sync_at TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO shopee_config (id, is_connected, auto_sync_stock) VALUES (1, 0, 0);
  `);

  // Se não houver produtos, insere dados iniciais de demonstração
  const count = queryOne('SELECT COUNT(*) as total FROM products')?.total || 0;
  if (count === 0) {
    seedInitialData();
  }

  saveDb();
}

function query(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  const lastId = queryOne('SELECT last_insert_rowid() as id')?.id;
  const changes = queryOne('SELECT changes() as count')?.count;
  saveDb();
  return { lastInsertRowid: lastId, changes };
}

function seedInitialData() {
  console.log('✓ Inserindo dados iniciais demonstrativos...');
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const pastWeek = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];

  // Produtos
  run(`
    INSERT INTO products (name, sku, barcode, category, cost_price, selling_price, stock_quantity, min_stock, notes)
    VALUES ('Kit 10 Caixas de Papelão para Envio Shopee 16x11x6cm', 'EMB-CX-01', '789100010001', 'Embalagens', 12.50, 24.90, 45, 10, 'Material essencial para embalagem de pedidos da loja')
  `);
  run(`
    INSERT INTO products (name, sku, barcode, category, cost_price, selling_price, stock_quantity, min_stock, notes)
    VALUES ('Fita Adesiva Transparente 45mm x 100m Shopee', 'EMB-FIT-02', '789100020002', 'Embalagens', 4.20, 9.90, 8, 15, 'Fita para lacre de caixas - ATENÇÃO: estoque abaixo do mínimo!')
  `);
  const p3 = run(`
    INSERT INTO products (name, sku, barcode, category, cost_price, selling_price, stock_quantity, min_stock, notes)
    VALUES ('Camiseta Básica 100% Algodão Premium', 'CAM-BAS-01', '789100030003', 'Vestuário', 18.00, 39.90, 32, 10, 'Produto campeão de vendas na Shopee')
  `).lastInsertRowid;

  // Variações
  run(`
    INSERT INTO product_variations (product_id, name, sku, cost_price, selling_price, stock_quantity)
    VALUES (?, 'Preto / M', 'CAM-BAS-01-PRT-M', 18.00, 39.90, 15)
  `, [p3]);
  run(`
    INSERT INTO product_variations (product_id, name, sku, cost_price, selling_price, stock_quantity)
    VALUES (?, 'Preto / G', 'CAM-BAS-01-PRT-G', 18.00, 39.90, 12)
  `, [p3]);
  run(`
    INSERT INTO product_variations (product_id, name, sku, cost_price, selling_price, stock_quantity)
    VALUES (?, 'Branco / M', 'CAM-BAS-01-BRC-M', 18.00, 39.90, 5)
  `, [p3]);

  // Movimentações Iniciais
  run(`INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_cost, reason) VALUES (1, 'ENTRY', 45, 0, 45, 12.50, 'Estoque inicial cadastrado')`);
  run(`INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_cost, reason) VALUES (2, 'ENTRY', 8, 0, 8, 4.20, 'Estoque inicial cadastrado')`);
  run(`INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_cost, reason) VALUES (3, 'ENTRY', 32, 0, 32, 18.00, 'Estoque inicial cadastrado')`);

  // Contas a Pagar
  run(`
    INSERT INTO payables (description, category, supplier, amount, due_date, status, payment_method, notes)
    VALUES ('Fornecedor de Caixas e Envelopes', 'Embalagens', 'Embalagens Brasil LTDA', 350.00, ?, 'PENDING', 'Boleto', 'Reposição quinzenal')
  `, [nextWeek]);
  run(`
    INSERT INTO payables (description, category, supplier, amount, due_date, status, payment_method, notes)
    VALUES ('Bobina de Etiquetas Térmicas 100x150mm', 'Operacional', 'Suprimentos Express', 89.90, ?, 'PENDING', 'PIX', 'Etiquetas Shopee Envio')
  `, [today]);

  // Contas a Receber
  run(`
    INSERT INTO receivables (description, origin, customer, order_sn, amount, gross_amount, shopee_fee, due_date, status, payment_method)
    VALUES ('Repasse Shopee Pedido #241102A189', 'SHOPEE', 'Carlos M. (Shopee)', '241102A189', 74.80, 89.90, 15.10, ?, 'PENDING', 'Shopee Repasse')
  `, [today]);
  run(`
    INSERT INTO receivables (description, origin, customer, order_sn, amount, gross_amount, shopee_fee, due_date, status, payment_method)
    VALUES ('Repasse Shopee Pedido #241103B902', 'SHOPEE', 'Mariana S. (Shopee)', '241103B902', 119.50, 145.00, 25.50, ?, 'PENDING', 'Shopee Repasse')
  `, [nextWeek]);

  // Fluxo de Caixa histórico
  run(`
    INSERT INTO cash_flow (type, category, description, amount, date, payment_method, reference_type)
    VALUES ('INCOME', 'Repasse Shopee', 'Repasse Shopee Lote Semana Anterior', 920.00, ?, 'Transferência', 'SHOPEE_SALE')
  `, [pastWeek]);
  run(`
    INSERT INTO cash_flow (type, category, description, amount, date, payment_method, reference_type)
    VALUES ('EXPENSE', 'Mercadoria', 'Compra Inicial Fornecedor Atacado', 450.00, ?, 'PIX', 'PAYABLE')
  `, [pastWeek]);
}

module.exports = {
  initDatabase,
  query,
  queryOne,
  run,
  saveDb
};
