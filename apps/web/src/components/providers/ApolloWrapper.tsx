'use client'

import React, { useEffect, useState } from 'react'
import { ApolloProvider } from '@apollo/client/react'
import { getApolloClient } from '@/lib/graphql-client'

export default function ApolloWrapper({ children }: { children: React.ReactNode }) {
    const [client, setClient] = useState<any>(null)

    useEffect(() => {
        const apolloClient = getApolloClient()
        setClient(apolloClient)
    }, [])

    if (!client) {
        return null
    }

    return (
        <ApolloProvider client={client}>
            {children}
        </ApolloProvider>
    )
}
