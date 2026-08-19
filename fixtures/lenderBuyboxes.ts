/**
 * Synthetic Lender Buy-Box Configurations
 *
 * 8 lenders with varied appetites to exercise all disqualification
 * gates and attribute scoring paths. Designed so:
 *
 *   Coastal Bistro matches 6-7 lenders
 *   Metro Auto matches 3-4 lenders
 *   Sunrise Cannabis matches 0 (industry-restricted everywhere)
 *   Quick Mart NY matches ~5 (but fails NY-restricted lenders)
 *   Struggling Diner matches 0-1 (fails multiple gates)
 */

import type { LenderBuybox } from "../src/types.js";

export const atlasCapital: LenderBuybox = {
  id: "lb-001",
  lender_name: "Atlas Capital",
  product_type: "mca",
  is_active: true,
  min_fico: 600,
  min_monthly_revenue: 15000,
  max_positions: 3,
  restricted_states: ["NY", "NV"],
  restricted_industries: ["Cannabis", "Gambling"],
  preferred_terms_months: 12,
  max_nsf_30_day: 3,
  max_nsf_90_day: 8,
  min_month_end_balance: 5000,
  commission_points: 8,
};

export const summitFunding: LenderBuybox = {
  id: "lb-002",
  lender_name: "Summit Funding",
  product_type: "mca",
  is_active: true,
  min_fico: 550,
  min_monthly_revenue: 10000,
  max_positions: 4,
  restricted_states: [],
  restricted_industries: ["Cannabis", "Firearms"],
  preferred_terms_months: 6,
  max_nsf_30_day: 5,
  max_nsf_90_day: 12,
  min_month_end_balance: null,
  commission_points: 6,
};

export const meridianFinance: LenderBuybox = {
  id: "lb-003",
  lender_name: "Meridian Finance",
  product_type: "mca",
  is_active: true,
  min_fico: 650,
  min_monthly_revenue: 25000,
  max_positions: 2,
  restricted_states: ["NY"],
  restricted_industries: ["Cannabis", "Adult Entertainment"],
  preferred_terms_months: 9,
  max_nsf_30_day: 2,
  max_nsf_90_day: 5,
  min_month_end_balance: 10000,
  commission_points: 10,
};

export const velocityCapital: LenderBuybox = {
  id: "lb-004",
  lender_name: "Velocity Capital",
  product_type: "mca",
  is_active: true,
  min_fico: 580,
  min_monthly_revenue: 20000,
  max_positions: 3,
  restricted_states: [],
  restricted_industries: ["Cannabis"],
  preferred_terms_months: 8,
  max_nsf_30_day: 4,
  max_nsf_90_day: 10,
  min_month_end_balance: 8000,
  commission_points: 7,
};

export const pinnacleLending: LenderBuybox = {
  id: "lb-005",
  lender_name: "Pinnacle Lending",
  product_type: "mca",
  is_active: true,
  min_fico: 700,
  min_monthly_revenue: 40000,
  max_positions: 2,
  restricted_states: ["NY", "CA"],
  restricted_industries: ["Cannabis", "Gambling", "Firearms"],
  preferred_terms_months: 12,
  max_nsf_30_day: 1,
  max_nsf_90_day: 3,
  min_month_end_balance: 20000,
  commission_points: 12,
};

export const harborFund: LenderBuybox = {
  id: "lb-006",
  lender_name: "Harbor Fund",
  product_type: "mca",
  is_active: true,
  min_fico: 500,
  min_monthly_revenue: 8000,
  max_positions: 5,
  restricted_states: [],
  restricted_industries: ["Cannabis"],
  preferred_terms_months: 4,
  max_nsf_30_day: 8,
  max_nsf_90_day: 20,
  min_month_end_balance: null,
  commission_points: 5,
};

export const crestlineCapital: LenderBuybox = {
  id: "lb-007",
  lender_name: "Crestline Capital",
  product_type: "mca",
  is_active: true,
  min_fico: 620,
  min_monthly_revenue: 30000,
  max_positions: 2,
  restricted_states: ["NV"],
  restricted_industries: ["Cannabis", "Adult Entertainment"],
  preferred_terms_months: 10,
  max_nsf_30_day: 3,
  max_nsf_90_day: 6,
  min_month_end_balance: 15000,
  commission_points: 9,
};

export const bridgewayFunding: LenderBuybox = {
  id: "lb-008",
  lender_name: "Bridgeway Funding",
  product_type: "mca",
  is_active: true,
  min_fico: 560,
  min_monthly_revenue: 15000,
  max_positions: 3,
  restricted_states: ["NY"],
  restricted_industries: ["Cannabis", "Gambling"],
  preferred_terms_months: 6,
  max_nsf_30_day: 4,
  max_nsf_90_day: 10,
  min_month_end_balance: 5000,
  commission_points: 7,
};

export const allBuyboxes: LenderBuybox[] = [
  atlasCapital,
  summitFunding,
  meridianFinance,
  velocityCapital,
  pinnacleLending,
  harborFund,
  crestlineCapital,
  bridgewayFunding,
];
