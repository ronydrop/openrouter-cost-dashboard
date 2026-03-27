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
import { formatCurrency, formatNumber, formatPercent, formatTokens } from '../utils/formatters';
import type { ModelMetrics } from '../types';

interface ModelCostTableProps {
  data: ModelMetrics[] | undefined;
  loading: boolean;
}

const columnHelper = createColumnHelper<ModelMetrics>();

export function ModelCostTable({ data, loading }: ModelCostTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalCostUsd', desc: true }
  ]);

  const columns = useMemo(() => [
    columnHelper.accessor('model', {
      header: 'Modelo',
      cell: (info) => (
        <div className="font-medium text-gray-900 max-w-xs truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('provider', {
      header: 'Provider',
      cell: (info) => (
        <span className="text-gray-600">{info.getValue() || 'N/A'}</span>
      ),
    }),
    columnHelper.accessor('totalRequests', {
      header: 'Requests',
      cell: (info) => formatNumber(info.getValue()),
    }),
    columnHelper.accessor('totalTokens', {
      header: 'Tokens',
      cell: (info) => formatTokens(info.getValue()),
    }),
    columnHelper.accessor('totalCostUsd', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-primary-600"
          onClick={() => column.toggleSorting()}
        >
          Custo USD
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp size={14} />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown size={14} />
          ) : (
            <ArrowUpDown size={14} />
          )}
        </button>
      ),
      cell: (info) => formatCurrency(info.getValue(), 'USD'),
    }),
    columnHelper.accessor('totalCostBrl', {
      header: 'Custo BRL',
      cell: (info) => formatCurrency(info.getValue(), 'BRL'),
    }),
    columnHelper.accessor('avgCostPerRequest', {
      header: '$/Request',
      cell: (info) => formatCurrency(info.getValue(), 'USD'),
    }),
    columnHelper.accessor('percentOfTotal', {
      header: '% Total',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full"
              style={{ width: `${Math.min(info.getValue() * 100, 100)}%` }}
            />
          </div>
          <span>{formatPercent(info.getValue())}</span>
        </div>
      ),
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

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead className="bg-gray-50 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 border-b border-gray-100">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
        Total de {data.length} modelos • Clique nas colunas para ordenar
      </div>
    </div>
  );
}
