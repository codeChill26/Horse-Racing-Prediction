/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { houseRevenueRepository } from "../repositories/houseRevenueRepository";

export const houseRevenueService = {
  getHouseRevenue() {
    return houseRevenueRepository.getHouseRevenue();
  },
  getHouseRevenueTransactions(params) {
    return houseRevenueRepository.getHouseRevenueTransactions(params);
  },
};
