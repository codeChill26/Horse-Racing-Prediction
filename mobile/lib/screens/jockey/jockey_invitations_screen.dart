import 'package:flutter/material.dart';

import '../../models/jockey_invitation.dart';
import '../../services/invitations_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/invitation_status_labels.dart';

class JockeyInvitationsScreen extends StatefulWidget {
  const JockeyInvitationsScreen({super.key});

  @override
  State<JockeyInvitationsScreen> createState() => _JockeyInvitationsScreenState();
}

class _JockeyInvitationsScreenState extends State<JockeyInvitationsScreen> {
  final _service = InvitationsService();
  List<JockeyInvitation> _invitations = [];
  String? _statusFilter;
  bool _loading = true;
  String? _error;
  int? _respondingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _service.listInvitations(status: _statusFilter);
      if (!mounted) return;
      setState(() {
        _invitations = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _accept(JockeyInvitation inv) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Đồng ý lời mời?'),
        content: Text(
          'Bạn đồng ý cưỡi ngựa ${inv.horseName ?? ''} '
          'tại chặng ${inv.raceName ?? ''}?\n\n'
          'Chủ ngựa vẫn cần chốt bạn trước khi đăng ký thi đấu chính thức.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.jockeyPrimary),
            child: const Text('Đồng ý'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    await _respond(inv, 'ACCEPTED');
  }

  Future<void> _decline(JockeyInvitation inv) async {
    final reasonController = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Từ chối lời mời'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            labelText: 'Lý do từ chối',
            hintText: 'Ví dụ: Trùng lịch thi đấu khác',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          FilledButton(
            onPressed: () {
              final text = reasonController.text.trim();
              if (text.isEmpty) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(content: Text('Vui lòng nhập lý do từ chối.')),
                );
                return;
              }
              Navigator.pop(ctx, text);
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.errorText),
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
    reasonController.dispose();
    if (reason == null || reason.isEmpty) return;

    await _respond(inv, 'DECLINED', declineReason: reason);
  }

  Future<void> _respond(
    JockeyInvitation inv,
    String status, {
    String? declineReason,
  }) async {
    setState(() => _respondingId = inv.invitationId);
    try {
      await _service.respondInvitation(
        invitationId: inv.invitationId,
        status: status,
        declineReason: declineReason,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            status == 'ACCEPTED'
                ? 'Đã đồng ý! Chờ chủ ngựa chốt bạn.'
                : 'Đã từ chối lời mời.',
          ),
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _respondingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingCount = _invitations.where((i) => i.status == 'PENDING').length;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF7F5),
      appBar: AppBar(
        backgroundColor: AppColors.jockeyDeep,
        foregroundColor: Colors.white,
        title: const Text('Lời mời thi đấu'),
        actions: [
          if (!_loading && pendingCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.jockeyAccent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$pendingCount chờ',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.jockeyDeep,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.jockeyMuted,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.jockeyAccent.withValues(alpha: 0.4)),
            ),
            child: const Text(
              'Lời mời từ chủ ngựa để bạn cưỡi ngựa tại một chặng đua. '
              'Đồng ý chỉ là bước đầu — chủ ngựa cần chốt bạn trước khi tạo đăng ký thi đấu.',
              style: TextStyle(fontSize: 12, height: 1.4, color: AppColors.heading),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                _FilterChip(
                  label: 'Tất cả',
                  selected: _statusFilter == null,
                  onTap: () {
                    setState(() => _statusFilter = null);
                    _load();
                  },
                ),
                _FilterChip(
                  label: 'Đang chờ',
                  selected: _statusFilter == 'PENDING',
                  onTap: () {
                    setState(() => _statusFilter = 'PENDING');
                    _load();
                  },
                ),
                _FilterChip(
                  label: 'Đã đồng ý',
                  selected: _statusFilter == 'ACCEPTED',
                  onTap: () {
                    setState(() => _statusFilter = 'ACCEPTED');
                    _load();
                  },
                ),
                _FilterChip(
                  label: 'Đã từ chối',
                  selected: _statusFilter == 'DECLINED',
                  onTap: () {
                    setState(() => _statusFilter = 'DECLINED');
                    _load();
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.jockeyPrimary))
                : _error != null
                    ? _ErrorPane(message: _error!, onRetry: _load)
                    : _invitations.isEmpty
                        ? const _EmptyPane()
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: AppColors.jockeyPrimary,
                            child: ListView.separated(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.all(16),
                              itemCount: _invitations.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 10),
                              itemBuilder: (context, i) {
                                final inv = _invitations[i];
                                return _InvitationCard(
                                  invitation: inv,
                                  responding: _respondingId == inv.invitationId,
                                  onAccept: inv.canRespond ? () => _accept(inv) : null,
                                  onDecline: inv.canRespond ? () => _decline(inv) : null,
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _InvitationCard extends StatelessWidget {
  const _InvitationCard({
    required this.invitation,
    required this.responding,
    this.onAccept,
    this.onDecline,
  });

  final JockeyInvitation invitation;
  final bool responding;
  final VoidCallback? onAccept;
  final VoidCallback? onDecline;

  @override
  Widget build(BuildContext context) {
    final statusColor = invitationStatusColor(invitation.status);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.jockeyMuted,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text('🐴', style: TextStyle(fontSize: 20)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      invitation.ownerName ?? 'Chủ ngựa',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.heading,
                      ),
                    ),
                    if (invitation.ownerEmail != null)
                      Text(
                        invitation.ownerEmail!,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  invitationStatusLabelVi(invitation.status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _InfoRow(
            icon: Icons.emoji_events_outlined,
            label: 'Chặng đua',
            text: invitation.raceName ?? 'Chặng #${invitation.raceId}',
          ),
          _InfoRow(
            icon: Icons.pets_outlined,
            label: 'Ngựa',
            text: invitation.horseName ?? 'Ngựa #${invitation.horseId}',
          ),
          if (invitation.status == 'ACCEPTED') ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.jockeyAccent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.hourglass_top, size: 16, color: AppColors.jockeyPrimary),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Bạn đã đồng ý — chờ chủ ngựa chốt để đăng ký thi đấu.',
                      style: TextStyle(fontSize: 12, color: AppColors.jockeyPrimary),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (onAccept != null || onDecline != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: responding ? null : onDecline,
                    icon: const Icon(Icons.close, size: 18),
                    label: const Text('Từ chối'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.errorText,
                      side: const BorderSide(color: AppColors.errorBorder),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: responding ? null : onAccept,
                    icon: responding
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check, size: 18),
                    label: Text(responding ? 'Đang gửi…' : 'Đồng ý'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.jockeyPrimary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.text,
  });

  final IconData icon;
  final String label;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 6),
          Text('$label: ', style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.heading),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: AppColors.jockeyAccent.withValues(alpha: 0.35),
        checkmarkColor: AppColors.jockeyPrimary,
      ),
    );
  }
}

class _ErrorPane extends StatelessWidget {
  const _ErrorPane({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.errorText, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.errorText)),
            const SizedBox(height: 12),
            TextButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }
}

class _EmptyPane extends StatelessWidget {
  const _EmptyPane();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inbox_outlined, size: 48, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text(
              'Chưa có lời mời',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.heading),
            ),
            SizedBox(height: 6),
            Text(
              'Khi chủ ngựa mời bạn cưỡi ngựa thi đấu, lời mời sẽ hiện ở đây.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
