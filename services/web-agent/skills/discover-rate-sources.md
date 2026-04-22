# Skill: Discover Wholesale Mortgage Rate Sources

## Description
Autonomously discover new wholesale mortgage lenders and TPO (Third-Party Originator) portals
that publish rate sheets for mortgage brokers. Surfaces new lenders not yet in the LendPilot
registry so they can be added to the automated rate scraper.

## When To Use
- Weekly autonomous scan to expand the lender registry
- When a broker reports a lender is missing from their rate comparisons
- After major industry news about lender market entry or expansion

## Research Steps

1. **Search for new TPO portals**
   - Search: "new wholesale mortgage lender TPO portal 2025"
   - Search: "mortgage broker wholesale lender rate sheet site:*.com"
   - Search: "[current year] wholesale mortgage lender launch"
   - Look for press releases, mortgage industry news (NationalMortgageProfessional, MortgageOrb,
     HousingWire) announcing new wholesale lending programs

2. **Verify lender legitimacy**
   - Check NMLS registry: https://www.nmlsconsumeraccess.org/
   - Look for NMLS ID on the lender's website
   - Confirm the lender offers a wholesale/TPO channel (not just retail)
   - Rate the confidence: high (NMLS verified + active portal) / medium (site found, NMLS unclear)
     / low (mentioned in news but no portal found)

3. **Locate rate sheet URLs**
   - Navigate to the lender's website
   - Find the "Broker", "Wholesale", "TPO", or "Partner" section
   - Note whether login/authentication is required to access rate sheets
   - Record the URL pattern for the rate sheet page

4. **Check for existing lenders to skip**
   Already in registry (skip these):
   - United Wholesale Mortgage (uwm.com)
   - Rocket Pro TPO (rocketprotpo.com)
   - PennyMac TPO (pennymactpo.com)
   - AmeriHome (amerihome.com)
   - NewRez Wholesale (newrezwholesale.com)
   - Freedom Mortgage Wholesale (freedomwholesale.com)
   - Planet Home Lending (planethomelending.com)
   - CrossCountry Wholesale (crosscountrywholesale.com)
   - Caliber Wholesale (caliberwholesale.com)
   - Plaza Home Mortgage (plazahomemortgage.com)

## Output Format

Return a JSON object with this exact structure:

```json
{
  "discovered_lenders": [
    {
      "name": "Lender Full Name",
      "type": "wholesale",
      "tpo_portal_url": "https://example.com/broker",
      "nmls_id": "12345",
      "requires_auth": true,
      "confidence_score": 0.85,
      "discovery_notes": "Found via HousingWire article, NMLS verified, active TPO portal"
    }
  ],
  "sources_checked": ["url1", "url2"],
  "search_date": "2025-01-15"
}
```

- `type`: always "wholesale" for TPO/broker channels
- `requires_auth`: true if rate sheets are behind a login wall
- `confidence_score`: 0.0–1.0 (0.8+ = ready to add, 0.5–0.8 = needs manual review, <0.5 = skip)
- Return empty array if no new lenders found — do not fabricate results

## Quality Rules
- Only include lenders with a verifiable web presence
- Minimum confidence of 0.5 to include in output
- If NMLS ID cannot be verified, set confidence to max 0.7
- Do not include retail-only lenders (banks, credit unions without TPO programs)
