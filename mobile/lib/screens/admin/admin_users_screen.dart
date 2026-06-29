import 'package:flutter/material.dart';

import '../../models/admin_user.dart';
import '../../services/admin_users_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/role_labels.dart';
import 'admin_user_form_sheet.dart';

const _roleCodes = ['ADMIN', 'RACE_REFEREE', 'HORSE_OWNER', 'JOCKEY', 'SPECTATOR'];

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final _service = AdminUsersService();
  final _searchController = TextEditingController();

  List<AdminUser> _users = [];
  bool _loading = true;
  String? _error;
  String _roleFilter = '';
  String _search = '';
  int? _busyUserId;
  int? _expandedUserId;

  void _toggleExpand(int userId) {
    setState(() {
      _expandedUserId = _expandedUserId == userId ? null : userId;
    });
  }

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _search = _searchController.text);
    });
    _loadUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _service.listUsers(
        roleCode: _roleFilter.isEmpty ? null : _roleFilter,
      );
      if (!mounted) return;
      setState(() {
        _users = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _users = [];
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  List<AdminUser> get _filteredUsers {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return _users;
    return _users.where((u) {
      return (u.email?.toLowerCase().contains(q) ?? false) ||
          (u.fullName?.toLowerCase().contains(q) ?? false) ||
          '${u.userId}'.contains(q);
    }).toList();
  }

  ({int total, int active, int inactive, String topRole}) get _stats {
    final active = _users.where((u) => u.isActive).length;
    final byRole = <String, int>{};
    for (final code in _roleCodes) {
      byRole[code] = _users.where((u) => u.role?.code == code).length;
    }
    var topRole = '—';
    var topCount = 0;
    byRole.forEach((code, count) {
      if (count > topCount) {
        topCount = count;
        topRole = roleLabelVi(code);
      }
    });
    return (
      total: _users.length,
      active: active,
      inactive: _users.length - active,
      topRole: topRole,
    );
  }

  void _replaceUser(AdminUser updated) {
    setState(() {
      _users = _users
          .map((u) => u.userId == updated.userId ? updated : u)
          .toList();
    });
  }

  Future<void> _onToggleActive(AdminUser user) async {
    setState(() => _busyUserId = user.userId);
    setState(() => _error = null);
    try {
      final updated = await _service.toggleActive(user.userId!);
      _replaceUser(updated);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busyUserId = null);
    }
  }

  Future<void> _onChangeRole(AdminUser user, String nextRole) async {
    if (nextRole == user.role?.code) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Đổi vai trò'),
        content: Text(
          'User #${user.userId} (${user.email})\n\n'
          '${roleLabelVi(user.role?.code)} → ${roleLabelVi(nextRole)}?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _busyUserId = user.userId);
    setState(() => _error = null);
    try {
      final updated = await _service.changeRole(user.userId!, nextRole);
      _replaceUser(updated);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busyUserId = null);
    }
  }

  Future<void> _onDeactivate(AdminUser user) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Vô hiệu hóa'),
        content: Text(
          'Vô hiệu hóa user #${user.userId} (${user.email})?\n\n'
          'Tài khoản sẽ đặt isActive = false và thu hồi phiên.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: const Text('Vô hiệu hóa'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _busyUserId = user.userId);
    setState(() => _error = null);
    try {
      final updated = await _service.deactivate(user.userId!);
      _replaceUser(updated);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busyUserId = null);
    }
  }

  Future<void> _showRolePicker(AdminUser user) async {
    final current = user.role?.code ?? _roleCodes.first;
    final picked = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Chọn vai trò',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
            ..._roleCodes.map(
              (code) => ListTile(
                title: Text(roleLabelVi(code)),
                trailing: code == current ? const Icon(Icons.check, color: AppColors.adminAccent) : null,
                onTap: () => Navigator.pop(ctx, code),
              ),
            ),
          ],
        ),
      ),
    );
    if (picked != null) await _onChangeRole(user, picked);
  }

  Future<void> _openCreate() async {
    final ok = await showAdminUserFormSheet(context);
    if (ok == true) await _loadUsers();
  }

  Future<void> _openEdit(AdminUser user) async {
    if (user.userId == null) return;
    final ok = await showAdminUserFormSheet(context, userId: user.userId);
    if (ok == true) await _loadUsers();
  }

  @override
  Widget build(BuildContext context) {
    final s = _stats;
    final filtered = _filteredUsers;

    return RefreshIndicator(
      onRefresh: _loadUsers,
      color: AppColors.adminAccent,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.adminDeep,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 16, bottom: 14, right: 56),
              title: const Text(
                'Quản lý người dùng',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    'assets/images/dua-ngua-duong-bang.jpg',
                    fit: BoxFit.cover,
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x660F172A),
                          Color(0xE60F172A),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                tooltip: 'Đăng xuất',
                onPressed: widget.onLogout,
                icon: const Icon(Icons.logout_rounded),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _StatsRow(
                    loading: _loading,
                    total: s.total,
                    active: s.active,
                    inactive: s.inactive,
                    topRole: s.topRole,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Email, họ tên, ID…',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _roleFilter.isEmpty ? '' : _roleFilter,
                          decoration: InputDecoration(
                            labelText: 'Vai trò',
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          items: [
                            const DropdownMenuItem(value: '', child: Text('Tất cả')),
                            ..._roleCodes.map(
                              (c) => DropdownMenuItem(
                                value: c,
                                child: Text(roleLabelVi(c)),
                              ),
                            ),
                          ],
                          onChanged: _loading
                              ? null
                              : (v) {
                                  setState(() => _roleFilter = v ?? '');
                                  _loadUsers();
                                },
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filledTonal(
                        onPressed: _loading ? null : _loadUsers,
                        icon: _loading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.refresh_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _openCreate,
                      icon: const Icon(Icons.person_add_rounded),
                      label: const Text('Tạo người dùng'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.adminAccent,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    _ErrorBanner(message: _error!, onRetry: _loadUsers),
                  ],
                ],
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (filtered.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text(
                  'Không có người dùng phù hợp.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final user = filtered[index];
                    return _UserCard(
                      user: user,
                      expanded: _expandedUserId == user.userId,
                      busy: _busyUserId == user.userId,
                      onTap: user.userId == null
                          ? null
                          : () => _toggleExpand(user.userId!),
                      onEdit: () => _openEdit(user),
                      onToggleActive: () => _onToggleActive(user),
                      onChangeRole: () => _showRolePicker(user),
                      onDeactivate: () => _onDeactivate(user),
                    );
                  },
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.loading,
    required this.total,
    required this.active,
    required this.inactive,
    required this.topRole,
  });

  final bool loading;
  final int total;
  final int active;
  final int inactive;
  final String topRole;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _StatCard(width: w, label: 'Tổng người dùng', value: loading ? '—' : '$total'),
            _StatCard(
              width: w,
              label: 'Đang hoạt động',
              value: loading ? '—' : '$active',
              success: true,
            ),
            _StatCard(width: w, label: 'Đã vô hiệu', value: loading ? '—' : '$inactive'),
            _StatCard(
              width: w,
              label: 'Vai trò phổ biến',
              value: loading ? '—' : topRole,
              small: true,
              accent: true,
            ),
          ],
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.width,
    required this.label,
    required this.value,
    this.success = false,
    this.accent = false,
    this.small = false,
  });

  final double width;
  final String label;
  final String value;
  final bool success;
  final bool accent;
  final bool small;

  @override
  Widget build(BuildContext context) {
    Color? border;
    Color? bg;
    Color valueColor = AppColors.heading;

    if (success) {
      bg = const Color(0xFFECFDF5);
      border = const Color(0xFFA7F3D0);
      valueColor = const Color(0xFF065F46);
    } else if (accent) {
      bg = AppColors.adminAccent.withValues(alpha: 0.08);
      border = AppColors.adminAccent.withValues(alpha: 0.35);
      valueColor = AppColors.adminAccent;
    }

    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bg ?? Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border ?? AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: small ? 13 : 20,
                fontWeight: FontWeight.w700,
                color: valueColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({
    required this.user,
    required this.expanded,
    required this.busy,
    required this.onTap,
    required this.onEdit,
    required this.onToggleActive,
    required this.onChangeRole,
    required this.onDeactivate,
  });

  final AdminUser user;
  final bool expanded;
  final bool busy;
  final VoidCallback? onTap;
  final VoidCallback onEdit;
  final VoidCallback onToggleActive;
  final VoidCallback onChangeRole;
  final VoidCallback onDeactivate;

  @override
  Widget build(BuildContext context) {
    final roleCode = user.role?.code ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: expanded
              ? AppColors.adminAccent.withValues(alpha: 0.45)
              : user.isActive
                  ? AppColors.border
                  : const Color(0xFFFECACA),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppColors.adminAccent.withValues(alpha: 0.15),
                      child: Text(
                        user.initials,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.adminAccent,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.fullName ?? '—',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.heading,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _StatusBadge(isActive: user.isActive),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  roleLabelVi(roleCode),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.adminPrimary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      expanded ? Icons.expand_less : Icons.chevron_right,
                      color: AppColors.textMuted,
                    ),
                  ],
                ),
                AnimatedCrossFade(
                  firstChild: const SizedBox.shrink(),
                  secondChild: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 14),
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      _DetailRow(label: 'ID', value: '#${user.userId}'),
                      _DetailRow(label: 'Email', value: user.email ?? '—'),
                      if (user.phoneNumber?.isNotEmpty == true)
                        _DetailRow(label: 'SĐT', value: user.phoneNumber!),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: busy ? null : onEdit,
                              icon: const Icon(Icons.edit_outlined, size: 18),
                              label: const Text('Sửa'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.adminAccent,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: busy ? null : onChangeRole,
                              icon: const Icon(Icons.badge_outlined, size: 18),
                              label: const Text('Vai trò'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: busy ? null : onToggleActive,
                              icon: Icon(
                                user.isActive
                                    ? Icons.lock_outline
                                    : Icons.lock_open_rounded,
                                size: 18,
                              ),
                              label: Text(user.isActive ? 'Khóa' : 'Mở'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: busy ? null : onDeactivate,
                              icon: const Icon(
                                Icons.delete_outline,
                                color: Color(0xFFDC2626),
                              ),
                              label: const Text('Vô hiệu'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFDC2626),
                                padding: const EdgeInsets.symmetric(vertical: 8),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (busy) ...[
                        const SizedBox(height: 10),
                        const Center(
                          child: SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                      ],
                    ],
                  ),
                  crossFadeState: expanded
                      ? CrossFadeState.showSecond
                      : CrossFadeState.showFirst,
                  duration: const Duration(milliseconds: 200),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.isActive});

  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        isActive ? 'Hoạt động' : 'Vô hiệu',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: isActive ? const Color(0xFF065F46) : const Color(0xFF991B1B),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 52,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.heading,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.errorBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message, style: const TextStyle(color: AppColors.errorText)),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
