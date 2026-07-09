import 'package:flutter/material.dart';

import '../../models/wallet_transaction.dart';
import '../../services/admin_wallets_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';
import 'admin_wallet_adjust_sheet.dart';

class AdminWalletUserDetailScreen extends StatefulWidget {
  const AdminWalletUserDetailScreen({
    super.key,
    required this.userId,
    this.userLabel,
    required this.onLogout,
  });

  final int userId;
  final String? userLabel;
  final VoidCallback onLogout;

  @override
  State<AdminWalletUserDetailScreen> createState() =>
      _AdminWalletUserDetailScreenState();
}

class _AdminWalletUserDetailScreenState
    extends State<AdminWalletUserDetailScreen> {
  final _service = AdminWalletsService();

  static const int _pageSize = 20;

  List<WalletTransaction> _transactions = [];
  int _page = 1;
  int _totalPages = 1;
  int _total = 0;
  bool _loading = false;
  bool _loadingMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFirstPage();
  }

  num get _currentBalance {
    if (_transactions.isEmpty) return 0;
    return _transactions.first.balanceAfter;
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _loading = true;
      _error = null;
      _page = 1;
      _transactions = [];
    });
    try {
      final result = await _service.getUserTransactions(
        widget.userId,
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
      final result = await _service.getUserTransactions(
        widget.userId,
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

  Future<void> _openAdjust() async {
    final result = await showAdminWalletAdjustSheet(
      context,
      userId: widget.userId,
      userLabel: widget.userLabel,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ví của user #${widget.userId}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            if (widget.userLabel != null && widget.userLabel!.isNotEmpty)
              Text(
                widget.userLabel!,
                style: const TextStyle(fontSize: 12, color: Colors.white70),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Điều chỉnh điểm',
            onPressed: _openAdjust,
            icon: const Icon(Icons.tune_rounded),
          ),
          IconButton(
            tooltip: 'Đăng xuất',
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      floatingActionButton: _transactions.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: _openAdjust,
              backgroundColor: AppColors.adminAccent,
              icon: const Icon(Icons.tune_rounded),
              label: const Text('Điều chỉnh'),
            ),
      body: RefreshIndicator(
        onRefresh: _loadFirstPage,
        color: AppColors.adminAccent,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _BalanceCard(
                  balance: _currentBalance,
                  totalTx: _total,
                  loading: _loading,
                ),
              ),
            ),
            if (_error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _ErrorBanner(message: _error!, onRetry: _loadFirstPage),
                ),
              ),
            if (_loading && _transactions.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_transactions.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'User chưa có giao dịch nào.',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final tx = _transactions[index];
                      return _TransactionCard(
                        tx: tx,
                        onTap: () => TransactionDetailSheet.show(context, tx),
                      );
                    },
                    childCount: _transactions.length,
                  ),
                ),
              ),
            if (_page < _totalPages && !_loading)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
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
                      label: Text(_loadingMore
                          ? 'Đang tải…'
                          : 'Tải thêm (trang ${_page + 1}/$_totalPages)'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({
    required this.balance,
    required this.totalTx,
    required this.loading,
  });

  final num balance;
  final int totalTx;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.adminAccent.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.account_balance_wallet_rounded, color: Colors.white),
              SizedBox(width: 8),
              Text(
                'Số dư hiện tại',
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            loading ? '— điểm' : '${formatPointsVi(balance)} điểm',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            loading ? 'Đang tải…' : 'Tổng $totalTx giao dịch',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _TransactionCard extends StatelessWidget {
  const _TransactionCard({required this.tx, required this.onTap});

  final WalletTransaction tx;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
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
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: badgeBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        isAdminAdj
                            ? Icons.tune_rounded
                            : (tx.isCredit
                                ? Icons.south_west
                                : Icons.north_east),
                        color: badgeFg,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 10),
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
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: tx.isCredit
                            ? const Color(0xFF065F46)
                            : const Color(0xFF991B1B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.schedule, size: 12, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      formatDateTimeVi(tx.createdAt),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.account_balance_wallet_outlined,
                        size: 12, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      'Sau: ${tx.balanceAfterLabel}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                if (tx.description != null && tx.description!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    tx.description!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                      fontStyle: FontStyle.italic,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
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