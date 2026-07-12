/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SidebarAdmin from "../../components/admin/SidebarAdmin";
import AdminHeader from "../../components/admin/AdminHeader";
import { horseService } from "../../services/horseService";
import { X, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminLayout() {
  const location = useLocation();
  const adminTitles = {
    "/admin": "Báo cáo phân tích tổng quan",
    "/admin/users": "Quản lý người dùng",
    "/admin/tournaments": "Quản lý giải đấu",
    "/admin/horses": "Danh sách ngựa",
    "/admin/races": "Quản lý chặng đua",
    "/admin/discrepancies": "Xử lý sai lệch",
    "/admin/violations": "Vi phạm kỷ luật",
    "/admin/points": "Quản lý ví điểm",
  };
  const currentTitle = adminTitles[location.pathname] ?? "Bảng điều khiển Admin";
  const [globalSearchValue, setGlobalSearchValue] = useState("");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    horseName: "",
    breed: "",
    yearBorn: new Date().getFullYear() - 3,
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    trainerName: "",
    stableInfo: ""
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (!formData.horseName.trim()) throw new Error("Chưa nhập tên ngựa đua");
      if (!formData.breed.trim()) throw new Error("Chưa nhập giống ngựa");
      if (!formData.ownerName.trim()) throw new Error("Chưa nhập tên chủ sở hữu");

      const result = await horseService.registerNewHorse({
        ...formData,
        yearBorn: parseInt(formData.yearBorn, 10)
      });

      setSuccessMessage(`Đăng ký thành công! Ngựa ${result.horseName} đang ở trạng thái chờ thẩm định.`);
      setFormData({
        horseName: "",
        breed: "",
        yearBorn: new Date().getFullYear() - 3,
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        trainerName: "",
        stableInfo: ""
      });

      // Clear success and close modal after delay
      setTimeout(() => {
        setSuccessMessage("");
        setIsRegisterModalOpen(false);
      }, 3000);
    } catch (err) {
      setErrorMessage(err.message || "Không thể lưu dữ liệu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex font-sans">
      {/* Sidebar navigation */}
      <SidebarAdmin onOpenRegisterHorseModal={() => setIsRegisterModalOpen(true)} />

      {/* Main viewport */}
      <div className="flex-1 flex flex-col pl-68 min-w-0">
        <AdminHeader
          title={currentTitle}
          searchValue={globalSearchValue}
          onSearch={setGlobalSearchValue}
        />

        <main className="flex-1 p-8 overflow-y-auto no-scrollbar">
          <Outlet context={{ globalSearchValue, setGlobalSearchValue }} />
        </main>

        <footer className="h-14 border-t border-[#30363D] px-8 flex justify-between items-center text-[10px] font-sans text-on-surface-variant bg-surface select-none">
          <span>&copy; {new Date().getFullYear()} GRANDSTRIDE TURF CLUB INC. TẤT CẢ QUYỀN ĐƯỢC BẢO LƯU</span>
          <span className="font-mono tracking-wide">PHL-V4.2 // CLOUD INGRESS ACTIVE</span>
        </footer>
      </div>

      {/* Overlaid Register New Horse Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-[#060f16]/80 flex items-center justify-center z-99 p-4 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="w-full max-w-xl bg-[#161B22] rounded-2xl border border-[#30363D] overflow-hidden shadow-2xl relative">
            {/* Top decorative gradient bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary/60"></div>

            {/* Modal Header */}
            <div className="p-6 border-b border-[#30363D] flex justify-between items-center select-none bg-surface-container-low/40">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-secondary fill-current text-opacity-10" />
                <div>
                  <h2 className="font-serif font-black text-secondary tracking-wide uppercase text-sm">
                    Đăng Ký Hồ Sơ Ngựa Đua
                  </h2>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                    Tạo lập biểu mẫu kê khai tư cách tham gia giải đua GrandStride
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  setIsRegisterModalOpen(false);
                }}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-error/10 border border-error/20 flex gap-2.5 items-start text-xs text-error">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 flex gap-2.5 items-start text-xs text-primary">
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Grid elements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Tên Ngựa <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="text"
                    name="horseName"
                    required
                    value={formData.horseName}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Midnight Thunder"
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/40 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Giống Ngựa (Breed) <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="text"
                    name="breed"
                    required
                    value={formData.breed}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Arabian Thoroughbred"
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/40 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Năm Sinh (Giới hạn 1990-2026) <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="number"
                    name="yearBorn"
                    min="1990"
                    max="2026"
                    required
                    value={formData.yearBorn}
                    onChange={handleInputChange}
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Họ Tên Chủ Sở Hữu <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    required
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Arthur Pendelton"
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/40 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Email Chủ Sở Hữu
                  </label>
                  <input
                    type="email"
                    name="ownerEmail"
                    value={formData.ownerEmail}
                    onChange={handleInputChange}
                    placeholder="chuhuu@example.com"
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/40 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Số Điện Thoại Liên Hệ
                  </label>
                  <input
                    type="text"
                    name="ownerPhone"
                    value={formData.ownerPhone}
                    onChange={handleInputChange}
                    placeholder="+84 9xx xxx xxx"
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/40 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Họ Tên Huấn Luyện Viên
                  </label>
                  <input
                    type="text"
                    name="trainerName"
                    value={formData.trainerName}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Sarah Jenkins"
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/40 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    Sắp Xếp Chuồng Trại
                  </label>
                  <input
                    type="text"
                    name="stableInfo"
                    value={formData.stableInfo}
                    onChange={handleInputChange}
                    placeholder="Chuồng số, Phân khu paddock..."
                    className="bg-surface-container-low border border-[#30363D] text-xs text-on-surface placeholder:text-on-surface-variant/40 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-primary transition-all font-sans"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-[#30363D] flex justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4.5 py-2 border border-[#30363D] rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận đăng ký"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
