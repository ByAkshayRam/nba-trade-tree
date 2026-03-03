#!/bin/bash
# BBRef Player Transaction History Extractor
# Usage: ./bbref-transactions.sh <bbref-slug> [--raw|--json]
# Example: ./bbref-transactions.sh langfro01
#          ./bbref-transactions.sh huntede01 --json
#
# Extracts transaction history from Basketball-Reference player pages.
# Data is hidden in HTML comments — this script pulls and cleans it.

set -euo pipefail

SLUG="${1:-}"
MODE="${2:-}"

if [[ -z "$SLUG" ]]; then
  echo "Usage: $0 <bbref-player-slug> [--raw|--json]"
  echo ""
  echo "Examples:"
  echo "  $0 langfro01          # Romeo Langford"
  echo "  $0 huntede01          # De'Andre Hunter"  
  echo "  $0 tatumja01          # Jayson Tatum"
  echo "  $0 huntede01 --json   # JSON output for programmatic use"
  echo ""
  echo "Find slugs at: basketball-reference.com/players/<first-letter>/<slug>.html"
  exit 1
fi

URL="https://www.basketball-reference.com/players/${SLUG:0:1}/${SLUG}.html"
HTML=$(curl -s "$URL")

# Check if page exists
if echo "$HTML" | grep -q "Page Not Found"; then
  echo "ERROR: Player not found for slug '$SLUG'" >&2
  exit 1
fi

# Extract player name from title
PLAYER_NAME=$(echo "$HTML" | grep -oP '(?<=<title>)[^|<]+' | sed 's/ Stats.*//' | head -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# Extract NBA transactions (skip G-League assignments)
# These are in HTML comments, class='nba-transactions'
TRANSACTIONS=$(echo "$HTML" | \
  grep "nba-transactions" | \
  grep -oP '<p class="transaction[^"]*">.*?</p>' | \
  sed 's/<[^>]*>//g' | \
  sed 's/&amp;/\&/g; s/&#x27;/'"'"'/g; s/&quot;/"/g; s/&ldquo;/"/g; s/&rdquo;/"/g' | \
  sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | \
  grep -v '^$' || true)

if [[ -z "$TRANSACTIONS" ]]; then
  echo "ERROR: No transactions found for $SLUG ($PLAYER_NAME)" >&2
  echo "URL: $URL" >&2
  exit 1
fi

if [[ "$MODE" == "--json" ]]; then
  # JSON output for programmatic use
  echo "{"
  echo "  \"player\": \"$PLAYER_NAME\","
  echo "  \"slug\": \"$SLUG\","
  echo "  \"url\": \"$URL\","
  echo "  \"transactions\": ["
  FIRST=true
  while IFS= read -r line; do
    # Extract date and action
    DATE=$(echo "$line" | grep -oP '^[A-Z][a-z]+ \d+, \d{4}' || echo "")
    ACTION=$(echo "$line" | sed 's/^[A-Z][a-z]* [0-9]*, [0-9]*: //')
    
    if [[ "$FIRST" == "true" ]]; then
      FIRST=false
    else
      echo ","
    fi
    # Escape quotes in ACTION for JSON
    ACTION_ESCAPED=$(echo "$ACTION" | sed 's/"/\\"/g')
    printf '    {"date": "%s", "action": "%s"}' "$DATE" "$ACTION_ESCAPED"
  done <<< "$TRANSACTIONS"
  echo ""
  echo "  ]"
  echo "}"
elif [[ "$MODE" == "--raw" ]]; then
  echo "$TRANSACTIONS"
else
  # Pretty-print
  echo "═══════════════════════════════════════════════════════════"
  echo "  $PLAYER_NAME — Transaction History (BBRef)"
  echo "  $URL"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  INDEX=1
  while IFS= read -r line; do
    # Bold the date
    DATE=$(echo "$line" | grep -oP '^[A-Z][a-z]+ \d+, \d{4}' || echo "")
    REST=$(echo "$line" | sed 's/^[A-Z][a-z]* [0-9]*, [0-9]*: //')
    
    # Categorize transaction type
    TYPE=""
    if echo "$REST" | grep -qi "traded by"; then TYPE="🔄 TRADE"; 
    elif echo "$REST" | grep -qi "drafted by"; then TYPE="🎯 DRAFT";
    elif echo "$REST" | grep -qi "signed.*free agent\|sign-and-trade"; then TYPE="✍️  FA SIGNING";
    elif echo "$REST" | grep -qi "signed.*contract\|signed a"; then TYPE="📝 SIGNED";
    elif echo "$REST" | grep -qi "waived"; then TYPE="❌ WAIVED";
    elif echo "$REST" | grep -qi "claimed"; then TYPE="📋 CLAIMED";
    else TYPE="📌 OTHER"; fi
    
    printf " %2d. [%s] %s\n" "$INDEX" "$TYPE" "$DATE"
    echo "     $REST"
    echo ""
    INDEX=$((INDEX + 1))
  done <<< "$TRANSACTIONS"
  echo "═══════════════════════════════════════════════════════════"
fi
