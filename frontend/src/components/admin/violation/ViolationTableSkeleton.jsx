/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ViolationTableSkeleton Component
 *
 * Skeleton loading state cho violation table.
 */


export function ViolationTableSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="vio-table__skeleton-row">
          <td>
            <div className="vio-skeleton vio-skeleton--sm" />
          </td>
          <td>
            <div className="vio-skeleton vio-skeleton--md" />
            <div className="vio-skeleton vio-skeleton--xs" style={{ marginTop: "0.25rem" }} />
          </td>
          <td>
            <div className="vio-skeleton vio-skeleton--md" />
          </td>
          <td>
            <div className="vio-skeleton vio-skeleton--badge" />
          </td>
          <td>
            <div className="vio-skeleton vio-skeleton--badge" />
          </td>
          <td>
            <div className="vio-skeleton vio-skeleton--badge" />
          </td>
          <td>
            <div className="vio-skeleton vio-skeleton--sm" />
          </td>
          <td>
            <div className="vio-skeleton vio-skeleton--actions" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default ViolationTableSkeleton;
