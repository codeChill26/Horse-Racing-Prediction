/**
 * SpectatorRaceResultsPage — Trang kết quả race cho Spectator.
 * Xem rank, status (FINISHED/DNF/DQ) của các con ngựa trong race đã kết thúc.
 *
 * Route: /spectator/races/:raceId/results
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { raceResultsService } from '../../services/raceResultsService';
import { showToast } from '../../hooks/showToast';
import './SpectatorRaceResultsPage.css';

function LoadingSpinner() {
  return (
    <div className="srr-loading" role="status" aria-label="Đang tải kết quả">
      <div className="srr-spinner" />
      <p>Đang tải kết quả cuộc đua…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="srr-state srr-state--error" role="alert">
      <div className="srr-state__icon">⚠️</div>
      <h3>Không tải được kết quả</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="srr-btn srr-btn--primary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

function EmptyResults({ hasResults }) {
  if (hasResults) return null;
  return (
    <div className="srr-state srr-state--empty" role="status">
      <div className="srr-state__icon">📋</div>
      <h3>Chưa có kết quả</h3>
      <p>Kết quả cuộc đua sẽ được công bố sau khi trọng tài xác nhận.</p>
    </div>
  );
}

function ResultBadge({ status, rank: _rank }) {
  if (!status) return <span className="srr-badge srr-badge--muted">—</span>;

  const configs = {
    FINISHED: { className: 'success', label: 'Đến đích' },
    OFFICIAL: { className: 'warn', label: 'Chính thức' },
    DNF: { className: 'danger', label: 'DNF' },
    DQ: { className: 'danger', label: 'DQ' },
  };

  const cfg = configs[status] || { className: 'muted', label: status };
  return (
    <span className={`srr-badge srr-badge--${cfg.className}`}>{cfg.label}</span>
  );
}

function RaceResultsTable({ results, isOfficial: _isOfficial }) {
  if (!results || results.length === 0) {
    return <EmptyResults hasResults={false} />;
  }

  return (
    <div className="srr-table-wrapper" role="region" aria-label="Bảng kết quả">
      <table className="srr-table">
        <thead>
          <tr>
            <th scope="col" className="srr-table__th srr-table__th--rank">Hạng</th>
            <th scope="col" className="srr-table__th srr-table__th--gate">Cửa</th>
            <th scope="col" className="srr-table__th srr-table__th--horse">Tên ngựa</th>
            <th scope="col" className="srr-table__th srr-table__th--jockey">Kỵ sĩ</th>
            <th scope="col" className="srr-table__th srr-table__th--status">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, idx) => {
            const isTop3 = item.rank != null && item.rank >= 1 && item.rank <= 3;
            const rankDisplay = item.rank != null ? `#${item.rank}` : '—';

            return (
              <tr
                key={item.entryId || idx}
                className={`srr-table__row${isTop3 ? ' srr-table__row--top3' : ''}${!item.status ? ' srr-table__row--inactive' : ''}`}
              >
                <td className="srr-table__td srr-table__td--rank">
                  {item.rank != null ? (
                    <span className={`srr-rank srr-rank--${item.rank}`}>{rankDisplay}</span>
                  ) : (
                    <span className="srr-rank srr-rank--none">—</span>
                  )}
                </td>
                <td className="srr-table__td srr-table__td--gate">
                  {item.gate ? `#${item.gate}` : item.saddleNo ? `S${item.saddleNo}` : '—'}
                </td>
                <td className="srr-table__td srr-table__td--horse">
                  <span className="srr-horse-name">{item.horseName}</span>
                </td>
                <td className="srr-table__td srr-table__td--jockey">
                  {item.jockeyName || <span className="srr-muted">—</span>}
                </td>
                <td className="srr-table__td srr-table__td--status">
                  <ResultBadge status={item.status} rank={item.rank} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Top3Podium({ results }) {
  const top3 = results.filter(r => r.rank != null && r.rank >= 1 && r.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  if (top3.length === 0) return null;

  return (
    <div className="srr-podium" role="region" aria-label="Bảng xếp hạng Top 3">
      {top3.map((item) => (
        <div key={item.entryId} className={`srr-podium__slot srr-podium__slot--${item.rank}`}>
          <div className="srr-podium__medal">
            {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
          </div>
          <div className="srr-podium__horse">{item.horseName}</div>
          <div className="srr-podium__rank">Hạng {item.rank}</div>
          {item.jockeyName && (
            <div className="srr-podium__jockey">{item.jockeyName}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SpectatorRaceResultsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();

  const [raceData, setRaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await raceResultsService.getRaceResults(raceId);
      setRaceData(data);
    } catch (err) {
      setError(err.message || 'Không tải được kết quả cuộc đua');
      showToast(err.message || 'Không tải được kết quả', 'error');
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) return <LoadingSpinner />;
  if (error && !raceData) return <ErrorState message={error} onRetry={loadResults} />;

  const statusLabel = raceResultsService.getStatusLabel(raceData?.status);
  const statusVariant = raceResultsService.getStatusVariant(raceData?.status);
  const hasResults = raceData?.results?.some(r => r.rank != null);

  return (
    <div className="srr-page">
      {/* Header */}
      <div className="srr-header">
        <button
          type="button"
          className="srr-back-btn"
          onClick={handleBack}
          aria-label="Quay lại"
        >
          ← Quay lại
        </button>

        <div className="srr-header__info">
          <div className="srr-header__eyebrow">
            Kết quả cuộc đua
          </div>
          <h1 className="srr-header__title">{raceData?.raceName}</h1>
          {raceData?.tournamentName && (
            <p className="srr-header__tournament">🏆 {raceData.tournamentName}</p>
          )}
        </div>

        <div className="srr-header__meta">
          <span className={`srr-status-badge srr-status-badge--${statusVariant}`}>
            {statusLabel}
          </span>
          {raceData?.publishedAt && (
            <span className="srr-published-at">
              Công bố: {new Date(raceData.publishedAt).toLocaleString('vi-VN')}
            </span>
          )}
        </div>
      </div>

      {/* Top 3 Podium */}
      {hasResults && <Top3Podium results={raceData?.results || []} />}

      {/* Results Table */}
      <div className="srr-content">
        <h2 className="srr-content__title">
          Kết quả chi tiết
          <span className="srr-content__count">
            {raceData?.results?.length || 0} ngựa
          </span>
        </h2>

        <EmptyResults hasResults={hasResults} />

        {hasResults && (
          <RaceResultsTable
            results={raceData?.results || []}
            isOfficial={raceData?.status === 'FINISHED'}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="srr-nav">
        <Link to="/spectator/tournaments" className="srr-btn srr-btn--secondary">
          ← Xem giải đấu
        </Link>
        <Link to="/spectator" className="srr-btn srr-btn--ghost">
          Trang chủ
        </Link>
      </div>
    </div>
  );
}
