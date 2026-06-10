export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/30 py-12 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 sm:px-8 max-w-[1200px] mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          {/* Logo */}
          <button
            onClick={() => onNavigate("dashboard")}
            className="font-serif text-3xl text-primary font-bold tracking-tight hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            GrandStride
          </button>

          <p className="font-sans text-xs text-on-tertiary-container/80 text-center md:text-left">
            © {new Date().getFullYear()} GrandStride. Bảo lưu mọi quyền. Đồng
            hành cùng nhà vô địch.
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Điều khoản dịch vụ: Bản sao giả lập hệ thống");
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors transition-opacity duration-300"
          >
            Điều Khoản Dịch Vụ
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Chính sách bảo mật: Bản sao chính sách mô phỏng");
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors transition-opacity duration-300"
          >
            Chính Sách Bảo Mật
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert(
                "Nếu cần hỗ trợ kỹ thuật hoặc góp ý, hãy gửi mail về support@grandstride.com"
              );
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors transition-opacity duration-300"
          >
            Liên Hệ Hỗ Trợ
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert(
                "Quy định đua ngựa chính thức: Áp dụng đầy đủ quy tắc tính trọng tải & thể thức nài ngựa."
              );
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors transition-opacity duration-300"
          >
            Luật Đua Ngựa
          </a>
        </nav>
      </div>
    </footer>
  );
}
