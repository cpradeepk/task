import React from 'react'

export const AuthContext = React.createContext({
  signIn: async (employeeId: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> => ({ success: false, error: '' }),
  signOut: async () => { },
  signUp: async () => { },
})
