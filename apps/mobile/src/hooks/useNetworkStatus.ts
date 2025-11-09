/**
 * Network Status Hook
 * Monitors network connectivity and provides online/offline status
 */

import { useState, useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true)
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected)
      setIsInternetReachable(state.isInternetReachable)
      setConnectionType(state.type)

      if (__DEV__) {
        console.log('Network status:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
        })
      }
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  return {
    isConnected,
    isInternetReachable,
    isOnline: isConnected && isInternetReachable,
    isOffline: !isConnected || !isInternetReachable,
    connectionType,
  }
}

