/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal";
import { tournamentService } from "../../services/tournamentService";
import { raceService } from "../../services/raceService";

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const emptyForm = () => ({
  name: "",
  description: "",
  startAt: "",
  endAt: "",
  refereeAId: "",
  refereeBId: "",
  sendNotification: false,
  notificationMessage: "",
});

export default function AdminTournamentFormModal({ tournamentId, onClose, onSaved, onCreatedToast }) {
  const isEdit = Boolean(tournamentId);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [referees, setReferees] = useState([]);
  const [loadingReferees, setLoadingReferees] = useState(false);

  // Track initial referee values so we can detect "changed" on save.
  const [initialReferees, setInitialReferees] = useState({ refereeAId: "", refereeBId: "" });

  useEffect(() => {
    // Load referees list
    let cancelled = false;
    (async () => {
      setLoadingReferees(true);
      try {
        const list = await raceService.listReferees();
        if (!cancelled) setReferees(list);
      } catch (e) {
        if (!cancelled) console.warn("[TournamentForm] load referees failed:", e);
      } finally {
        if (!cancelled) setLoadingReferees(false);
      }
    })();

    if (!isEdit) return;

    // Load tournament data for edit mode
    let cancelled2 = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const t = await tournamentService.getTournamentById(tournamentId);
        if (cancelled2 || cancelled) return;
        const aId = t.refereeAId ? String(t.refereeAId) : "";
        const bId = t.refereeBId ? String(t.refereeBId) : "";
        setInitialReferees({ refereeAId: aId, refereeBId: bId });
        setForm((prev) => ({
          ...prev,
          name: t.name ?? "",
          description: t.description ?? "",
          startAt: toDatetimeLocalValue(t.startAt),
          endAt: toDatetimeLocalValue(t.endAt),
          refereeAId: aId,
          refereeBId: bId,
          // Track current tournament status so referee section can show only when editable
          _status: t.status,
        }));
      } catch (e) {
        if (!cancelled2 && !cancelled) setError(e.message || "Không tải được giải đấu");
      } finally {
        if (!cancelled2 && !cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelled2 = true;
    };
  }, [isEdit, tournamentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // === Client-side validation ===
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên giải đấu");
      return;
    }

    const startDate = form.startAt ? new Date(form.startAt) : null;
    const endDate = form.endAt ? new Date(form.endAt) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      setError("Thời điểm bắt đầu không hợp lệ");
      return;
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      setError("Thời điểm kết thúc không hợp lệ");
      return;
    }
    if (startDate && endDate && endDate <= startDate) {
      setError("Thời điểm kết thúc phải sau thời điểm bắt đầu");
      return;
    }

    // Validate referee selection nếu có chọn
    if (form.refereeAId && form.refereeBId && form.refereeAId === form.refereeBId) {
      setError("Trọng tài A và B phải khác nhau");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        startAt: fromDatetimeLocalValue(form.startAt),
        endAt: fromDatetimeLocalValue(form.endAt),
      };

      let saved;
      if (isEdit) {
        saved = await tournamentService.updateTournament(tournamentId, payload);
      } else {
        saved = await tournamentService.createTournament(payload);
      }

      const tournamentIdResolved = saved.tournamentId ?? saved.id ?? tournamentId;

      // Track side-effect results để show feedback
      let assignOk = false;
      let assignResult = null;
      let notifyOk = false;
      let assignFailedReason = "";
      let notifyFailedReason = "";

      // === CREATE MODE ===
      if (!isEdit) {
        // Assign referees if selected
        if (form.refereeAId && form.refereeBId) {
          try {
            const result = await tournamentService.assignRefereesToTournament(
              tournamentIdResolved,
              Number(form.refereeAId),
              Number(form.refereeBId)
            );
            assignOk = true;
            // Lưu thông tin pre-assignment để parent toast thông báo
            if (result && typeof result === "object" && !result.tournamentId) {
              assignResult = result;
            }
          } catch (refErr) {
            assignFailedReason = refErr?.message || "Không rõ";
            console.warn("[TournamentForm] assign referees failed:", refErr);
          }
        }

        // Send notification if checked
        if (form.sendNotification) {
          const defaultMsg = `Giải đấu "${form.name}" đang mở đăng ký. Hãy đăng ký ngựa của bạn!`;
          try {
            await tournamentService.notifyHorseOwners(
              tournamentIdResolved,
              form.notificationMessage || defaultMsg
            );
            notifyOk = true;
          } catch (notifyErr) {
            notifyFailedReason = notifyErr?.message || "Không rõ";
            console.warn("[TournamentForm] notify owners failed:", notifyErr);
          }
        }
      } else {
        // === EDIT MODE ===
        // Chỉ cho phép đổi trọng tài khi giải còn ở DRAFT hoặc OPEN.
        const editableStatus = form._status === "DRAFT" || form._status === "OPEN";
        const bothSelected =
          form.refereeAId && form.refereeBId && form.refereeAId !== form.refereeBId;

        if (editableStatus && bothSelected) {
          // Chỉ gọi API khi thực sự thay đổi so với ban đầu
          const initialA = initialReferees.refereeAId ?? "";
          const initialB = initialReferees.refereeBId ?? "";
          const changed =
            form.refereeAId !== initialA || form.refereeBId !== initialB;

          if (changed) {
            try {
              await tournamentService.assignRefereesToTournament(
                tournamentIdResolved,
                Number(form.refereeAId),
                Number(form.refereeBId)
              );
              assignOk = true;
            } catch (refErr) {
              assignFailedReason = refErr?.message || "Không rõ";
              console.warn("[TournamentForm] update referees failed:", refErr);
            }
          }
        }
      }

      // Build feedback string cho parent
      const warnings = [];
      const hints = [];
      if (!isEdit && form.refereeAId && form.refereeBId && !assignOk) {
        warnings.push(`Phân công trọng tài thất bại: ${assignFailedReason}`);
      }
      if (
        !isEdit &&
        assignOk &&
        assignResult &&
        Array.isArray(assignResult.results) &&
        assignResult.results.length === 0 &&
        assignResult.preAssignment?.sent
      ) {
        hints.push(
          `Giải đấu chưa có chặng đua — đã gửi thông báo pre-assignment cho ${assignResult.preAssignment.sent} trọng tài.`,
        );
      }
      if (!isEdit && form.sendNotification && !notifyOk) {
        warnings.push(`Gửi thông báo thất bại: ${notifyFailedReason}`);
      }

      onSaved?.(
        warnings.length > 0 || hints.length > 0
          ? { warnings, hints }
          : undefined,
      );
      onCreatedToast?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Không lưu được giải đấu");
    } finally {
      setSaving(false);
    }
  };

  const refereeChanged =
    isEdit &&
    (form.refereeAId !== (initialReferees.refereeAId ?? "") ||
      form.refereeBId !== (initialReferees.refereeBId ?? "")) &&
    (form._status === "DRAFT" || form._status === "OPEN") &&
    form.refereeAId &&
    form.refereeBId &&
    form.refereeAId !== form.refereeBId;

  const footer = (
    <>
      <button type="button" className="adm-t-btn adm-t-btn--ghost" onClick={onClose} disabled={saving}>
        Hủy
      </button>
      <button type="submit" form="adm-t-form" className="adm-t-btn adm-t-btn--primary" disabled={saving}>
        {saving
          ? "Đang lưu..."
          : isEdit
            ? refereeChanged
              ? "Cập nhật & phân công lại"
              : "Cập nhật"
            : "Tạo giải"}
      </button>
    </>
  );

  return (
    <AdminModal
      size="lg"
      accent="gold"
      title={isEdit ? "Chỉnh sửa giải đấu" : "Tạo giải đấu mới"}
      subtitle={
        isEdit
          ? "Cập nhật thông tin giải đấu. Trạng thái hiện tại được giữ nguyên."
          : "Giải mới mặc định ở trạng thái Đang chờ (DRAFT). Bạn có thể chuyển sang Đang mở sau khi tạo."
      }
      onClose={onClose}
      footer={loading ? null : footer}
    >
      {loading ? (
        <div className="adm-t-modal__loading">
          <div className="adm-t-spinner" />
        </div>
      ) : (
        <form id="adm-t-form" onSubmit={handleSubmit}>
          {error && <AdminModalAlert type="error">{error}</AdminModalAlert>}

          <AdminModalSection
            title="Thông tin cơ bản"
            description="Tên và mô tả giúp khán giả nhận diện giải đấu."
          >
            <AdminModalField label="Tên giải đấu" required>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Ví dụ: Cúp GrandStride 2026"
              />
            </AdminModalField>

            <AdminModalField
              label="Mô tả"
              hint="Thông tin địa điểm, quy định, giải thưởng..."
            >
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Mô tả chi tiết giải đấu..."
              />
            </AdminModalField>
          </AdminModalSection>

          <AdminModalSection
            title="Thời gian"
            description="Khung thời gian tổ chức giải. Có thể cập nhật sau."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Bắt đầu">
                <input
                  type="datetime-local"
                  name="startAt"
                  value={form.startAt}
                  onChange={handleChange}
                />
              </AdminModalField>

              <AdminModalField label="Kết thúc">
                <input
                  type="datetime-local"
                  name="endAt"
                  value={form.endAt}
                  onChange={handleChange}
                />
              </AdminModalField>
            </div>
          </AdminModalSection>

          {(!isEdit || form._status === "DRAFT" || form._status === "OPEN") && (
            <>
              <AdminModalSection
                title={isEdit ? "Phân công lại trọng tài" : "Phân công trọng tài"}
                description={
                  isEdit
                    ? "Đổi trọng tài khi giải còn ở trạng thái DRAFT hoặc OPEN. Hệ thống sẽ re-assign cho tất cả race SCHEDULED trong giải."
                    : "Chọn 2 trọng tài cho giải đấu. Cả hai phải được chấp nhận trước khi bắt đầu."
                }
              >
                {!isEdit && (
                  <AdminModalAlert type="info">
                    <strong>Lưu ý:</strong> Nếu giải đấu chưa có chặng đua, hệ thống vẫn gửi
                    thông báo <em>“pre-assignment”</em> cho 2 trọng tài. Khi bạn tạo chặng đua
                    trong giải sau này, trọng tài sẽ nhận thêm thông báo cụ thể theo từng chặng.
                  </AdminModalAlert>
                )}
                <div className="gs-modal-section gs-modal-section--grid">
                  <AdminModalField label="Trọng tài A">
                    <select
                      name="refereeAId"
                      value={form.refereeAId}
                      onChange={handleChange}
                      disabled={saving || loadingReferees}
                    >
                      <option value="">Chọn trọng tài…</option>
                      {referees.map((r) => (
                        <option
                          key={r.userId}
                          value={String(r.userId)}
                          disabled={r.userId === Number(form.refereeBId)}
                        >
                          {r.fullName}
                        </option>
                      ))}
                    </select>
                  </AdminModalField>

                  <AdminModalField label="Trọng tài B">
                    <select
                      name="refereeBId"
                      value={form.refereeBId}
                      onChange={handleChange}
                      disabled={saving || loadingReferees}
                    >
                      <option value="">Chọn trọng tài…</option>
                      {referees.map((r) => (
                        <option
                          key={r.userId}
                          value={String(r.userId)}
                          disabled={r.userId === Number(form.refereeAId)}
                        >
                          {r.fullName}
                        </option>
                      ))}
                    </select>
                  </AdminModalField>
                </div>
                {(form.refereeAId && form.refereeBId && form.refereeAId === form.refereeBId) && (
                  <AdminModalAlert type="warning">
                    Hai trọng tài phải khác nhau.
                  </AdminModalAlert>
                )}
                {isEdit &&
                  (form.refereeAId !== (initialReferees.refereeAId ?? "") ||
                    form.refereeBId !== (initialReferees.refereeBId ?? "")) && (
                    <AdminModalAlert type="info">
                      Sẽ re-assign trọng tài cho tất cả race SCHEDULED trong giải và gửi thông báo tới trọng tài mới.
                    </AdminModalAlert>
                  )}
              </AdminModalSection>

              {!isEdit && (
                <AdminModalSection
                  title="Thông báo"
                  description="Gửi thông báo đến chủ ngựa để đăng ký ngựa cho giải đấu."
                >
                  <AdminModalField label="Gửi thông báo">
                    <div className="gs-checkbox-wrap">
                      <input
                        type="checkbox"
                        id="sendNotification"
                        name="sendNotification"
                        checked={form.sendNotification}
                        onChange={(e) => setForm((f) => ({ ...f, sendNotification: e.target.checked }))}
                        disabled={saving}
                        className="gs-checkbox"
                      />
                      <label htmlFor="sendNotification" className="gs-checkbox-label">
                        Gửi thông báo đến tất cả chủ ngựa
                      </label>
                    </div>
                  </AdminModalField>
                  {form.sendNotification && (
                    <AdminModalField label="Nội dung thông báo" hint="Tối đa 500 ký tự">
                      <textarea
                        name="notificationMessage"
                        value={form.notificationMessage}
                        onChange={handleChange}
                        rows={3}
                        maxLength={500}
                        disabled={saving}
                        placeholder={`Giải đấu "${form.name || '...'}" đang mở đăng ký. Hãy đăng ký ngựa của bạn!`}
                      />
                    </AdminModalField>
                  )}
                </AdminModalSection>
              )}
            </>
          )}
        </form>
      )}
    </AdminModal>
  );
}
