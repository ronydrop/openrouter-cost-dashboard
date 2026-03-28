import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
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
    anthropic: 'bg-orange-500/10 text-orange-400',
    openai: 'bg-green-500/10 text-green-400',
    google: 'bg-blue-500/10 text-blue-400',
    meta: 'bg-indigo-500/10 text-indigo-400',
    mistral: 'bg-purple-500/10 text-purple-400',
    deepseek: 'bg-cyan-500/10 text-cyan-400',
    qwen: 'bg-teal-500/10 text-teal-400',
    xai: 'bg-slate-500/10 text-slate-400',
    cohere: 'bg-pink-500/10 text-pink-400',
  };
  const key = provider?.split('/')[0]?.toLowerCase() || '';
  const cls = colors[key] || 'bg-gray-500/10 text-gray-400';
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
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(model => model.totalRequests > 0 || model.totalCostUsd > 0);
  }, [data]);

  const columns = useMemo(() => [
    columnHelper.accessor('model', {
      header: 'Modelo',
      cell: (info) => {
        const parts = info.getValue().split('/');
        const name = parts.length > 1 ? parts.slice(1).join('/') : info.getValue();
        return (
          <div className="max-w-xs">
            <div className="font-medium text-white truncate text-sm" title={info.getValue()}>
              {name}
            </div>
            <ProviderBadge provider={info.row.original.provider} />
          </div>
        );
      },
    }),
    columnHelper.accessor('totalRequests', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors" onClick={() => column.toggleSorting()}>
          Requests
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-sm text-gray-400">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('totalTokens', {
      header: 'Tokens',
      cell: (info) => {
        const v = info.getValue();
        if (v >= 1_000_000) return <span className="font-mono text-sm text-gray-400">{(v / 1_000_000).toFixed(1)}M</span>;
        if (v >= 1_000) return <span className="font-mono text-sm text-gray-400">{(v / 1_000).toFixed(1)}K</span>;
        return <span className="font-mono text-sm text-gray-400">{v}</span>;
      },
    }),
    columnHelper.accessor('totalCostUsd', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors" onClick={() => column.toggleSorting()}>
          Custo USD
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
        </button>
      ),
      cell: (info) => (
        <span className="font-mono font-semibold text-sm text-white">
          {formatCurrency(info.getValue(), 'USD')}
        </span>
      ),
    }),
    columnHelper.accessor('totalCostBrl', {
      header: 'Custo BRL',
      cell: (info) => (
        <span className="font-mono text-sm text-gray-400">
          {formatCurrency(info.getValue(), 'BRL')}
        </span>
      ),
    }),
    columnHelper.accessor('avgCostPerRequest', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors" onClick={() => column.toggleSorting()}>
          $/Request
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-sm text-gray-400">
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
            <div className="flex-1 bg-[#2a2a2a] rounded-full h-1.5">
              <div
                className="bg-[#3b82f6] h-1.5 rounded-full"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    }),
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return (
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-[#1c1c1e] rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[#1c1c1e] rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!filteredData.length) {
    return (
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 text-center py-12">
        <p className="text-gray-500">Nenhum modelo utilizado no período</p>
      </div>
    );
  }

  const totalCost = filteredData.reduce((s, m) => s + m.totalCostUsd, 0);
  const totalRequests = filteredData.reduce((s, m) => s + m.totalRequests, 0);

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#1c1c1e] border-b border-[#2a2a2a]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr key={row.id} className={`hover:bg-[#1c1c1e] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#1c1c1e]/50'}`}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 border-b border-[#2a2a2a]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#1c1c1e] border-t-2 border-[#2a2a2a]">
            <tr>
              <td className="px-4 py-3 font-semibold text-sm text-white">
                Total ({filteredData.length} modelos)
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-sm text-gray-400">
                {formatNumber(totalRequests)}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 font-mono font-bold text-sm text-white">
                {formatCurrency(totalCost, 'USD')}
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-sm text-gray-400">
                {formatCurrency(filteredData.reduce((s, m) => s + m.totalCostBrl, 0), 'BRL')}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-400">
                {formatCurrency(totalRequests > 0 ? totalCost / totalRequests : 0, 'USD')}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-[#1c1c1e] border-t border-[#2a2a2a]">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Linhas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="bg-[#2a2a2a] border border-[#3a3a3a] rounded px-2 py-1 text-white text-sm"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            Página {pageIndex + 1} de {table.getPageCount() || 1}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="px-2 py-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#3a3a3a] transition-colors"
            >
              «
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#3a3a3a] transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#3a3a3a] transition-colors"
            >
              ›
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="px-2 py-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#3a3a3a] transition-colors"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
