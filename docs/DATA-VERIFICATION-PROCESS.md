# NBA Trade Tree - Data Verification Process
## Ensuring 99.9999% Accuracy

---

## Overview

Every acquisition tree must be verified against primary sources before publication. This document defines the standardized verification process.

---

## Verification Sources (Priority Order)

1. **Basketball-Reference.com** - Player transaction history (most authoritative)
2. **ESPN Trade Machine / Player Pages** - Trade details
3. **NBA.com Official** - Press releases
4. **Wikipedia** - Draft pages, trade pages (cross-reference only)
5. **Team beat reporters** - For context/details

**DO NOT USE:** Social media, fan forums, or memory alone.

---

## Verification Checklist

For each node in the tree, verify:

### Required Fields
- [ ] **Player/Asset Name** - Correct spelling
- [ ] **Transaction Date** - YYYY-MM-DD format, verified against source
- [ ] **Transaction Type** - draft / trade / free-agent / undrafted
- [ ] **Trade Partner** - Correct team abbreviation

### For Draft Picks
- [ ] **Draft Year** - Verified
- [ ] **Pick Number** - Verified (round and overall)
- [ ] **Was it team's OWN pick?** - CRITICAL: If traded for, must trace further

### For Trades
- [ ] **What was sent out?** - Complete list of assets
- [ ] **What was received?** - Complete list of assets
- [ ] **Date** - Exact date trade was executed

### For Free Agents
- [ ] **Signing Date** - When contract signed
- [ ] **Previous Team** - Where they came from
- [ ] **Contract Type** - UFA, RFA, etc.

---

## Origin Validation Rules

A node is a TRUE ORIGIN only if ONE of these conditions is met:

| Origin Type | Verification Question |
|-------------|----------------------|
| **Own Draft Pick** | Did the team OWN this pick, or was it traded for? If traded, trace back. |
| **Free Agent** | Was any compensation given? S&T = NOT an origin. |
| **Undrafted FA** | Did they go undrafted AND sign as FA? |
| **Cash/Exception** | Used salary cap exception or cash with no player/pick exchange? |

### NOT Valid Origins
- Traded draft picks (must trace what was given up)
- Sign-and-trade acquisitions (must trace the asset sent)
- Waiver claims if assets were exchanged

---

## Audit Template

```markdown
## Player: [NAME]
## Team: [TEAM]
## Audit Date: [DATE]
## Auditor: [NAME]

### Current Tree Summary
[Node count]: X nodes, [Origin count]: X origins

### Verification Log

#### Node 1: [Player Name]
- Source: [URL]
- Date verified: ✓ / ✗
- Type verified: ✓ / ✗
- Assets verified: ✓ / ✗
- Notes: [Any corrections needed]

#### Node 2: ...
[Continue for all nodes]

### Issues Found
1. [Issue description]
2. [Issue description]

### Corrections Made
1. [Correction description]
2. [Correction description]

### Final Status: VERIFIED / NEEDS REVIEW
```

---

## Current Audit Status

### Player: Nikola Vucevic
**Status:** NEEDS FULL AUDIT
- Complex 26-year chain
- Multiple branches
- Source: CelticsBlog article (secondary source)
- **Action:** Verify each trade against Basketball-Reference

### Player: Jayson Tatum  
**Status:** PARTIAL AUDIT COMPLETE
- ✅ 2017 #3 pick via trade down from #1 with PHI
- ✅ 2017 #1 pick from Nets trade (June 27, 2013)
- ✅ KG trade (July 31, 2007) - Al Jefferson, Gerald Green, Ryan Gomes, Telfair, Ratliff
- ✅ Paul Pierce drafted 1998 #10 (own pick)
- ⚠️ Telfair chain needs verification
- ⚠️ Antoine Walker → LaFrentz → Telfair dates need verification

### Player: Jaylen Brown
**Status:** NEEDS AUDIT
- Same Nets trade origin as Tatum (2016 pick, not 2017)
- Verify pick conveyed as #3 in 2016

### Player: Derrick White
**Status:** ERRORS FOUND - NEEDS CORRECTION
- ❌ Josh Richardson acquired from DAL, not POR (my data was wrong)
- ❌ Moses Brown acquired from OKC via Kemba Walker trade (not as stated)
- ❌ Missing: Kemba Walker was FREE AGENT signing (2019) = TRUE ORIGIN

**Correct Chain:**
```
Derrick White (Feb 2022, from SAS)
├── Josh Richardson (Jul 2021, from DAL)
│   └── Moses Brown (Jun 2021, from OKC)
│       └── Kemba Walker trade package
│           └── ★ Kemba Walker (FREE AGENT, Jul 2019)
├── Romeo Langford (Jun 2019, draft #14)
│   └── Pick from SAC via PHI (Fultz trade)
│       └── [Need to trace SAC pick origin]
├── 2022 1st Round Pick (own)
└── 2028 Swap (own)
```

---

## Verification Workflow

### Step 1: Build Initial Tree
- Research player's acquisition
- Document each asset given up
- Recurse until reaching apparent origins

### Step 2: Verify Each Node
- Open Basketball-Reference player page
- Check "Transactions" section
- Verify dates, teams, assets match

### Step 3: Validate Origins
- For each "origin" node, ask:
  - If draft pick: Was it team's OWN pick?
  - If FA: Was it a clean signing (no S&T)?
- If answer is NO, trace further back

### Step 4: Cross-Reference
- Check at least 2 sources for major trades
- Flag any discrepancies

### Step 5: Document
- Record verification in audit log
- Note any assumptions or uncertainties

---

## Common Mistakes to Avoid

1. **Assuming draft picks are "own picks"**
   - Many picks are traded years in advance
   - Always verify the pick's origin

2. **Missing compensation in free agent signings**
   - Sign-and-trades involve asset exchange
   - Check if any picks/players went to previous team

3. **Wrong trade dates**
   - Agreement date vs. official date can differ
   - Use the official transaction date

4. **Incomplete trade packages**
   - Trades often include picks, swaps, cash
   - Capture ALL assets exchanged

5. **Conflating multiple trades**
   - Players can be traded multiple times
   - Make sure you have the right trade in the chain

---

## Basketball-Reference Quick Guide

### Finding Transaction History
1. Go to player page: `basketball-reference.com/players/[letter]/[playername].html`
2. Scroll to "Transactions" section
3. All trades, signings, draft info listed chronologically

### Finding Draft Pick Origins
1. Go to draft page: `basketball-reference.com/draft/NBA_[year].html`
2. Check "Draft Pick Trades" section for traded picks
3. Or search "2024 NBA Draft Pick Transactions"

---

## Next Steps

1. [ ] Complete full audit of Derrick White tree
2. [ ] Complete full audit of Vucevic tree
3. [ ] Verify Tatum/Brown origins are same (Nets trade)
4. [ ] Create automated verification script (future)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-09 | 1.0 | Initial process document |
