/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Award,
  Trophy,
  Flag,
  AlertTriangle,
  Gavel,
  Wallet,
  Settings,
  HelpCircle,
  PlusCircle,
  Sparkles,
  LogOut
} from "lucide-react";
import { horseService } from "../../services/horseService";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../../api/auth";
import { clearAuthTokens, getAccessToken, getRefreshToken } from "../../utils/token";

export default function SidebarAdmin({ onOpenRegisterHorseModal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingHorsesCount, setPendingHorsesCount] = useState(0);

  const onLogout = async () => {
    try {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (accessToken) {
        await logoutUser({ accessToken, refreshToken });
      }
    } catch (e) {
      console.error(e);
    }
    clearAuthTokens();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    async function loadCounter() {
      try {
        const count = await horseService.getPendingCount();
        setPendingHorsesCount(count);
      } catch (e) {
        console.error(e);
      }
    }
    loadCounter();
    // Poll naturally to reflect approval updates
    const interval = setInterval(loadCounter, 4000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    {
      path: "/admin",
      label: "Tổng Quan",
      icon: TrendingUp,
      end: true,
    },
    {
      path: "/admin/users",
      label: "Người Dùng",
      icon: Users
    },
    {
      path: "/admin/horses",
      label: "Danh Sách Ngựa",
      icon: Award,
      badge: pendingHorsesCount > 0 ? pendingHorsesCount : null
    },
    {
      path: "/admin/tournaments",
      label: "Giải Đấu",
      icon: Trophy
    },
    {
      path: "/admin/races",
      label: "Chặng Đua",
      icon: Flag
    },
    {
      path: "/admin/discrepancies",
      label: "Xử Lý Sai Lệch",
      icon: AlertTriangle
    },
    {
      path: "/admin/violations",
      label: "Vi Phạm Kỷ Luật",
      icon: Gavel
    },
    {
      path: "/admin/referees",
      label: "Trọng Tài",
      icon: Flag
    },
    {
      path: "/admin/points",
      label: "Quản Lý Ví Điểm",
      icon: Wallet
    }
  ];

  return (
    <aside
      id="side-nav-bar"
      className="w-68 h-screen bg-surface-container border-r border-[#30363D] flex flex-col py-8 px-4 fixed left-0 top-0 z-55 overflow-y-auto custom-scrollbar"
    >
      {/* Brand & Identity */}
      <div className="px-4 mb-8 flex flex-col gap-1.5 shrink-0">
        <span className="font-serif text-2xl font-black text-primary tracking-tight leading-none">
          GrandStride
        </span>
        <span className="font-sans text-[10px] text-on-surface-variant font-bold tracking-widest uppercase">
          Bảng Điều Khiển Admin
        </span>
      </div>

      {/* Primary Action Button (CTA) */}
      <div className="px-2 mb-6 shrink-0">
        <button
          onClick={onOpenRegisterHorseModal}
          className="w-full flex items-center justify-center gap-2.5 py-3 bg-secondary text-on-secondary rounded-lg font-sans font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all ambient-shadow cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 fill-current text-on-secondary" />
          Đăng ký ngựa đua
        </button>
      </div>

      {/* Navigation items list */}
      <nav className="flex-1 flex flex-col gap-1.5 px-1 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.path || location.pathname === `${item.path}/`
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const IconComponent = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              id={`sidebar-link-${item.path.replace("/", "") || "home"}`}
              className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg font-sans font-medium text-sm transition-all duration-150 group cursor-pointer ${isActive
                ? "bg-primary-container text-on-primary-container font-semibold shadow-inner scale-[0.98]"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
            >
              <div className="flex items-center gap-3.5">
                <IconComponent
                  className={`w-5 h-5 transition-transform duration-120 group-hover:scale-105 ${isActive ? "text-primary fill-current text-opacity-15" : "text-on-surface-variant"
                    }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-error-container text-on-error-container text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footwear Links & User summary */}
      <div className="mt-auto px-1 pt-6 border-t border-[#30363D] shrink-0 flex flex-col gap-3">
        {/* <div className="flex items-center gap-3.5 px-4 py-2 text-on-surface-variant hover:text-on-surface text-sm font-sans transition-colors cursor-pointer">
          <Settings className="w-5 h-5" />
          <span>Cấu hình hệ thống</span>
        </div>
        <div className="flex items-center gap-3.5 px-4 py-2 text-on-surface-variant hover:text-on-surface text-sm font-sans transition-colors cursor-pointer">
          <HelpCircle className="w-5 h-5" />
          <span>Trung tâm trợ giúp</span>
        </div> */}

        {/* Administrator account card */}
        <div className="mt-2 p-3 bg-surface-container-lowest rounded-xl border border-[#30363D]/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-secondary bg-secondary/10">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDQe7xhLOPxA6y9IIfkApl7FhKmmw0DxYu58vMwvKONWX2u_w7n9JTUccxiEmQLL59_alvRiVekBKy9-ippEeN90DPeR0OoI6YOK9MTtc8_RVxIK3bAuz9BlWN8TlTzZ26NnSvYjF572q6FMQkTfcV_JStH5rbyCt98fRdaclrEnJpW1gKp5EqxSR_HN-M_ezaL_T7NFwL-KS6g8b0SKjMvEHl164vN8bko0u1FyFRfhDJTmAzGMtY1COn6kpN_AnBNdAvcSoD9QoL"
              alt="Avatar quản trị viên"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-sans font-semibold text-xs text-on-surface truncate">
              Quản trị viên
            </span>
            {/* <span className="text-[9px] text-on-surface-variant uppercase font-mono tracking-wider truncate">
              ID: 001-ALPHA
            </span> */}
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3.5 px-4 py-2 text-error hover:bg-error/10 rounded-lg text-sm font-sans font-medium transition-colors cursor-pointer w-full text-left"
        >
          <LogOut className="w-5 h-5 text-error" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
