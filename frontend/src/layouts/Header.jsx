/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, Bell, Settings as SettingsIcon, LogOut, Menu } from "lucide-react";

export default function Header({ title, onSearch, searchValue }) {
  return (
    <header className="h-20 bg-surface border-b border-[#30363D] px-8 sticky top-0 z-40 flex items-center justify-between">
      {/* Dynamic Header Information */}
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button className="md:hidden p-2 text-on-surface-variant hover:text-on-surface">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-lg font-black text-primary uppercase tracking-wide">
            GrandStride Admin
          </h1>
          <div className="hidden sm:block h-5 w-[1px] bg-[#30363D] mx-2"></div>
          <span className="hidden sm:inline font-sans text-xs text-on-surface-variant font-medium">
            {title || "Bảng quản trị hệ thống"}
          </span>
        </div>
      </div>

      {/* Primary Actions Area */}
      <div className="flex items-center gap-5">
        {/* Universal Search Box */}
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Tìm kiếm hồ sơ..."
            value={searchValue || ""}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-60 bg-surface-container-high border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/60 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all font-sans"
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button className="relative p-2.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container-highest transition-all rounded-full cursor-pointer group">
            <Bell className="w-4.5 h-4.5 group-hover:scale-105" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full animate-pulse"></span>
          </button>
          <button className="p-2.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container-highest transition-all rounded-full cursor-pointer group">
            <SettingsIcon className="w-4.5 h-4.5 group-hover:rotate-45 transition-transform duration-200" />
          </button>
        </div>

        {/* Administrator profile label */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#30363D]">
          <span className="hidden lg:inline font-sans font-semibold text-xs text-secondary">
            Ban Điều Hành
          </span>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#30363D] bg-surface-container-high">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuArF5u0mhzKdmjoZTscG1BSiZxlxFCHCGHEhsC6T5WCsyQWx6rZoZjC962iVURIVoS1-J9APb9Br6JCEssImz4InpqBf8YASw2f43GSvGBn6iPwfHdYri_YPo7MnHVZj3DagBE9kLpuSmREzluGsndTeZ6yuJiaG6RgMOKjzzDjABQK0oadTP1LZ8V-ggLPbj0XsFJWSej7PU3XHJ3ATh15fUPSwr78lSkzPdTRzM-VWeBUZJz6PvMf53BFwcVJpSjJGf9d9oOVlHIw"
              alt="Admin Profile"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}