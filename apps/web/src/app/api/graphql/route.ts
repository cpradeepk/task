import { NextRequest, NextResponse } from 'next/server'
import { ApolloServer } from '@apollo/server'
import { typeDefs } from '@/graphql/schema'
import { resolvers, createContext } from '@/graphql/resolvers'

// Create Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // Enable GraphQL Playground in development
})

// Start server once
let serverStarted = false
async function ensureServerStarted() {
  if (!serverStarted) {
    await server.start()
    serverStarted = true
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureServerStarted()

    const body = await request.json()
    const context = createContext()

    const response = await server.executeOperation(
      {
        query: body.query,
        variables: body.variables,
        operationName: body.operationName
      },
      { contextValue: context }
    )

    if (response.body.kind === 'single') {
      return NextResponse.json(response.body.singleResult, {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    return NextResponse.json(
      { errors: [{ message: 'Incremental delivery not supported' }] },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('GraphQL error:', error)
    return NextResponse.json(
      { errors: [{ message: error?.message || 'Internal server error' }] },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Return GraphQL Playground HTML in development
  if (process.env.NODE_ENV === 'development') {
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>GraphQL Playground</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
  <link rel="shortcut icon" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
  <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    window.addEventListener('load', function (event) {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '/api/graphql',
        settings: {
          'request.credentials': 'same-origin'
        }
      })
    })
  </script>
</body>
</html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        }
      }
    )
  }

  return NextResponse.json(
    { message: 'GraphQL endpoint. Use POST to execute queries.' },
    { status: 200 }
  )
}

