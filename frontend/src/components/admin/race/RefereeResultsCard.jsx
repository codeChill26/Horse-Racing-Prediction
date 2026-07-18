/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RefereeResultsCard Component
 *
 * Hiển thị kết quả trọng tài (OfficialRaceResult) trong trang chi tiết race.
 *
 * Data structure từ BE:
 * - race.status: 'PENDING_RESULT' | 'FINISHED' | 'ONGOING' | ...
 * - race.officialRaceResult.finalResults: [{ entryId, rank, horseName }]
 * - race.officialRaceResult.matchStatus: 'AUTO_MATCHED' | 'CONFLICTED'
 * - race.refereeA: { userId, fullName }
 * - race.refereeB: { userId, fullName }
 * - race.officialRaceResult.refereeAResult: { submittedAt, finalResults }
 * - race.officialRaceResult.refereeBResult: { submittedAt, finalResults }
 * - race.entries[].finishPosition: số thứ tự về đích (khi FINISHED)
 */

import { User, CheckCircle, AlertTriangle, Clock, Trophy, Medal } from "lucide-react";
import { formatDate } from "../../../utils/formatter";

function RankMedal({ rank }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <span className="rrc-medal" title={`Hạng ${rank}`}>
      {medals[rank] || `#${rank}`}
    </span>
  );
}

