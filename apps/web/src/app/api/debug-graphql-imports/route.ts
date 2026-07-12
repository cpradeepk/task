// TEMPORARY diagnostic route — remove after the production GraphQL 500 is fixed.
// Dynamically imports each module of the /api/graphql import chain inside
// try/catch so the real module-load error (which crashes the graphql route
// before its handler runs) can be observed as JSON in production.
// Gated: requires the x-debug-key header to equal JWT_SECRET.

import { NextRequest, NextResponse } from 'next/server'

interface ImportResult {
  module: string
  ok: boolean
  error?: string
  stack?: string[]
}

async function tryImport(name: string, loader: () => Promise<unknown>): Promise<ImportResult> {
  try {
    await loader()
    return { module: name, ok: true }
  } catch (error) {
    const err = error as Error
    return {
      module: name,
      ok: false,
      error: `${err?.name || 'Error'}: ${err?.message || String(error)}`,
      stack: (err?.stack || '').split('\n').slice(0, 12),
    }
  }
}

export async function GET(request: NextRequest) {
  const key = request.headers.get('x-debug-key')
  if (!process.env.JWT_SECRET || key !== process.env.JWT_SECRET) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const results: ImportResult[] = []

  // Literal import() calls so the bundler statically includes each module.
  results.push(await tryImport('@apollo/server', () => import('@apollo/server')))
  results.push(await tryImport('@/lib/graphql-logger', () => import('@/lib/graphql-logger')))
  results.push(await tryImport('@/lib/db', () => import('@/lib/db')))
  results.push(await tryImport('@/lib/auth-server', () => import('@/lib/auth-server')))
  results.push(await tryImport('@/lib/mention-parser', () => import('@/lib/mention-parser')))
  results.push(await tryImport('@/lib/notification-helper', () => import('@/lib/notification-helper')))
  results.push(await tryImport('@/lib/db/requirements', () => import('@/lib/db/requirements')))
  results.push(await tryImport('@/graphql/schema', () => import('@/graphql/schema')))
  results.push(await tryImport('@/graphql/mention-resolvers', () => import('@/graphql/mention-resolvers')))
  results.push(await tryImport('@/graphql/notification-resolvers', () => import('@/graphql/notification-resolvers')))
  results.push(await tryImport('@/graphql/push-token-resolvers', () => import('@/graphql/push-token-resolvers')))
  results.push(await tryImport('@/graphql/requirement-resolvers', () => import('@/graphql/requirement-resolvers')))
  results.push(await tryImport('@/graphql/resolvers', () => import('@/graphql/resolvers')))

  // If everything imports, also try building + starting an ApolloServer the
  // same way the real route does.
  let apollo: ImportResult = { module: 'ApolloServer(start)', ok: false, error: 'skipped: earlier import failed' }
  if (results.every((r) => r.ok)) {
    apollo = await tryImport('ApolloServer(start)', async () => {
      const { ApolloServer } = await import('@apollo/server')
      const { typeDefs } = await import('@/graphql/schema')
      const { resolvers } = await import('@/graphql/resolvers')
      const server = new ApolloServer({ typeDefs, resolvers })
      await server.start()
      await server.stop()
    })
  }
  results.push(apollo)

  return NextResponse.json({
    node: process.version,
    env: process.env.VERCEL_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    results,
  })
}
