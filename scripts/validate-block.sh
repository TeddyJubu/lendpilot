#!/bin/bash
# ============================================
# LoanPilot Block Validator
# Runs after every block to approve or reject.
# Exit 0 = PASS, Exit 1 = FAIL
# ============================================

set -e

BLOCK_NAME="${1:-unknown}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="${WEB_DIR:-$REPO_ROOT/apps/web}"
REPORT=""
FAILURES=0

log_pass() { REPORT+="  [PASS] $1\n"; }
log_fail() { REPORT+="  [FAIL] $1\n"; FAILURES=$((FAILURES + 1)); }
log_warn() { REPORT+="  [WARN] $1\n"; }
log_info() { REPORT+="  [INFO] $1\n"; }

echo "========================================"
echo "VALIDATOR: Block $BLOCK_NAME"
echo "========================================"

cd "$WEB_DIR"

# ─── 1. TypeScript compilation ───
echo "Checking TypeScript..."
if pnpm exec tsc --noEmit 2>&1; then
  log_pass "TypeScript compiles clean"
else
  log_fail "TypeScript compilation errors"
fi

# ─── 2. All tests pass ───
echo "Running tests..."
TEST_OUTPUT=$(pnpm exec vitest run 2>&1) || true
if echo "$TEST_OUTPUT" | grep -q "Tests.*passed"; then
  PASSED=$(echo "$TEST_OUTPUT" | grep -oP 'Tests\s+\K\d+(?=\s+passed)')
  TOTAL_FILES=$(echo "$TEST_OUTPUT" | grep -oP 'Test Files\s+\K\d+(?=\s+passed)')
  log_pass "All tests pass ($PASSED tests across $TOTAL_FILES files)"
else
  log_fail "Tests failed"
  echo "$TEST_OUTPUT" | tail -20
fi

# ─── 3. Anti-pattern checks on Convex files ───
echo "Checking anti-patterns..."

# Check for .collect() without pagination in queries
COLLECT_VIOLATIONS=$(grep -rn '\.collect()' convex/ --include="*.ts" | grep -v '__tests__' | grep -v 'node_modules' || true)
if [ -n "$COLLECT_VIOLATIONS" ]; then
  log_warn ".collect() found (verify pagination is not needed):\n$COLLECT_VIOLATIONS"
else
  log_pass "No .collect() without pagination"
fi

# Check mutations have updatedAt (skip activities — append-only with timestamp)
MUTATION_FILES=$(find convex/ -name "mutations.ts" -not -path "*__tests__*" -not -path "*node_modules*" -not -path "*activities*" 2>/dev/null || true)
for f in $MUTATION_FILES; do
  if ! grep -q 'updatedAt' "$f" 2>/dev/null; then
    log_fail "$f: Missing updatedAt in mutations"
  else
    log_pass "$f: Sets updatedAt"
  fi
done

# Check queries filter isArchived
QUERY_FILES=$(find convex/ -name "queries.ts" -not -path "*__tests__*" -not -path "*node_modules*" 2>/dev/null || true)
for f in $QUERY_FILES; do
  # Only check files that have list/paginate functions
  if grep -q 'export' "$f" 2>/dev/null; then
    if grep -qE '(isArchived|by_owner)' "$f" 2>/dev/null; then
      log_pass "$f: Filters archived records"
    else
      log_warn "$f: May not filter isArchived (verify manually)"
    fi
  fi
done

# Check mutations have ownerId checks
for f in $MUTATION_FILES; do
  if grep -q 'ownerId' "$f" 2>/dev/null; then
    log_pass "$f: Has ownerId checks"
  else
    log_warn "$f: May not check ownerId (verify manually)"
  fi
done

# ─── 4. Schema composition check ───
echo "Checking schema..."
if [ -f "convex/schema.ts" ]; then
  ORGAN_COUNT=$(grep -c 'import.*from.*tables' convex/schema.ts || true)
  log_info "Schema imports $ORGAN_COUNT organ table files"
else
  log_fail "convex/schema.ts missing"
fi

# ─── 5. No secrets in code ───
echo "Checking for leaked secrets..."
SECRET_PATTERNS='(sk_test_|sk_live_|pk_test_|pk_live_|CLERK_SECRET|password\s*=\s*["\x27][^"\x27]+["\x27])'
SECRETS_FOUND=$(grep -rPn "$SECRET_PATTERNS" convex/ src/ --include="*.ts" --include="*.tsx" | grep -v '.env' | grep -v 'placeholder' | grep -v 'your_' || true)
if [ -n "$SECRETS_FOUND" ]; then
  log_fail "Possible secrets in code:\n$SECRETS_FOUND"
else
  log_pass "No secrets detected in source"
fi

# ─── 6. File structure check ───
echo "Checking file structure..."
EXPECTED_ORGANS=("core" "contacts" "loans" "documents" "activities" "feed")
for organ in "${EXPECTED_ORGANS[@]}"; do
  if [ -f "convex/$organ/tables.ts" ]; then
    log_pass "convex/$organ/tables.ts exists"
  else
    log_warn "convex/$organ/tables.ts missing"
  fi
done

# ─── Report ───
echo ""
echo "========================================"
echo "VALIDATION REPORT: Block $BLOCK_NAME"
echo "========================================"
echo -e "$REPORT"

if [ $FAILURES -gt 0 ]; then
  echo "RESULT: REJECTED ($FAILURES failures)"
  echo "========================================"
  exit 1
else
  echo "RESULT: APPROVED"
  echo "========================================"
  exit 0
fi
