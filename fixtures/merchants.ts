/**
 * Synthetic Merchant Profiles
 *
 * Each merchant is designed to exercise a different scoring path:
 *
 *   Coastal Bistro     — Strong profile, should match most lenders
 *   Metro Auto Repair  — Borderline, tests margin cases and warn tiers
 *   Sunrise Cannabis    — Good financials, but industry-restricted
 *   Quick Mart NY      — Good financials, but state-restricted (NY)
 *   Struggling Diner   — Weak across the board, triggers multiple disqualifications
 */

import type { MerchantProfile } from "../src/types.js";

export const coastalBistro: MerchantProfile = {
  id: "m-001",
  business_name: "Coastal Bistro",
  state: "CA",
  industry: "Restaurant",
  monthly_revenue: 85000,
  owner_fico: 720,
  position_count: 1,
  nsf_count_30d: 0,
  nsf_count_90d: 0,
  average_daily_balance: 42000,
  month_end_balance: 38000,
  requested_amount: 75000,
};

export const metroAutoRepair: MerchantProfile = {
  id: "m-002",
  business_name: "Metro Auto Repair",
  state: "TX",
  industry: "Automotive",
  monthly_revenue: 35000,
  owner_fico: 620,
  position_count: 2,
  nsf_count_30d: 2,
  nsf_count_90d: 4,
  average_daily_balance: 12000,
  month_end_balance: 8500,
  requested_amount: 40000,
};

export const sunriseCannabis: MerchantProfile = {
  id: "m-003",
  business_name: "Sunrise Cannabis Co",
  state: "CO",
  industry: "Cannabis",
  monthly_revenue: 120000,
  owner_fico: 680,
  position_count: 0,
  nsf_count_30d: 0,
  nsf_count_90d: 1,
  average_daily_balance: 65000,
  month_end_balance: 55000,
  requested_amount: 100000,
};

export const quickMartNY: MerchantProfile = {
  id: "m-004",
  business_name: "Quick Mart NY",
  state: "NY",
  industry: "Retail",
  monthly_revenue: 60000,
  owner_fico: 690,
  position_count: 1,
  nsf_count_30d: 1,
  nsf_count_90d: 2,
  average_daily_balance: 28000,
  month_end_balance: 22000,
  requested_amount: 50000,
};

export const strugglingDiner: MerchantProfile = {
  id: "m-005",
  business_name: "Struggling Diner",
  state: "FL",
  industry: "Restaurant",
  monthly_revenue: 12000,
  owner_fico: 510,
  position_count: 3,
  nsf_count_30d: 7,
  nsf_count_90d: 15,
  average_daily_balance: 3200,
  month_end_balance: 1800,
  requested_amount: 25000,
};

export const allMerchants: MerchantProfile[] = [
  coastalBistro,
  metroAutoRepair,
  sunriseCannabis,
  quickMartNY,
  strugglingDiner,
];
