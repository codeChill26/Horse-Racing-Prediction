/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function DataTable({
    columns,
    data = [],
    filterOptions = [],
    searchPlaceholder = "Tìm kiếm...",
    searchKey = "name",
    externalSearchValue,
    onExternalSearchChange,
    hideSearch = false,
    onRowClick,
    title
}) {
    const [localSearchValue, setLocalSearchValue] = useState("");
    const searchValue = externalSearchValue !== undefined ? externalSearchValue : localSearchValue;
    
    const handleSearchChange = (val) => {
        if (onExternalSearchChange) onExternalSearchChange(val);
        else setLocalSearchValue(val);
        setCurrentPage(1);
    };

    const [selectedFilters, setSelectedFilters] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Handle filter changes
    const handleFilterChange = (filterKey, value) => {
        setSelectedFilters((prev) => ({
            ...prev,
            [filterKey]: value
        }));
        setCurrentPage(1);
    };

    // Reset filters
    const resetFilters = () => {
        setSelectedFilters({});
        if (onExternalSearchChange) onExternalSearchChange("");
        else setLocalSearchValue("");
        setCurrentPage(1);
    };

    // Filtered and searched data computation
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            // Search matching
            const itemSearchVal = String(item[searchKey] || "").toLowerCase();
            const matchesSearch = itemSearchVal.includes(searchValue.toLowerCase());

            // Filter option matching
            const matchesFilters = Object.entries(selectedFilters).every(([key, value]) => {
                if (!value || value === "all") return true;
                return String(item[key]) === String(value);
            });

            return matchesSearch && matchesFilters;
        });
    }, [data, searchValue, selectedFilters, searchKey]);

    // Paginated computation
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage]);

    const rangeStart = (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

    return (
        <div className="bg-[#161B22] rounded-xl border border-[#30363D] overflow-hidden flex flex-col relative ambient-shadow">
            {/* Accent strip */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>

            {/* Toolbar controls */}
            <div className="p-5 border-b border-[#30363D] flex flex-wrap gap-4 justify-between items-center bg-surface-container-low/50">
                <h3 className="font-serif font-bold text-sm text-on-surface tracking-wider ml-1">
                    {title || "Danh sách dữ liệu"}
                </h3>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Universal table search */}
                    {!hideSearch && (
                        <div className="relative group">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchValue}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="bg-surface-container-lowest border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/50 rounded-lg pl-8.5 pr-4 py-1.5 focus:outline-none focus:border-primary-fixed w-64 transition-all"
                            />
                        </div>
                    )}

                    {/* Dynamic Dropdown Filters */}
                    {filterOptions.map((filter) => (
                        <div key={filter.key} className="relative">
                            <select
                                value={selectedFilters[filter.key] || "all"}
                                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                className="bg-surface-container-lowest border border-[#30363D] text-xs text-on-surface rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-primary cursor-pointer appearance-none font-sans"
                            >
                                <option value="all">Tất cả {filter.label}</option>
                                {filter.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-on-surface-variant">
                                <ChevronLeft className="-rotate-90 w-3 h-3 text-on-surface-variant" />
                            </div>
                        </div>
                    ))}

                    {/* Excel Export placeholder */}
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#30363D] rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
                    >
                        Đặt lại
                    </button>
                </div>
            </div>

            {/* Main Table view */}
            <div className="overflow-x-auto select-none pl-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#30363D] text-[11px] font-sans font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low/30">
                            {columns.map((col) => (
                                <th key={col.key} className="py-4 px-6 font-semibold">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="font-sans text-xs divide-y divide-[#30363D]/60 index-table-rows">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, rowIndex) => (
                                <tr
                                    key={item.id || rowIndex}
                                    className="hover:bg-[#1C2128] transition-colors group cursor-pointer"
                                    onClick={() => onRowClick && onRowClick(item)}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className="py-4 px-6">
                                            {col.render ? col.render(item) : item[col.key] || "-"}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-12 text-on-surface-variant">
                                    Không có bản ghi trùng khớp với bộ lọc tìm kiếm.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination control footer */}
            <div className="p-4 border-t border-[#30363D] flex items-center justify-between bg-surface-container-low/30 select-none">
                <span className="text-[11px] font-sans text-on-surface-variant">
                    Hiển thị {filteredData.length > 0 ? rangeStart : 0}-{rangeEnd} trên tổng số {filteredData.length} bản ghi
                </span>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded border border-[#30363D] text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center rounded font-sans text-xs transition-colors cursor-pointer ${currentPage === pageNum
                                    ? "bg-primary/10 text-primary border border-primary/30 font-bold"
                                    : "text-on-surface-variant hover:bg-surface-container-highest"
                                }`}
                        >
                            {pageNum}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded border border-[#30363D] text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
