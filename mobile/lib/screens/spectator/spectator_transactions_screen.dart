import 'package:flutter/material.dart';

import '../../models/wallet_transaction.dart';
import '../../services/spectator_api.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';

class SpectatorTransactionsScreen extends StatefulWidget {
  const SpectatorTransactionsScreen({super.key, required this.api});

  final SpectatorApi api;

  @override
  State<SpectatorTransactionsScreen> createState() => _SpectatorTransactionsScreenState();
}

class _SpectatorTransactionsScreenState extends State<SpectatorTransactionsScreen> {
  TransactionPage _page = TransactionPage.fromJson(null);
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  static const int _pageSize = 20;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
  }

  Future<void> _load({bool reset = false}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
      });
    } else {
      if (!_page.hasNext || _loadingMore) return;
      setState(() => _loadingMore = true);
    }

    final pageToLoad = reset ? 1 : _page.page + 1;
    try {
      final next = await widget.api.getMyTransactions(page: pageToLoad, limit: _pageSize);
      if (!mounted) return;
      setState(() {
        if (reset) {
          _page = next;
        } else {
          _page = TransactionPage(
            transactions: [..._page.transactions, ...next.transactions],
            page: next.page,
            limit: next.limit,
            total: next.total,
            totalPages: next.totalPages,
          );
        }
        _loading = false;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F5),
      appBar: AppBar(
        title: const Text('Lịch sử giao dịch'),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: AppColors.green,
        onRefresh: () => _load(reset: true),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 240),
          Center(child: CircularProgressIndicator(color: AppColors.green)),
        ],
      );
    }
    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: 220,
            child: _ErrorState(message: _error!, onRetry: () => _load(reset: true)),
          ),
        ],
      );
    }
    final items = _page.transactions;
    if (items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 180),
          _EmptyState(),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: items.length + 1,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        if (index == items.length) {
          if (!_page.hasNext) return const SizedBox(height: 24);
          return _LoadMoreFooter(
            loading: _loadingMore,
            onPress: () => _load(),
          );
        }
        return _TransactionTile(item: items[index]);
      },
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.item});

  final WalletTransaction item;

  @override
  Widget build(BuildContext context) {
    final isCredit = item.isCredit;
    final color = isCredit ? AppColors.green : AppColors.errorText;
    final sign = isCredit ? '+' : '';
    final iconData = _iconFor(item.type);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Icon(iconData, color: color, size: 22),
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
                        item.typeLabel,
                        style: const TextStyle(
                          color: AppColors.heading,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      '$sign${formatPointsVi(item.amount)}',
                      style: TextStyle(
                        color: color,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                if ((item.description ?? '').isNotEmpty)
                  Text(
                    item.description!,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.3),
                  ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      formatDateTimeVi(item.createdAt),
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                    const Spacer(),
                    Text(
                      'Sau GD: ${formatPointsVi(item.balanceAfter)}',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'BET_PLACED':
        return Icons.flag_outlined;
      case 'BET_WON':
        return Icons.emoji_events_outlined;
      case 'BET_REFUND':
        return Icons.replay_outlined;
      case 'ADMIN_ADJUSTMENT':
        return Icons.tune_outlined;
      case 'WEEKLY_BONUS':
        return Icons.card_giftcard_outlined;
      case 'BET_LOST':
        return Icons.cancel_outlined;
      default:
        return Icons.swap_horiz_outlined;
    }
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        Icon(Icons.inbox_outlined, color: AppColors.textMuted, size: 56),
        SizedBox(height: 10),
        Text(
          'Chưa có giao dịch nào',
          style: TextStyle(color: AppColors.heading, fontSize: 15),
        ),
        SizedBox(height: 4),
        Text(
          'Mỗi lần đặt cược hoặc nhận thưởng sẽ hiển thị ở đây.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
        ),
      ],
    );
  }
}

class _LoadMoreFooter extends StatelessWidget {
  const _LoadMoreFooter({required this.loading, required this.onPress});

  final bool loading;
  final VoidCallback onPress;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 18),
        child: Center(child: CircularProgressIndicator(color: AppColors.green)),
      );
    }
    return Center(
      child: TextButton(
        onPressed: onPress,
        child: const Text('Tải thêm'),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off, color: AppColors.textMuted, size: 56),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.heading)),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử lại'),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.green),
          ),
        ],
      ),
    );
  }
}
