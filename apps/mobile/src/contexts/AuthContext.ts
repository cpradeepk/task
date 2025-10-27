import React from 'react'

export const AuthContext = React.createContext({
  signIn: async (employeeId: string, password: string) => ({ success: false }),
  signOut: async () => {},
  signUp: async () => {},
})
