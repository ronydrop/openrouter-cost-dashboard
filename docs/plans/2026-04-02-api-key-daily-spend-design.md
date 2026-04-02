# Design: Gasto diário por API key

## Objetivo
Adicionar, na seção já existente de API keys, um gráfico temporal por dia para comparar quais chaves estão gastando mais no período selecionado.

## Abordagem
- Manter os gráficos atuais de distribuição/resumo por API key.
- Adicionar um novo endpoint backend agregado por dia e por API key.
- No frontend, buscar a série temporal e renderizar um gráfico comparativo na mesma seção.
- Limitar visualmente às top API keys do período para manter legibilidade.

## Dados
- Entrada: `range` igual ao restante do dashboard.
- Saída: lista de dias com custo por key em USD e BRL.
- Ordenação: top keys por gasto total no período.

## UI
- Novo gráfico abaixo do bloco atual `Gastos por API Key`.
- Tooltip com nome completo da key, USD e BRL.
- Cores consistentes por key.

## Riscos
- Muitas chaves podem poluir o gráfico; por isso vamos limitar às top keys.
- Datas vazias precisam aparecer como zero para manter leitura temporal.
