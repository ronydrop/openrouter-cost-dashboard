import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import type { ModelMetrics } from '../types';

interface ModelCostTableProps {
  data: ModelMetrics[] | undefined;
  loading: boolean;
}

const columnHelper = createColumnHelper<ModelMetrics>();

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    anthropic: 'bg-orange-100 text-orange-700',
    openai: 'bg-green-100 text-green-700',
    google: 'bg-blue-100 text-blue-700',
    meta: 'bg-indigo-100 text-indigo-700',
    mistral: 'bg-purple-100 text-purple-700',
    deepseek: 'bg-cyan-100 text-cyan-700',
    qwen: 'bg-teal-100 text-teal-700',
    xai: 'bg-slate-100 text-slate-700',
    cohere: 'bg-pink-100 text-pink-700',
  };
  const key = provider?.split('/')[0]?.toLowerCase() || '';
  const cls = colors[key] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {provider || 'unknown'}
    </span>
  );
}

export function ModelCostTable({ data, loading }: ModelCostTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalCostUsd', desc: true },
  ]);

  const columns = useMemo(() => [
    columnHelper.accessor('model', {
      header: 'Modelo',
      cell: (info) => {
        const parts = info.getValue().split('/');
        const name = parts.length > 1 ? parts.slice(1).join('/') : info.getValue();
        return (
          <div className="max-w-xs">
            <div className="font-medium text-gray-900 truncate text-sm" title={info.getValue()}>
              {name}
            </div>
            <ProviderBadge provider={info.row.original.provider} />
          </div>
        );
      },
    }),
    columnHelper.accessor('totalRequests', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-primary-600" onClick={() => column.toggleSorting()}>
          Requests
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-sm text-gray-700">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('totalTokens', {
      header: 'Tokens',
      cell: (info) => {
        const v = info.getValue();
        if (v >= 1_000_000) return <span className="font-mono text-sm text-gray-700">{(v / 1_000_000).toFixed(1)}M</span>;
        if (v >= 1_000) return <span className="font-mono text-sm text-gray-700">{(v / 1_000).toFixed(1)}K</span>;
        return <span className="font-mono text-sm text-gray-700">{v}</span>;
      },
    }),
    columnHelper.accessor('totalCostUsd', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-primary-600" onClick={() => column.toggleSorting()}>
          Custo USD
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
        </button>
      ),
      cell: (info) => (
        <span className="font-mono font-semibold text-sm text-gray-900">
          {formatCurrency(info.getValue(), 'USD')}
        </span>
      ),
    }),
    columnHelper.accessor('totalCostBrl', {
      header: 'Custo BRL',
      cell: (info) => (
        <span className="font-mono text-sm text-gray-700">
          {formatCurrency(info.getValue(), 'BRL')}
        </span>
      ),
    }),
    columnHelper.accessor('avgCostPerRequest', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-primary-600" onClick={() => column.toggleSorting()}>
          $/Request
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-sm text-gray-700">
          ${info.getValue().toFixed(4)}
        </span>
      ),
    }),
    columnHelper.accessor('percentOfTotal', {
      header: '% Total',
      cell: (info) => {
        const pct = info.getValue() * 100;
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 whitespace-nowrap">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    }),
  ], []);

  const table = useReactTable({
    data: data || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">Nenhum dado disponível</p>
      </div>
    );
  }

  const totalCost = data.reduce((s, m) => s + m.totalCostUsd, 0);
  const totalRequests = data.reduce((s, m) => s + m.totalRequests, 0);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead className="bg-gray-50 sticky top-0">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr key={row.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 border-b border-gray-100">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-4 py-3 font-semibold text-sm text-gray-700">
                Total ({data.length} modelos)
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-sm text-gray-700">
                {formatNumber(totalRequests)}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 font-mono font-bold text-sm text-gray-900">
                {formatCurrency(totalCost, 'USD')}
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-sm text-gray-700">
                {formatCurrency(data.reduce((s, m) => s + m.totalCostBrl, 0), 'BRL')}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-700">
                {formatCurrency(totalRequests > 0 ? totalCost / totalRequests : 0, 'USD')}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
