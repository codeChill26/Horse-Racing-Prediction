/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized race status utilities.
 *
 * Backend ENUM values (UPPER_SNAKE_CASE):
 *   SCHEDULED, IN_PROGRESS, PENDING_RESULT, PAUSED, FINISHED, CANCELLED
 *
 * Frontend display values (PascalCase):
 *   Scheduled, InProgress, PendingResult, Paused, Finished, Cancelled
 *
 * Use normalizeRaceStatus() to convert BE values → FE display values
 * before passing to components that expect specific string shapes.
 */

export const RACE_STATUS = Object.freeze({
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING_RESULT: "PENDING_RESULT",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
});

export const RACE_STATUS_DISPLAY = Object.freeze({
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "InProgress",
  PENDING_RESULT: "PendingResult",
  PAUSED: "Paused",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
});

/**
 * Convert backend UPPER_SNAKE_CASE status → frontend PascalCase display.
 * Returns original value if no mapping exists.
 *
 * @param {string|null|undefined} status
 * @returns {string|null|undefined}
 */
export function normalizeRaceStatus(status) {
  if (!status) return status;
  return RACE_STATUS_DISPLAY[status] || status;
}

/**
 * Returns true if the race is open for betting.
 * @param {string|null|undefined} status - normalized status (PascalCase)
 */
export function isRaceOpenForBetting(status) {
  return status === "Scheduled";
}

/**
 * Returns true if the race is in progress (betting is locked).
 * @param {string|null|undefined} status - normalized status (PascalCase)
 */
export function isRaceInProgress(status) {
  return status === "InProgress";
}

/**
 * Returns true if the race is finished (settled).
 * @param {string|null|undefined} status - normalized status (PascalCase)
 */
export function isRaceFinished(status) {
  return status === "Finished";
}
