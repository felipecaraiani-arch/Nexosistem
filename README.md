# ERP Shopee Lite - Controle de Estoque & Fluxo de Caixa

Um ERP simples, ágil e focado na rotina de vendedores da **Shopee**. Criado para rodar localmente no seu computador com banco de dados SQLite embutido (zero configuração).

---

## 🚀 Como Iniciar o ERP (1 Clique)

Você pode iniciar o sistema de duas formas:

1. **Pelo arquivo executável (Recomendado no Windows):**
   - Dê 2 cliques no arquivo `iniciar.bat`.
   - O navegador abrirá automaticamente em [http://localhost:3000](http://localhost:3000).

2. **Pelo Terminal / Prompt:**
   ```bash
   npm start
   ```

---

## 📦 Módulos Inclusos

### 1. 📦 Controle de Estoque & Produtos
- Cadastro de produtos com **Nome, SKU Shopee, Código de Barras/EAN, Preço de Custo, Preço de Venda e Margem de Lucro**.
- Suporte a **Variações Shopee** (ex: Tamanhos `P, M, G`, Cores `Preto, Branco`).
- **Alerta de Estoque Crítico**: notifica quando um produto atinge a quantidade mínima para você não sofrer penalidades ou cancelamentos na Shopee.
- **Movimentação Rápida de Estoque**: Registre Entradas (compras), Saídas (perdas/avarias), Ajustes de balanço ou Vendas manuais com histórico completo de auditoria.

### 2. 📉 Contas a Pagar
- Controle das despesas da loja: **Fornecedores de Mercadoria, Embalagens, Fitas, Bobinas de Etiquetas Térmicas, Fretes e Custos Fixos**.
- Alerta visual de **Contas Vencidas** e a vencer hoje.
- **Baixa Inteligente com 1 Clique**: Ao clicar em *Pagar*, o valor é automaticamente lançado como **Saída** no seu Fluxo de Caixa.

### 3. 📈 Contas a Receber (Focado na Shopee)
- Controle dos repasses de pedidos Shopee:
  - Número do Pedido (`order_sn`).
  - Valor Bruto da venda.
  - Taxa/Comissão estimada da Shopee retida.
  - Valor Líquido real a receber.
  - Previsão de liberação do repasse.
- **Baixa com 1 Clique**: Ao clicar em *Receber*, o valor líquido é lançado como **Entrada** no seu Fluxo de Caixa.

### 4. 💰 Fluxo de Caixa Consolidado
- Extrato financeiro unificado em tempo real.
- Mostra:
  - Saldo Total Acumulado.
  - Entradas do Mês.
  - Saídas do Mês.
  - **Resultado Operacional (Lucro ou Prejuízo real)**.
- Gráfico de Despesas por Categoria para ver onde está indo o dinheiro da sua operação.
- Botão para lançamentos avulsos rápidos (sangrias, aportes, tarifas).

### 5. 🔌 Integração Shopee (Preparada para o Futuro)
- Aba dedicada com status da conexão.
- Campos já estruturados para quando você for integrar via API oficial:
  - `Partner ID`
  - `Partner Key`
  - `Shop ID`
  - URL de Webhook: `http://localhost:3000/api/shopee/webhook`
- **Simulador de Venda Shopee**: Ferramenta interativa que permite testar como o sistema sincroniza a venda (dá baixa no produto correspondente e lança a conta a receber com comissão descontada).

---

## 💾 Banco de Dados & Backups

Todos os dados ficam armazenados de forma segura em um único arquivo local:
```
data/erp_shopee.db
```
Para fazer backup, basta copiar esse arquivo para seu Google Drive, pen drive ou pasta de segurança.
