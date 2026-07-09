/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DeviationTableSkeleton Component
 *
 * Skeleton loading state cho deviation table.
 */


export function DeviationTableSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="dev-table__skeleton-row">
          <td>
            <div className="dev-skeleton dev-skeleton--sm" />
          </td>
          <td>
            <div className="dev-skeleton dev-skeleton--md" />
            <div className="dev-skeleton dev-skeleton--xs" style={{ marginTop: "0.25rem" }} />
          </td>
          <td>
            <div className="dev-skeleton dev-skeleton--md" />
          </td>
          <td>
            <div className="dev-skeleton dev-skeleton--badge" />
          </td>
          <td>
            <div className="dev-skeleton dev-skeleton--badge" />
          </td>
          <td>
            <div className="dev-skeleton dev-skeleton--sm" />
          </td>
          <td>
            <div className="dev-skeleton dev-skeleton--actions" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default DeviationTableSkeleton;
