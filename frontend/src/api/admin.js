import { getAccessToken } from '../utils/token'

async function readError(res, fallback) {
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty */
  }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`)
}

function authHeaders() {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function listAdminUsers(roleCode) {
  const qs = roleCode ? `?roleCode=${encodeURIComponent(roleCode)}` : ''
  const res = await fetch(`/api/admin/users${qs}`, { headers: authHeaders() })
  if (!res.ok) await readError(res, 'Không tải được danh sách người dùng')
  const data = await res.json()
  return Array.isArray(data?.users) ? data.users : []
}

export async function getAdminUserById(userId) {
  const res = await fetch(`/api/admin/users/${userId}`, { headers: authHeaders() })
  if (!res.ok) await readError(res, 'Không tải được người dùng')
  const data = await res.json()
  return data?.user ?? data
}

export async function createAdminUser(payload) {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) await readError(res, 'Tạo người dùng thất bại')
  const data = await res.json()
  return data?.user ?? data
}

export async function updateAdminUser(userId, payload) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) await readError(res, 'Cập nhật người dùng thất bại')
  const data = await res.json()
  return data?.user ?? data
}

export async function deleteAdminUser(userId) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) await readError(res, 'Vô hiệu hóa người dùng thất bại')
  const data = await res.json()
  return data?.user ?? data
}

export async function toggleAdminUserActive(userId) {
  const res = await fetch(`/api/admin/users/${userId}/toggle-active`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  if (!res.ok) await readError(res, 'Đổi trạng thái thất bại')
  const data = await res.json()
  return data?.user ?? data
}

export async function changeAdminUserRole(userId, roleCode) {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ roleCode, confirm: true }),
  })
  if (!res.ok) await readError(res, 'Đổi vai trò thất bại')
  const data = await res.json()
  return data?.user ?? data
}

/**
 * Admin Referee Management
 */
export async function listReferees() {
  const res = await fetch('/api/admin/users?roleCode=REFEREE', { headers: authHeaders() })
  if (!res.ok) await readError(res, 'Không tải được danh sách trọng tài')
  const data = await res.json()
  return Array.isArray(data?.users) ? data.users : []
}

export async function getRefereeStats() {
  const res = await fetch('/api/admin/referees/stats', { headers: authHeaders() })
  if (!res.ok) await readError(res, 'Không tải được thống kê trọng tài')
  return res.json()
}
