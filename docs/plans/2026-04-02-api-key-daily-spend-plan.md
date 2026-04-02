# API Key Daily Spend Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** adicionar um gráfico diário por API key dentro da seção existente para comparar gasto entre chaves.

**Architecture:** o backend vai agregar `activity_logs` por dia e `api_key_name`, retornando uma série temporal limitada às top API keys do período. O frontend consome esse endpoint, monta linhas por key e renderiza o gráfico abaixo dos gráficos atuais de API key.

**Tech Stack:** Express, TypeScript, React, React Query, Recharts.

---

### Task 1: Backend aggregation endpoint

**Files:**
- Modify: `server/src/types.ts`
- Modify: `server/src/repositories/ActivityRepository.ts`
- Modify: `server/src/services/AggregationService.ts`
- Modify: `server/src/routes/dashboard.ts`

**Step 1: Add result types**
Add interfaces for daily API key series points.

**Step 2: Add repository query**
Aggregate by `DATE(timestamp)` and `api_key_name`, filtering null keys and selected range.

**Step 3: Add service transformation**
Build normalized series, fill missing dates with zero, and limit to top keys by total cost.

**Step 4: Add route**
Expose `GET /api/dashboard/apikeys/timeseries?range=`.

**Step 5: Verify backend build**
Run: `cd server && npm run build`
Expected: PASS

### Task 2: Frontend consumption and chart

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/services/api.ts`
- Modify: `client/src/hooks/useDashboard.ts`
- Modify: `client/src/App.tsx`

**Step 1: Add client types**
Mirror backend response types.

**Step 2: Add API service + hook**
Create fetcher and query hook for API key daily series.

**Step 3: Render chart in API key section**
Add a responsive chart below the existing API key charts with readable tooltip and legend.

**Step 4: Verify frontend build**
Run: `cd client && npm run build`
Expected: PASS
