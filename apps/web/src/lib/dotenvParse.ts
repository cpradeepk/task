// Minimal, dependency-free .env parser (Vercel-style upload).
// Supports KEY=VALUE, `export KEY=...`, quoted values, and # comments.

export function parseDotenv(input: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = input.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line
    const eq = withoutExport.indexOf('=')
    if (eq === -1) continue

    const key = withoutExport.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) continue

    let value = withoutExport.slice(eq + 1).trim()

    // Strip surrounding quotes; preserve inner content. Unescape \n in double quotes.
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      const quote = value[0]
      value = value.slice(1, -1)
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
    } else {
      // Drop trailing inline comments for unquoted values.
      const hash = value.indexOf(' #')
      if (hash !== -1) value = value.slice(0, hash).trim()
    }

    result[key] = value
  }

  return result
}

/** Serialize a key/value map back into .env text (quotes values with spaces/newlines). */
export function serializeDotenv(entries: Record<string, string>): string {
  return Object.keys(entries)
    .sort()
    .map((key) => {
      const value = entries[key] ?? ''
      const needsQuote = /[\s#"']/.test(value) || value === ''
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
      return `${key}=${needsQuote ? `"${escaped}"` : value}`
    })
    .join('\n') + '\n'
}
