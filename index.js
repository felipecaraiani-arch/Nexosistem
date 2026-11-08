const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/products', require('./routes/products'));
app.use('/api/payables', require('./routes/payables'));
app.use('/api/receivables', require('./routes/receivables'));
app.use('/api/cashflow', require('./routes/cashflow'));
app.use('/api/shopee', require('./routes/shopee'));

// Servir frontend compilado se existir
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Redirecionamento SPA
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ERP Shopee - Iniciando...</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; color: #1e293b; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 500px; text-align: center; }
            h1 { color: #ea580c; margin-top: 0; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>ERP Shopee Simples</h1>
            <p>O servidor backend está rodando perfeitamente na porta <code>${PORT}</code>.</p>
            <p>Para abrir a interface completa, execute o build do cliente ou inicie com <code>npm run dev</code>.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// Inicialização com banco de dados
async function startServer() {
  try {
    await db.initDatabase();
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 ERP Shopee Simples iniciado com sucesso!`);
      console.log(`🌐 Acesse no seu navegador: http://localhost:${PORT}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('Falha ao iniciar servidor ERP:', err);
    process.exit(1);
  }
}

startServer();
