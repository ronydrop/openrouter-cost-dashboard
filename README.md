# OpenRouter Cost Dashboard

Dashboard local para visualizar e analisar os gastos da OpenRouter com IA, permitindo entender rapidamente quanto está sendo gasto, onde está sendo gasto, como está sendo gasto, custo em USD e BRL, e oportunidades de economia.

## Funcionalidades

- **Resumo Executivo**: Cards com gasto total, créditos, média diária
- **Análise Temporal**: Gráficos de gasto por dia, semana e mês
- **Análise por Modelo**: Visualização dos custos por modelo de IA
- **Conversão USD/BRL**: Cotação automática ou manual
- **Insights Automáticos**: Recomendações de economia
- **Filtros Flexíveis**: Períodos pré-definidos e personalizados

## Arquitetura

```
openrouter-cost-dashboard/
├── client/                 # Frontend React + Vite + Tailwind
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── hooks/        # Custom hooks (React Query)
│   │   ├── services/     # Serviços de API
│   │   ├── types/        # Tipos TypeScript
│   │   └── utils/        # Funções utilitárias
│   ├── package.json
│   └── vite.config.ts
├── server/                # Backend Node.js + Express
│   ├── src/
│   │   ├── routes/       # Rotas da API
│   │   ├── services/     # Lógica de negócio
│   │   └── app.ts        # Aplicação Express
│   ├── package.json
│   └── tsconfig.json
├── .env.example          # Exemplo de variáveis de ambiente
└── README.md
```

## Pré-requisitos

- **Node.js** 18+ 
- **npm** ou **yarn**
- Chave da API OpenRouter (obtenha em https://openrouter.ai)

## Instalação

### 1. Clonar ou copiar o projeto

```bash
# Se ainda não tem o projeto, clone ou extraia os arquivos
cd openrouter-cost-dashboard
```

### 2. Instalar dependências do Backend

```bash
cd server
npm install
```

### 3. Instalar dependências do Frontend

```bash
cd client
npm install
```

### 4. Configurar variáveis de ambiente

Copie o arquivo de exemplo e configure suas credenciais:

```bash
# Na raiz do projeto
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# OpenRouter Configuration (OBRIGATÓRIO)
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui

# Server Configuration
PORT=3001

# Exchange Rate API (opcional - usa fallback se não configurado)
# API gratuita: https://api.exchangerate-api.com/v4/latest/USD
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD

# Taxa de câmbio fallback (usado se a API falhar)
FALLBACK_USD_BRL_RATE=5.00
```

### 5. Obter sua API Key da OpenRouter

1. Acesse https://openrouter.ai/keys
2. Faça login na sua conta
3. Clique em "Create Key"
4. Copie a chave gerada
5. Cole no arquivo `.env`

## Execução

### Terminal 1 - Backend

```bash
cd server
npm run dev
```

O servidor backend estará disponível em: `http://localhost:3001`

### Terminal 2 - Frontend

```bash
cd client
npm run dev
```

O frontend estará disponível em: `http://localhost:5173`

## Endpoints da API

### OpenRouter

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/openrouter/credits` | Retorna créditos do usuário |
| GET | `/api/openrouter/activity` | Retorna atividades (com filtros start/end) |
| GET | `/api/openrouter/health` | Verifica status da API |

### Dashboard

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard/summary` | Resumo do dashboard (parâmetro: `range`) |
| GET | `/api/dashboard/timeseries` | Dados temporais (parâmetro: `range`) |
| GET | `/api/dashboard/models` | Métricas por modelo (parâmetro: `range`) |
| GET | `/api/dashboard/insights` | Insights automáticos (parâmetro: `range`) |

### Câmbio

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/exchange-rate` | Retorna cotação atual |
| POST | `/api/exchange-rate` | Define cotação manual (`{ rate: number }`) |

### Parâmetros de Range

- `today` - Hoje
- `yesterday` - Ontem
- `last7days` - Últimos 7 dias
- `last30days` - Últimos 30 dias
- `currentMonth` - Mês atual
- `previousMonth` - Mês anterior
- `custom` - Período customizado (formato: `startISO,endISO`)

## Segurança

### Protegendo a API Key

- A API key da OpenRouter **nunca** é exposta ao frontend
- Todas as requisições para a OpenRouter passam pelo backend
- O backend atua como proxy seguro

### Boas Práticas

1. **Nunca** commite o arquivo `.env` no git
2. **Nunca** exponha a API key em código frontend
3. **Sempre** use HTTPS em produção
4. Considere adicionar autenticação para o dashboard em produção

## Solução de Problemas

### "OpenRouter API key not configured"

Verifique se:
- O arquivo `.env` existe na pasta `server/`
- A variável `OPENROUTER_API_KEY` está definida
- Não há espaços ou quebras de linha na chave

### "Error fetching exchange rate"

A API de câmbio falhou. O sistema usará automaticamente o `FALLBACK_USD_BRL_RATE`. Para corrigir:
- Verifique sua conexão com a internet
- Ou defina uma cotação manual pelo dashboard

### Frontend não conecta com Backend

Verifique se:
- O backend está rodando na porta 3001
- O proxy no `vite.config.ts` está configurado corretamente
- Não há conflito de portas

## Scripts Disponíveis

### Backend (pasta `server/`)

```bash
npm run dev     # Desenvolvimento com hot-reload (tsx)
npm run build   # Compilar TypeScript
npm start      # Iniciar em produção
```

### Frontend (pasta `client/`)

```bash
npm run dev     # Desenvolvimento com hot-reload
npm run build   # Build de produção
npm run preview # Preview do build de produção
```

## Tecnologias

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Recharts (gráficos)
- TanStack Table
- TanStack Query
- day.js

### Backend
- Node.js
- Express
- TypeScript
- Axios
- node-cache
- dotenv

## Estrutura de Dados

### NormalizedActivityItem

```typescript
{
  timestamp: string;       // ISO date
  model: string;          // Nome do modelo
  provider: string;       // Provider (ex: anthropic, openai)
  requests: number;       // Número de requests
  promptTokens: number;   // Tokens de entrada
  completionTokens: number;// Tokens de saída
  totalTokens: number;    // Total de tokens
  costUsd: number;        // Custo em USD
}
```

### DashboardSummary

```typescript
{
  totalCostUsd: number;
  totalCostBrl: number;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  todayCostUsd: number;
  todayCostBrl: number;
  last7DaysCostUsd: number;
  last7DaysCostBrl: number;
  last30DaysCostUsd: number;
  last30DaysCostBrl: number;
  avgDailyCostUsd: number;
  avgDailyCostBrl: number;
  totalRequests: number;
  totalTokens: number;
  exchangeRate: number;
  exchangeRateSource: string;
  exchangeRateMode: 'auto' | 'manual';
}
```

## Melhorias Futuras

- [ ] Exportação para CSV
- [ ] Alertas de gasto
- [ ] Metas mensais de orçamento
- [ ] Comparação entre modelos equivalentes
- [ ] Projeção de gasto até o fim do mês
- [ ] Autenticação local
- [ ] Persistência de preferências de filtros

## Licença

MIT License

## Suporte

Para problemas ou dúvidas, abra uma issue no repositório do projeto.
