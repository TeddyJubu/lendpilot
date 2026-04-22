# Skill: Scan Regulatory Landscape

## Description
Autonomously scan mortgage industry regulatory sources and news to surface guideline changes,
policy updates, and market shifts that affect mortgage brokers. Supplements the automated
regulatory crawler by catching items the structured scraper missed — especially buried PDFs,
complex navigation paths, and items in industry news rather than official sources.

## When To Use
- Daily or weekly background intelligence sweep
- After major financial news events (Fed rate decisions, housing market reports)
- When a broker flags a regulatory question that suggests a recent change

## Research Steps

1. **Scan official regulatory sources for recent publications**
   - CFPB: https://www.consumerfinance.gov/policy-compliance/guidance/
     Look for: advisory opinions, interpretive rules, guidance documents
   - FHA Mortgagee Letters: https://www.hud.gov/program_offices/housing/sfh/SFH_Ltr
     Look for: new mortgagee letters in last 14 days
   - VA Circulars: https://www.benefits.va.gov/HOMELOANS/circulars.asp
     Look for: loan circulars, policy updates
   - FHFA: https://www.fhfa.gov/news/news-release
     Look for: conforming loan limit updates, GSE policy changes
   - Fannie Mae Selling Guide: https://singlefamily.fanniemae.com/news-events/selling-guide-updates
   - Freddie Mac Bulletins: https://guide.freddiemac.com/app/guide/updates

2. **Scan industry news for broker-relevant updates**
   - Search: "mortgage broker guideline change [current month year]"
   - Search: "FHA VA conventional loan limit update [current year]"
   - Search: "mortgage underwriting change [current year]"
   - Check NationalMortgageProfessional.com, MortgageOrb.com, HousingWire.com

3. **Identify DPA program changes**
   - Search: "down payment assistance program [state] update [current year]"
   - Check NCSHA (ncsha.org) for state housing finance agency news
   - Look for new programs, eligibility expansions, funding exhaustion notices

4. **Rate and prioritize each finding**
   Score each update on a 1-10 scale:
   - 9-10: Direct change to origination, underwriting, or compliance (e.g., new loan limits,
     guideline change affecting active loans)
   - 6-8: New compliance requirement, reporting change, or licensing update
   - 3-5: Market analysis, industry trend, opinion piece
   - 1-2: Unrelated or minimal broker impact

## Output Format

Return a JSON object with this exact structure:

```json
{
  "regulatory_findings": [
    {
      "title": "FHA Increases Loan Limits for 2025",
      "source": "FHA",
      "document_type": "mortgagee_letter",
      "summary": "FHA increased its national loan limit floor to $524,225 effective January 1, 2025, with high-cost area ceilings rising to $1,209,750.",
      "published_date": "2024-11-26",
      "effective_date": "2025-01-01",
      "affects_loan_types": ["FHA_30yr", "FHA_15yr"],
      "affects_states": [],
      "url": "https://www.hud.gov/...",
      "relevance_score": 9,
      "broker_impact": "All FHA loans originated after January 1 can now be up to $524,225 in standard markets — update your max loan amount filters."
    }
  ],
  "sources_checked": ["url1", "url2"],
  "scan_date": "2025-01-15",
  "total_sources_scanned": 8
}
```

- `source`: one of "FHA", "VA", "CFPB", "FHFA", "FNMA", "FHLMC", "NMLS", "STATE", "INDUSTRY"
- `document_type`: one of "mortgagee_letter", "circular", "bulletin", "press_release",
  "advisory", "enforcement", "industry_news"
- `affects_states`: empty array `[]` means national; otherwise list state codes e.g. ["CA", "TX"]
- `affects_loan_types`: use these values: "FHA_30yr", "FHA_15yr", "VA_30yr", "VA_15yr",
  "Conventional", "Jumbo_30yr", "USDA_30yr", "DSCR", "Non_QM"
- Only include items with `relevance_score >= 5`
- Do not include items already published more than 45 days ago
- Return empty array if nothing material found — do not fabricate findings

## Quality Rules
- Each finding must have a real, verifiable URL
- Summary must be accurate — paraphrase from the source, do not editorialize
- Broker impact must be actionable (tell the broker what to do, not just what happened)
- If publication date is unclear, estimate conservatively (skip if potentially older than 45 days)
