/**
 * Lightweight, RFC 4180-compliant client-side CSV parser.
 * Handles double quotes, escaped commas, newlines within cells, and carriage returns.
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: Add a single double quote and skip the next one
          currentVal += '"';
          i++;
        } else {
          // End of quote block
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        // Start of quote block
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        row.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r' || char === '\n') {
        // Row separator
        row.push(currentVal.trim());
        currentVal = '';
        
        // Push row if it's not entirely empty
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          lines.push(row);
        }
        row = [];

        // Handle CRLF (\r\n) by skipping the line feed
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentVal += char;
      }
    }
  }

  // Handle last value and row if file doesn't end with a newline
  if (currentVal !== '' || row.length > 0) {
    row.push(currentVal.trim());
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      lines.push(row);
    }
  }

  return lines;
}
