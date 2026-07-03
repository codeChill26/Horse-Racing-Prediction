import 'package:flutter/material.dart';

import '../../models/wallet_transaction.dart';
import '../../services/admin_users_service.dart';
import '../../services/admin_wallets_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';
import '../../models/admin_user.dart';
import 'admin_wallet_adjust_sheet.dart';
import 'admin_wallet_user_detail_screen.dart';

class AdminWalletsScreen extends StatefulWidget {
  const AdminWalletsScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<AdminWalletsScreen> createState() => _AdminWalletsScreenState();
}

class _AdminWalletsScreenState extends State<AdminWalletsScreen> {
  final _walletService = AdminWalletsService();
  final _usersService = AdminUsersService();
  final _searchController = TextEditingController();

  static const int _pageSize = 20;

  List<WalletTransaction> _transactions = [];
  int _page = 1;
  int _totalPages = 1;
  int _total = 0;
  bool _loading = false;
  bool _loadingMore = false;
  String? _error;
  String _typeFilter = '';
  String _search = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _search = _searchController.text);
    });
    _loadFirstPage();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _loading = true;
      _error = null;
      _page = 1;
      _transactions = [];
    });
    try {
      final result = await _walletService.getAllTransactions(
        page: 1,
        limit: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _transactions = result.transactions;
        _page = result.page;
        _totalPages = result.totalPages;
        _total = result.total;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _loadNextPage() async {
    if (_loadingMore || _page >= _totalPages) return;
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final result = await _walletService.getAllTransactions(
        page: next,
        limit: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _transactions = [..._transactions, ...result.transactions];
        _page = result.page;
        _totalPages = result.totalPages;
        _total = result.total;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingMore = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  ({int total, int visible, int creditCount, int debitCount}) get _stats {
    var credit = 0, debit = 0;
    for (final t in _transactions) {
      if (t.isCredit) {
        credit++;
      } else if (t.isDebit) {
        debit++;
      }
    }
    return (
      total: _total,
      visible: _transactions.length,
      creditCount: credit,
      debitCount: debit,
    );
  }

  List<WalletTransaction> get _filtered {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty && _typeFilter.isEmpty) return _transactions;
    return _transactions.where((t) {
      if (_typeFilter.isNotEmpty && t.type != _typeFilter) return false;
      if (q.isEmpty) return true;
      final ownerName = t.wallet?.userFullName?.toLowerCase() ?? '';
      final ownerEmail = t.wallet?.userEmail?.toLowerCase() ?? '';
      final desc = t.description?.toLowerCase() ?? '';
      return ownerName.contains(q) ||
          ownerEmail.contains(q) ||
          desc.contains(q) ||
          '${t.transactionId}'.contains(q) ||
          '${t.wallet?.userId ?? ''}'.contains(q);
    }).toList();
  }

  Future<void> _onTapTransaction(WalletTransaction tx) async {
    if (tx.wallet?.userId == null) {
      await TransactionDetailSheet.show(context, tx);
      return;
    }
    final ownerName = tx.wallet?.userFullName ?? tx.wallet?.userEmail ?? '';
    final action = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.account_balance_wallet_outlined),
              title: Text('Xem ví user #${tx.wallet!.userId}'),
              subtitle: Text(ownerName),
              onTap: () => Navigator.pop(ctx, 'detail'),
            ),
            ListTile(
              leading: const Icon(Icons.tune_rounded),
              title: Text('Điều chỉnh điểm user #${tx.wallet!.userId}'),
              subtitle: const Text('Nạp hoặc rút điểm thủ công'),
              onTap: () => Navigator.pop(ctx, 'adjust'),
            ),
            const Divider(height: 0),
            ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('Xem chi tiết giao dịch'),
              onTap: () => Navigator.pop(ctx, 'tx'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || action == null) return;
    switch (action) {
      case 'detail':
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => AdminWalletUserDetailScreen(
              userId: tx.wallet!.userId!,
              userLabel: ownerName,
              onLogout: widget.onLogout,
            ),
          ),
        );
        if (mounted) await _loadFirstPage();
        break;
      case 'adjust':
        await _openAdjustSheet(tx.wallet!.userId!, ownerName);
        break;
      case 'tx':
        await TransactionDetailSheet.show(context, tx);
        break;
    }
  }

  Future<void> _openAdjustSheet(int userId, String? label) async {
    final result = await showAdminWalletAdjustSheet(
      context,
      userId: userId,
      userLabel: label,
    );
    if (!mounted || result == null) return;
    await _loadFirstPage();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: result.isDeposit
            ? const Color(0xFF065F46)
            : const Color(0xFF991B1B),
        content: Text(
          result.isDeposit
              ? 'Đã nạp ${result.depositAbsLabel} điểm. Số dư mới: ${result.balanceLabel}'
              : 'Đã rút ${result.withdrawalAbsLabel} điểm. Số dư mới: ${result.balanceLabel}',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _openPickUserAdjust() async {
    final user = await showModalBottomSheet<AdminUser>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PickUserSheet(usersService: _usersService),
    );
    if (!mounted || user == null || user.userId == null) return;
    final label = user.fullName ?? user.email;
    await _openAdjustSheet(user.userId!, label);
  }

  static const _typeOptions = [
    '',
    'INITIAL_BONUS',
    'WEEKLY_BONUS',
    'ADMIN_ADJUSTMENT',
    'DEPOSIT',
    'BET_PLACED',
    'BET_WON',
    'BET_LOST',
    'BET_REFUND',
    'BET_WIN_REVERSAL',
  ];

  String _typeLabel(String code) {
    // Tận dụng static helper có sẵn trong model để luôn đồng bộ với tile hiển thị.
    return WalletTransaction.typeLabelOf(code);
  }

  @override
  Widget build(BuildContext context) {
    final s = _stats;
    final filtered = _filtered;

    return RefreshIndicator(
      onRefresh: _loadFirstPage,
      color: AppColors.adminAccent,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.adminDeep,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 16, bottom: 14, right: 56),
              title: const Text(
                'Quản lý ví điểm',
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
                    'assets/images/jockey-hero.jpg',
                    fit: BoxFit.cover,
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0x660F172A), Color(0xE60F172A)],
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
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final w = (constraints.maxWidth - 12) / 2;
                      return Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _StatCard(
                            width: w,
                            label: 'Tổng giao dịch',
                            value: _loading ? '—' : s.total.toString(),
                            sublabel: 'toàn hệ thống',
                            accent: true,
                          ),
                          _StatCard(
                            width: w,
                            label: 'Đang hiển thị',
                            value: _loading ? '—' : s.visible.toString(),
                            sublabel: _typeFilter.isNotEmpty || _search.isNotEmpty
                                ? 'sau khi lọc'
                                : 'trên trang này',
                          ),
                          _StatCard(
                            width: w,
                            label: 'Ghi có',
                            value: _loading ? '—' : s.creditCount.toString(),
                            sublabel: 'dòng tiền vào (trang)',
                            success: true,
                          ),
                          _StatCard(
                            width: w,
                            label: 'Ghi nợ',
                            value: _loading ? '—' : s.debitCount.toString(),
                            sublabel: 'dòng tiền ra (trang)',
                            danger: true,
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Tên, email, user ID, mô tả…',
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
                          initialValue: _typeFilter,
                          decoration: InputDecoration(
                            labelText: 'Loại giao dịch',
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                          ),
                          items: _typeOptions
                              .map(
                                (c) => DropdownMenuItem(
                                  value: c,
                                  child: Text(c.isEmpty ? 'Tất cả' : _typeLabel(c)),
                                ),
                              )
                              .toList(),
                          onChanged: _loading
                              ? null
                              : (v) => setState(() => _typeFilter = v ?? ''),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filledTonal(
                        onPressed: _loading ? null : _loadFirstPage,
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
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _openPickUserAdjust,
                          icon: const Icon(Icons.person_search_rounded),
                          label: const Text('Chọn user để điều chỉnh'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.adminAccent,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    _ErrorBanner(message: _error!, onRetry: _loadFirstPage),
                  ],
                ],
              ),
            ),
          ),
          if (_loading && _transactions.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (filtered.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Chưa có giao dịch nào.',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final tx = filtered[index];
                    return _TransactionTile(
                      tx: tx,
                      onTap: () => _onTapTransaction(tx),
                    );
                  },
                  childCount: filtered.length,
                ),
              ),
            ),
          if (_page < _totalPages && !_loading)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _loadingMore ? null : _loadNextPage,
                    icon: _loadingMore
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.expand_more_rounded),
                    label: Text(_loadingMore ? 'Đang tải…' : 'Tải thêm (trang ${_page + 1}/$_totalPages)'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.width,
    required this.label,
    required this.value,
    this.sublabel,
    this.success = false,
    this.danger = false,
    this.accent = false,
  });

  final double width;
  final String label;
  final String value;
  final String? sublabel;
  final bool success;
  final bool danger;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    Color? border;
    Color? bg;
    Color valueColor = AppColors.heading;

    if (success) {
      bg = const Color(0xFFECFDF5);
      border = const Color(0xFFA7F3D0);
      valueColor = const Color(0xFF065F46);
    } else if (danger) {
      bg = const Color(0xFFFEF2F2);
      border = const Color(0xFFFECACA);
      valueColor = const Color(0xFF991B1B);
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
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: valueColor),
            ),
            if (sublabel != null) ...[
              const SizedBox(height: 4),
              Text(
                sublabel!,
                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.tx, required this.onTap});

  final WalletTransaction tx;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ownerLabel = tx.wallet?.userFullName ?? tx.wallet?.userEmail ?? '—';
    final isAdminAdj = tx.type == 'ADMIN_ADJUSTMENT';

    Color badgeBg, badgeFg;
    if (isAdminAdj) {
      badgeBg = AppColors.adminAccent.withValues(alpha: 0.10);
      badgeFg = AppColors.adminAccent;
    } else if (tx.isCredit) {
      badgeBg = const Color(0xFFECFDF5);
      badgeFg = const Color(0xFF065F46);
    } else {
      badgeBg = const Color(0xFFFEF2F2);
      badgeFg = const Color(0xFF991B1B);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isAdminAdj
                        ? Icons.tune_rounded
                        : (tx.isCredit ? Icons.south_west : Icons.north_east),
                    color: badgeFg,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              tx.typeLabel,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.heading,
                              ),
                            ),
                          ),
                          Text(
                            tx.amountLabel,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: tx.isCredit
                                  ? const Color(0xFF065F46)
                                  : const Color(0xFF991B1B),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.person_outline,
                            size: 12,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              ownerLabel,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            formatDateTimeVi(tx.createdAt),
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PickUserSheet extends StatefulWidget {
  const _PickUserSheet({required this.usersService});

  final AdminUsersService usersService;

  @override
  State<_PickUserSheet> createState() => _PickUserSheetState();
}

class _PickUserSheetState extends State<_PickUserSheet> {
  final _searchController = TextEditingController();
  List<AdminUser> _users = [];
  bool _loading = true;
  String _roleFilter = '';

  static const _roles = ['', 'SPECTATOR', 'JOCKEY', 'HORSE_OWNER', 'RACE_REFEREE'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await widget.usersService.listUsers(
        roleCode: _roleFilter.isEmpty ? null : _roleFilter,
      );
      if (!mounted) return;
      setState(() {
        _users = list;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _users = [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _searchController.text.trim().toLowerCase();
    final filtered = q.isEmpty
        ? _users
        : _users.where((u) {
            return (u.email?.toLowerCase().contains(q) ?? false) ||
                (u.fullName?.toLowerCase().contains(q) ?? false) ||
                '${u.userId}'.contains(q);
          }).toList();

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Column(
          children: [
            Container(
              width: 42,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Chọn user để điều chỉnh điểm',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Tìm email, tên, ID…',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: DropdownButtonFormField<String>(
                initialValue: _roleFilter,
                decoration: InputDecoration(
                  labelText: 'Vai trò',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                ),
                items: _roles
                    .map((r) => DropdownMenuItem(
                          value: r,
                          child: Text(r.isEmpty ? 'Tất cả' : r),
                        ))
                    .toList(),
                onChanged: (v) {
                  setState(() => _roleFilter = v ?? '');
                  _load();
                },
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? const Center(
                          child: Text(
                            'Không tìm thấy user.',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 6),
                          itemBuilder: (_, i) {
                            final u = filtered[i];
                            return ListTile(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(color: AppColors.border),
                              ),
                              tileColor: Colors.white,
                              leading: CircleAvatar(
                                backgroundColor: AppColors.adminAccent
                                    .withValues(alpha: 0.15),
                                child: Text(
                                  u.initials,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.adminAccent,
                                  ),
                                ),
                              ),
                              title: Text(u.fullName ?? '—'),
                              subtitle: Text(
                                '${u.email ?? '—'} · ${u.role?.code ?? '—'}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => Navigator.pop(context, u),
                            );
                          },
                        ),
            ),
          ],
        ),
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