function RefereeSubmission({ referee, result, label }) {
  const hasSubmission = result && result.finalResults && result.finalResults.length > 0;

  return (
    <div className="rrc-submission">
      <div className="rrc-submission__header">
        <div className="rrc-submission__referee">
          <User size={14} />
          <span className="rrc-submission__label">{label}</span>
          <span className="rrc-submission__name">{referee?.fullName || "—"}</span>
        </div>
        {hasSubmission && result.submittedAt && (
          <div className="rrc-submission__time">
            <Clock size={12} />
            <span>{formatDate(result.submittedAt)}</span>
          </div>
        )}
      </div>

      {hasSubmission ? (
        <div className="rrc-submission__results">
          {result.finalResults.map((item, idx) => (
            <div key={item.entryId || idx} className="rrc-result-item">
              <RankMedal rank={item.rank} />
              <span className="rrc-result-item__rank">Hạng {item.rank}</span>
              <span className="rrc-result-item__horse">
                {item.horseName || `Entry #${item.entryId}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rrc-submission__empty">Chưa có kết quả</div>
      )}
    </div>
  );
}

function MatchStatusBadge({ status }) {
  if (status === "AUTO_MATCHED") {
    return (
      <div className="rrc-status rrc-status--ok">
        <CheckCircle size={14} />
        <span>Kết quả khớp nhau</span>
      </div>
    );
  }
  if (status === "CONFLICTED") {
    return (
      <div className="rrc-status rrc-status--warn">
        <AlertTriangle size={14} />
        <span>Có tranh chấp - Cần xử lý</span>
      </div>
    );
  }
  return (
    <div className="rrc-status rrc-status--info">
      <span>{status || "—"}</span>
    </div>
  );
}

/**
 * Bảng xếp hạng đầy đủ cho race FINISHED
 */
function FinalRankingTable({ entries }) {
  // Lọc entries có finishPosition và sắp xếp theo thứ tự
  const rankedEntries = entries
    .filter(e => e.finishPosition != null)
    .sort((a, b) => a.finishPosition - b.finishPosition);

  if (rankedEntries.length === 0) {
    return (
      <div className="rrc-empty-message">
        Chưa có kết quả xếp hạng
      </div>
    );
  }

  return (
    <div className="rrc-ranking-table">
      <div className="rrc-ranking-table__header">
        <span className="rrc-ranking-table__col rrc-ranking-table__col--rank">Hạng</span>
        <span className="rrc-ranking-table__col rrc-ranking-table__col--horse">Ngựa</span>
        <span className="rrc-ranking-table__col rrc-ranking-table__col--jockey">Jockey</span>
      </div>
      {rankedEntries.map((entry) => (
        <div
          key={entry.entryId}
          className={`rrc-ranking-row rrc-ranking-row--${entry.finishPosition <= 3 ? entry.finishPosition : 'other'}`}
        >
          <span className="rrc-ranking-table__col rrc-ranking-table__col--rank">
            {entry.finishPosition <= 3 ? (
              <RankMedal rank={entry.finishPosition} />
            ) : (
              <span className="rrc-rank-number">#{entry.finishPosition}</span>
            )}
          </span>
          <span className="rrc-ranking-table__col rrc-ranking-table__col--horse">
            <span className="rrc-horse-icon">🐎</span>
            {entry.horseName}
          </span>
          <span className="rrc-ranking-table__col rrc-ranking-table__col--jockey">
            {entry.jockeyName || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Thông tin cược & ví cho race FINISHED
 */
function BettingSummary({ statistics }) {
  if (!statistics) return null;

  const { totalPool, totalBets, participantCount } = statistics;

  return (
    <div className="rrc-betting">
      <div className="rrc-betting__header">
        <span className="rrc-betting__title">Cược & Ví</span>
      </div>
      <div className="rrc-betting__grid">
        <div className="rrc-betting__item">
          <span className="rrc-betting__label">Tổng quỹ cược</span>
          <span className="rrc-betting__value rrc-betting__value--highlight">
            {totalPool?.toLocaleString() || 0}
          </span>
        </div>
        <div className="rrc-betting__item">
          <span className="rrc-betting__label">Tổng cược</span>
          <span className="rrc-betting__value">
            {totalBets || 0}
          </span>
        </div>
        <div className="rrc-betting__item">
          <span className="rrc-betting__label">Người tham gia</span>
          <span className="rrc-betting__value">
            {participantCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RefereeResultsCard({ race, loading }) {
  if (loading) {
    return (
      <div className="rrc-card">
        <div className="rrc-card__header">
          <div className="rrc-skeleton rrc-skeleton--title" />
        </div>
        <div className="rrc-card__body">
          <div className="rrc-skeleton rrc-skeleton--text" />
          <div className="rrc-skeleton rrc-skeleton--text" />
        </div>
      </div>
    );
  }

  const raceStatus = race?.status;
  const officialResult = race?.officialRaceResult;
  const entries = race?.entries || [];

  // Khi FINISHED: hiển thị bảng xếp hạng đầy đủ
  if (raceStatus === "FINISHED") {
    const hasResults = entries.some(e => e.finishPosition != null);

    return (
      <div className="rrc-card">
        <div className="rrc-card__header">
          <h3 className="rrc-card__title">Kết quả chặng đua</h3>
          <div className="rrc-status rrc-status--finished">
            <Trophy size={14} />
            <span>Đã kết thúc</span>
          </div>
        </div>

        <div className="rrc-card__body">
          {hasResults ? (
            <>
              <div className="rrc-final__label">
                <Medal size={16} />
                <span>Bảng xếp hạng chung cuộc</span>
              </div>
              <FinalRankingTable entries={entries} />
            </>
          ) : (
            <div className="rrc-empty-message">
              Kết quả đang được cập nhật...
            </div>
          )}

          <BettingSummary statistics={race.statistics} />

          {officialResult && officialResult.publishedAt && (
            <div className="rrc-settled-info">
              <span className="rrc-settled-info__label">Đã thanh toán cược</span>
              <span className="rrc-settled-info__time">
                {formatDate(officialResult.publishedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Khi PENDING_RESULT: hiển thị kết quả trọng tài
  if (!officialResult) {
    return null;
  }

  const matchStatus = officialResult.matchStatus;
  const refereeAResult = officialResult.refereeAResult;
  const refereeBResult = officialResult.refereeBResult;

  return (
    <div className="rrc-card">
      <div className="rrc-card__header">
        <h3 className="rrc-card__title">Kết quả trọng tài</h3>
        <MatchStatusBadge status={matchStatus} />
      </div>

      <div className="rrc-card__body">
        <div className="rrc-submissions">
          <RefereeSubmission
            referee={race.refereeA}
            result={refereeAResult}
            label="Trọng tài A"
          />
          <div className="rrc-divider" />
          <RefereeSubmission
            referee={race.refereeB}
            result={refereeBResult}
            label="Trọng tài B"
          />
        </div>

        {matchStatus === "CONFLICTED" && (
          <div className="rrc-conflict-note">
            <AlertTriangle size={14} />
            <span>
              Kết quả 2 trọng tài khác nhau. Admin cần xử lý tranh chấp trước khi
              publish kết quả.
            </span>
          </div>
        )}

        {matchStatus === "AUTO_MATCHED" && (
          <div className="rrc-final">
            <span className="rrc-final__label">Kết quả chính thức:</span>
            <div className="rrc-final__podium">
              {officialResult.finalResults
                ?.slice(0, 3)
                .map((item, idx) => (
                  <div key={item.entryId || idx} className={`rrc-final__slot rrc-final__slot--${idx + 1}`}>
                    <RankMedal rank={item.rank} />
                    <span>{item.horseName || `Entry #${item.entryId}`}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RefereeResultsCard;
