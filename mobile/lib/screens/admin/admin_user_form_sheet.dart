import 'package:flutter/material.dart';

import '../../services/admin_users_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/role_labels.dart';

const _roleCodes = ['ADMIN', 'RACE_REFEREE', 'HORSE_OWNER', 'JOCKEY', 'SPECTATOR'];

/// [userId] null = tạo mới; có id = chỉnh sửa (GET + PATCH + đổi role nếu cần).
Future<bool?> showAdminUserFormSheet(BuildContext context, {int? userId}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _AdminUserFormSheet(userId: userId),
  );
}

Future<bool?> showCreateAdminUserSheet(BuildContext context) =>
    showAdminUserFormSheet(context);

class _AdminUserFormSheet extends StatefulWidget {
  const _AdminUserFormSheet({this.userId});

  final int? userId;

  bool get isEdit => userId != null;

  @override
  State<_AdminUserFormSheet> createState() => _AdminUserFormSheetState();
}

class _AdminUserFormSheetState extends State<_AdminUserFormSheet> {
  final _service = AdminUsersService();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  String _roleCode = 'SPECTATOR';
  String _initialRoleCode = 'SPECTATOR';
  bool _loading = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.isEdit) {
      _loadUser();
    }
  }

  Future<void> _loadUser() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await _service.getUserById(widget.userId!);
      if (!mounted) return;
      setState(() {
        _email.text = user.email ?? '';
        _fullName.text = user.fullName ?? '';
        _phone.text = user.phoneNumber ?? '';
        _roleCode = user.role?.code ?? 'SPECTATOR';
        _initialRoleCode = _roleCode;
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

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _fullName.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final fullName = _fullName.text.trim();
    final password = _password.text;

    if (!widget.isEdit) {
      final email = _email.text.trim();
      if (!email.contains('@')) {
        setState(() => _error = 'Email không hợp lệ.');
        return;
      }
      if (password.length < 8) {
        setState(() => _error = 'Mật khẩu phải có ít nhất 8 ký tự.');
        return;
      }
      if (fullName.isEmpty) {
        setState(() => _error = 'Họ tên là bắt buộc.');
        return;
      }

      setState(() {
        _saving = true;
        _error = null;
      });

      try {
        final payload = {
          'email': email,
          'password': password,
          'fullName': fullName,
          'roleCode': _roleCode,
        };
        final phone = _phone.text.trim();
        if (phone.isNotEmpty) payload['phoneNumber'] = phone;

        await _service.createUser(payload);
        if (!mounted) return;
        Navigator.of(context).pop(true);
      } catch (e) {
        if (!mounted) return;
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _saving = false;
        });
      }
      return;
    }

    if (fullName.isEmpty) {
      setState(() => _error = 'Họ tên không được để trống.');
      return;
    }
    if (password.isNotEmpty && password.length < 8) {
      setState(() => _error = 'Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final payload = <String, dynamic>{
        'fullName': fullName,
        'phoneNumber': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
      };
      if (password.length >= 8) payload['password'] = password;

      await _service.updateUser(widget.userId!, payload);

      if (_roleCode != _initialRoleCode) {
        await _service.changeRole(widget.userId!, _roleCode);
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final isEdit = widget.isEdit;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isEdit ? 'Chỉnh sửa #${widget.userId}' : 'Tạo người dùng',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.heading,
              ),
            ),
            const SizedBox(height: 16),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              if (isEdit)
                InputDecorator(
                  decoration: const InputDecoration(labelText: 'Email'),
                  child: Text(
                    _email.text.isEmpty ? '—' : _email.text,
                    style: const TextStyle(fontSize: 15),
                  ),
                )
              else
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: isEdit ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu (≥ 8 ký tự)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _fullName,
                decoration: const InputDecoration(labelText: 'Họ và tên'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Số điện thoại'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                key: ValueKey(_roleCode),
                initialValue: _roleCode,
                decoration: const InputDecoration(labelText: 'Vai trò'),
                items: _roleCodes
                    .map(
                      (c) => DropdownMenuItem(
                        value: c,
                        child: Text(roleLabelVi(c)),
                      ),
                    )
                    .toList(),
                onChanged: _saving
                    ? null
                    : (v) {
                        if (v != null) setState(() => _roleCode = v);
                      },
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.errorText)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: (_loading || _saving) ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.adminAccent,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                _saving
                    ? 'Đang lưu…'
                    : (isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
