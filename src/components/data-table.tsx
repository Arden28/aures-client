// src/components/data-table.tsx
import * as React from "react"

import type { ColumnDef, ColumnSort, RowSelectionState } from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Loader2, ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type BaseItem = {
  id: string | number
}

export type DataTableProps<TData extends BaseItem> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  isLoading?: boolean
  totalLabel?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  onSelectionChange?: (selectedIds: Array<TData["id"]>) => void
  toolbarActions?: React.ReactNode

  /** Optional thumbnail column */
  getImageSrc?: (row: TData) => string | null | undefined
  getImageAlt?: (row: TData) => string | null | undefined
  imageColumnHeader?: string
}

export function DataTable<TData extends BaseItem>({
  columns,
  data,
  isLoading = false,
  totalLabel = "items",
  searchPlaceholder = "Search...",
  onSearchChange,
  onSelectionChange,
  toolbarActions,
  getImageSrc,
  getImageAlt,
  imageColumnHeader = "",
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [sorting, setSorting] = React.useState<ColumnSort[]>([])
  const [search, setSearch] = React.useState("")

  const table = useReactTable({
    data,
    columns: React.useMemo(() => {
      // Selection column (always first)
      const selectCol: ColumnDef<TData> = {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all"
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 32,
      }

      // Optional image column (second, right after checkbox)
      const imageCol: ColumnDef<TData> | null = getImageSrc
        ? {
            id: "image",
            header: () =>
              imageColumnHeader ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {imageColumnHeader}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center">
                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                </span>
              ),
            cell: ({ row }) => {
              const src = getImageSrc(row.original)
              const alt = getImageAlt?.(row.original) ?? ""
              return (
                <div className="flex items-center justify-center">
                  {src ? (
                    <img
                      src={src}
                      alt={alt}
                      className="h-10 w-10 rounded-md object-cover bg-muted"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
              )
            },
            enableSorting: false,
            enableHiding: false,
            size: 56,
          }
        : null

      return [selectCol, ...(imageCol ? [imageCol] : []), ...columns]
    }, [columns, getImageSrc, getImageAlt, imageColumnHeader]),
    state: {
      sorting,
      rowSelection,
    },
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const nextState =
        typeof updater === "function" ? updater(rowSelection) : updater
      setRowSelection(nextState)

      if (onSelectionChange) {
        const selectedIds = Object.entries(nextState)
          .filter(([, selected]) => selected)
          .map(([rowId]) => {
            const row = table.getRowModel().rowsById[rowId]
            return row?.original.id
          })
          .filter((id): id is TData["id"] => id != null)
        onSelectionChange(selectedIds)
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const selectedCount = table.getSelectedRowModel().rows.length
  const totalCount = data.length

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearch(value)
    onSearchChange?.(value)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="h-9 max-w-xs"
          />
          <div className="text-xs text-muted-foreground">
            {totalCount} {totalLabel}
            {selectedCount > 0 && (
              <span className="ml-2 font-medium text-foreground">
                • {selectedCount} selected
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">{toolbarActions}</div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap text-xs font-medium text-muted-foreground",
                        canSort && "cursor-pointer select-none"
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {sorted === "asc" && (
                        <span className="ml-1 text-[10px]">▲</span>
                      )}
                      {sorted === "desc" && (
                        <span className="ml-1 text-[10px]">▼</span>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-xs text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2 text-xs">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-xs text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination stub */}
      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
        <span>
          Showing {totalCount > 0 ? 1 : 0}–{totalCount} of {totalCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
