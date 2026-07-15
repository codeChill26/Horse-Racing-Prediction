// backend/src/utils/roleCodeVariants.js
//
// Chuẩn hoá danh sách role code được hệ thống coi là "cùng 1 vai trò".
//
// Bối cảnh:
//  - Seed hiện tại (prisma/seed.js) chuẩn hoá code = 'RACE_REFEREE'.
//  - Một số bản seed cũ / import dữ liệu từ các môi trường trước có thể lưu
//    variant 'Referee' hoặc 'REFEREE'. Nếu service chỉ match chính xác
//    `code === roleCode`, các user này sẽ bị "biến mất" khỏi danh sách.
//  - Để tránh 2 endpoint (/admin/referees, /admin/users?roleCode=...) trả về
//    khác nhau cho cùng một use-case, cả hai đều dùng helper này.

const REFEREE_ROLE_VARIANTS = Object.freeze(['RACE_REFEREE', 'Referee', 'REFEREE']);

/**
 * Trả về điều kiện Prisma `where.role` tương ứng với roleCode truyền vào.
 *  - Nếu roleCode khớp với một trong các variant của "referee" → match theo
 *    tập variant (dùng `code: { in: [...] }`).
 *  - Nếu là roleCode khác → match chính xác như cũ (giữ nguyên hành vi).
 *  - Nếu roleCode rỗng/undefined → trả về undefined (service xử lý tiếp).
 *
 * @param {string|undefined} roleCode
 * @returns {{ code: string | { in: string[] } } | undefined}
 */
function buildRoleWhereForCode(roleCode) {
  if (!roleCode) return undefined;

  const normalized = String(roleCode).trim();
  if (!normalized) return undefined;

  if (REFEREE_ROLE_VARIANTS.includes(normalized)) {
    return { code: { in: [...REFEREE_ROLE_VARIANTS] } };
  }

  return { code: normalized };
}

module.exports = {
  REFEREE_ROLE_VARIANTS,
  buildRoleWhereForCode,
};
