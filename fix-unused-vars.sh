#!/bin/bash
# Script to fix unused variables in TypeScript files

# Read the lint report and extract files with unused vars
cat /Users/imokokok/Documents/foresight-build/insight/lint-report.json | jq -r '.[] | select(.messages | map(select(.ruleId == "@typescript-eslint/no-unused-vars")) | length > 0) | .filePath' | while read -r file; do
  echo "Processing: $file"

  # Get unused imports (defined but never used)
  cat /Users/imokokok/Documents/foresight-build/insight/lint-report.json | jq -r --arg file "$file" '.[] | select(.filePath == $file) | .messages[] | select(.ruleId == "@typescript-eslint/no-unused-vars") | select(.message | contains("is defined but never used")) | {line: .line, column: .column, message: .message}' 2>/dev/null | while read -r msg; do
    line=$(echo "$msg" | jq -r '.line')
    message=$(echo "$msg" | jq -r '.message')

    # Extract variable name from message
    var_name=$(echo "$message" | sed -n "s/.*'\([^']*\)' is defined but never used.*/\1/p")

    if [ -n "$var_name" ] && [ -f "$file" ]; then
      echo "  Removing unused: $var_name at line $line"

      # Check if it's an import
      if head -n "$line" "$file" | tail -1 | grep -q "import.*$var_name"; then
        # It's an import - remove the specific import or the whole line if single import
        if head -n "$line" "$file" | tail -1 | grep -q "import.*{.*$var_name.*}"; then
          # Named import in braces
          sed -i '' "/import.*{[^}]*$var_name[^}]*}/s/$var_name,*//g" "$file"
          # Clean up empty braces
          sed -i '' 's/import {\s*}/import {}/g' "$file"
        elif head -n "$line" "$file" | tail -1 | grep -q "import $var_name"; then
          # Default import - comment out the line for now
          sed -i '' "${line}s/^/\/\/ /" "$file"
        fi
      fi
    fi
  done
done

echo "Done processing files"
