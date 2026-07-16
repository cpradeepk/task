// AI-assisted splitting of a free-form requirement into structured sections.
//
// Users capture everything in one body field; this asks Gemini to reorganize
// that text into labelled sections. Called from the requirement resolver.
//
// We call the Gemini REST API directly with `fetch` (no SDK dependency) to keep
// the serverless bundle lean and avoid ESM/require interop issues. The model
// is asked for strict JSON (responseMimeType), and the output is validated and
// server-sanitized before it ever touches the database.

import { sanitizeRequirementHtml } from '../sanitizeHtml'

export const AI_SECTION_LABELS = [
  'Functional',
  'Non-Functional',
  'Constraint',
  'Acceptance Criteria',
  'Note',
] as const

export type AiSectionLabel = (typeof AI_SECTION_LABELS)[number]

export interface SplitSection {
  heading: string
  label: AiSectionLabel
  contentHtml: string
}

function coerceLabel(value: unknown): AiSectionLabel {
  return (AI_SECTION_LABELS as readonly string[]).includes(value as string)
    ? (value as AiSectionLabel)
    : 'Functional'
}

/** Pull a JSON array out of the model response, tolerating code fences/prose. */
function extractJsonArray(text: string): unknown {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  const slice = start !== -1 && end !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned
  return JSON.parse(slice)
}

const PROMPT_PREAMBLE = `You are a senior business analyst. Reorganize the free-form product requirement notes below into a clean, structured set of requirement sections.

Rules:
- Return ONLY a JSON array. No prose, no markdown, no code fences.
- Each element must be: { "heading": string, "label": one of ["Functional","Non-Functional","Constraint","Acceptance Criteria","Note"], "contentHtml": string }.
- "contentHtml" must be simple valid HTML using ONLY these tags: <p>, <ul>, <ol>, <li>, <strong>, <em>, <h3>.
- Choose labels by meaning: "Functional" = features/behaviour the system must do; "Non-Functional" = performance, security, reliability, usability quality; "Constraint" = limits, assumptions, dependencies, out-of-scope; "Acceptance Criteria" = testable pass/fail conditions; "Note" = context/overview.
- Preserve ALL information from the input. Do not invent requirements or drop details.
- Produce between 2 and 8 sections. If the input is trivial or empty of real requirements, return a single "Note" section summarizing it.

Requirement notes:
"""`

/**
 * Ask Gemini to split `sourceText` into sections. Throws (before the caller
 * mutates anything) if the API is unconfigured, the input is empty, or the
 * model output can't be parsed into at least one usable section.
 */
export async function splitRequirementText(sourceText: string): Promise<SplitSection[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('AI splitting is not configured (set GEMINI_API_KEY).')
  }
  if (!sourceText || !sourceText.trim()) {
    throw new Error('There is nothing to split yet — add some requirement text first.')
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PROMPT_PREAMBLE}\n${sourceText}\n"""` }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Do not leak the API key (it is only in the URL, never the body).
    throw new Error(`AI request failed (${res.status}). ${body.slice(0, 180)}`)
  }

  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text || '').join('') || ''

  let parsed: unknown
  try {
    parsed = extractJsonArray(text)
  } catch {
    throw new Error('The AI returned an unreadable response. Please try again.')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('The AI did not return any sections. Please try again.')
  }

  const sections: SplitSection[] = (parsed as Array<Record<string, unknown>>)
    .filter((s) => s && (s.heading || s.contentHtml))
    .map((s) => ({
      heading: String(s.heading || 'Section').trim().slice(0, 200) || 'Section',
      label: coerceLabel(s.label),
      contentHtml: sanitizeRequirementHtml(String(s.contentHtml || '')),
    }))

  if (sections.length === 0) {
    throw new Error('The AI did not return any usable sections. Please try again.')
  }
  return sections
}
