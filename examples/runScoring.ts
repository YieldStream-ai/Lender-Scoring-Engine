/**
 * Runnable Demo — Score 5 synthetic merchants against 8 lenders
 *
 * Usage: npx tsx examples/runScoring.ts
 */

import { matchLenders } from "../src/scoring/lenderMatcher.js";
import { processDecline, getActiveAdjustments } from "../src/learning/declineIntelligence.js";
import { classifyTier } from "../src/types.js";
import { allMerchants } from "../fixtures/merchants.js";
import { allBuyboxes } from "../fixtures/lenderBuyboxes.js";
import { historicalDeals } from "../fixtures/historicalDeals.js";
import { fundingOutcomes } from "../fixtures/fundingOutcomes.js";
import { globalOutcomes } from "../fixtures/globalOutcomes.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function rpad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : " ".repeat(len - str.length) + str;
}

function tierBadge(tier: string): string {
  switch (tier) {
    case "strong": return "STRONG ";
    case "viable": return "VIABLE ";
    case "weak":   return "WEAK   ";
    default:       return "       ";
  }
}

function line(char: string, len: number): string {
  return char.repeat(len);
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log();
console.log("╔══════════════════════════════════════════════════════════════════════╗");
console.log("║              LENDER SCORING ENGINE — DEMO OUTPUT                    ║");
console.log("║              Three-Layer Matching Core from YieldStream             ║");
console.log("╚══════════════════════════════════════════════════════════════════════╝");
console.log();

for (const merchant of allMerchants) {
  const result = matchLenders({
    merchant,
    buyboxes: allBuyboxes,
    historicalDeals,
    fundingOutcomes,
    globalOutcomes,
    scoreAdjustments: [],
  });

  const qualified = result.scores.filter((s) => !s.disqualified);
  const disqualified = result.scores.filter((s) => s.disqualified);

  console.log(line("─", 72));
  console.log(`  ${merchant.business_name}`);
  console.log(`  FICO ${merchant.owner_fico ?? "N/A"} | Revenue $${(merchant.monthly_revenue ?? 0).toLocaleString()} | ${merchant.position_count} pos | ${merchant.nsf_count_30d ?? 0} NSFs | ADB $${(merchant.average_daily_balance ?? 0).toLocaleString()}`);
  console.log(`  Qualified: ${qualified.length}/${allBuyboxes.length} lenders | Confidence: ${qualified[0]?.confidenceLevel ?? "N/A"}`);
  console.log();

  if (qualified.length > 0) {
    console.log(`  ${pad("Lender", 22)} ${rpad("Score", 5)}  ${pad("Tier", 8)} ${rpad("Global", 6)} ${rpad("Rel", 5)} ${rpad("Attr", 5)}  ${pad("Bonus", 5)}`);
    console.log(`  ${line("─", 22)} ${line("─", 5)}  ${line("─", 8)} ${line("─", 6)} ${line("─", 5)} ${line("─", 5)}  ${line("─", 5)}`);

    for (const s of qualified.slice(0, 5)) {
      const tier = classifyTier(s.compositeScore);
      console.log(
        `  ${pad(s.lenderBuybox.lender_name, 22)} ${rpad(String(s.compositeScore), 5)}  ${tierBadge(tier)} ${rpad(String(s.globalScore), 6)} ${rpad(String(s.relationshipScore), 5)} ${rpad(String(s.attributeScore), 5)}  ${s.hasRelationshipBonus ? "×1.15" : "     "}`,
      );
    }
  }

  if (disqualified.length > 0) {
    console.log();
    console.log(`  Disqualified (${disqualified.length}):`);
    for (const s of disqualified) {
      console.log(`    ${pad(s.lenderBuybox.lender_name, 20)} — ${s.disqualifyReasons.join("; ")}`);
    }
  }

  console.log();
}

// ── Decline Intelligence Demo ────────────────────────────────────────────────

console.log(line("═", 72));
console.log("  DECLINE INTELLIGENCE — Learning Loop Demo");
console.log(line("═", 72));
console.log();

const now = new Date();

// Score Atlas Capital for Coastal Bistro — baseline
const baseline = matchLenders({
  merchant: allMerchants[0], // Coastal Bistro
  buyboxes: allBuyboxes,
  historicalDeals,
  fundingOutcomes,
  globalOutcomes,
  scoreAdjustments: [],
});
const atlasBaseline = baseline.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital")!;

console.log(`  1. Baseline: Atlas Capital scores ${atlasBaseline.compositeScore} for Coastal Bistro`);

// Simulate a decline
const { newAdjustment: adj1 } = processDecline(
  { lenderName: "Atlas Capital", funded: false, declineReason: "FICO below preferred range", declineCategory: null },
  null,
  now,
);
console.log(`  2. Decline recorded: "FICO below preferred range" → category: credit_quality, penalty: ${adj1!.adjustment_pct}%`);

// Score with penalty
const penalized = matchLenders({
  merchant: allMerchants[0],
  buyboxes: allBuyboxes,
  historicalDeals,
  fundingOutcomes,
  globalOutcomes,
  scoreAdjustments: [adj1!],
});
const atlasPenalized = penalized.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital")!;
console.log(`  3. Penalized: Atlas Capital now scores ${atlasPenalized.compositeScore} (was ${atlasBaseline.compositeScore})`);

// Stack a second decline
const { newAdjustment: adj2 } = processDecline(
  { lenderName: "Atlas Capital", funded: false, declineReason: "Too many NSFs", declineCategory: null },
  adj1!,
  now,
);
console.log(`  4. Second decline stacked: penalty now ${adj2!.adjustment_pct}% (was ${adj1!.adjustment_pct}%)`);

// Score with stacked penalty
const doubleHit = matchLenders({
  merchant: allMerchants[0],
  buyboxes: allBuyboxes,
  historicalDeals,
  fundingOutcomes,
  globalOutcomes,
  scoreAdjustments: [adj2!],
});
const atlasDouble = doubleHit.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital")!;
console.log(`  5. Double penalty: Atlas Capital now scores ${atlasDouble.compositeScore}`);

// Simulate expiry (31 days later)
const future = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
const activeAfterExpiry = getActiveAdjustments([adj2!], future);
console.log(`  6. 31 days later: ${activeAfterExpiry.length} active adjustments (expired)`);

// Score after recovery
const recovered = matchLenders({
  merchant: allMerchants[0],
  buyboxes: allBuyboxes,
  historicalDeals,
  fundingOutcomes,
  globalOutcomes,
  scoreAdjustments: activeAfterExpiry,
});
const atlasRecovered = recovered.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital")!;
console.log(`  7. Recovered: Atlas Capital back to ${atlasRecovered.compositeScore}`);

console.log();
console.log(`  ${atlasBaseline.compositeScore} → ${atlasPenalized.compositeScore} → ${atlasDouble.compositeScore} → ${atlasRecovered.compositeScore}`);
console.log(`  (baseline)  (−20%)    (−40%)    (recovered)`);
console.log();
