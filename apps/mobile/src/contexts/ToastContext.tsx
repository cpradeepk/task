import React, { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar } from 'react-native-paper'
import { StyleSheet, Alert } from 'react-native'

interface ToastContextType {
  showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let globalShowToast: ((message: string, type?: 'info' | 'success' | 'error' | 'warning') => void) | null = null

export const registerGlobalToast = (fn: typeof globalShowToast) => {
  globalShowToast = fn
}

// Monkeypatch Alert.alert to automatically route simple notifications to Toast
const originalAlert = Alert.alert
Alert.alert = (title, message, buttons, options) => {
  // A simple alert is one with no buttons, 0 buttons, or 1 button that is just a basic dismiss button
  const isSimple = !buttons || buttons.length === 0 || (
    buttons.length === 1 && (!buttons[0].onPress || ['ok', 'cancel', 'dismiss', 'close'].includes(String(buttons[0].text || '').toLowerCase()))
  )

  if (isSimple && globalShowToast) {
    let type: 'info' | 'success' | 'error' | 'warning' = 'info'
    const lowerTitle = String(title || '').toLowerCase()
    
    if (lowerTitle.includes('error') || lowerTitle.includes('fail')) {
      type = 'error'
    } else if (lowerTitle.includes('success') || lowerTitle.includes('complete') || lowerTitle.includes('save') || lowerTitle.includes('reset') || lowerTitle.includes('updated') || lowerTitle.includes('created')) {
      type = 'success'
    } else if (lowerTitle.includes('warn') || lowerTitle.includes('attention')) {
      type = 'warning'
    }

    let toastMsg = message || String(title)
    const genericTitles = ['error', 'success', 'warning', 'info', 'failed', 'login failed', 'validation error', 'authentication failed']
    if (message && !genericTitles.includes(lowerTitle)) {
      toastMsg = `${title}: ${message}`
    }

    globalShowToast(toastMsg, type)
    
    // Call custom button handler if it exists
    if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress()
    }
  } else {
    originalAlert(title, message, buttons, options)
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'success' | 'error' | 'warning'>('info')

  const showToast = useCallback((msg: string, toastType: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setMessage(msg)
    setType(toastType)
    setVisible(true)
  }, [])

  React.useEffect(() => {
    registerGlobalToast(showToast)
    return () => {
      registerGlobalToast(null)
    }
  }, [showToast])

  const handleDismiss = () => setVisible(false)

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#4CAF50'
      case 'error': return '#F44336'
      case 'warning': return '#FF9800'
      case 'info':
      default:
        return '#323232'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={handleDismiss}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: getBackgroundColor() }]}
        action={{
          label: 'Dismiss',
          onPress: handleDismiss,
          textColor: '#FFFFFF',
        }}
      >
        {message}
      </Snackbar>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const styles = StyleSheet.create({
  snackbar: {
    marginHorizontal: 16,
    borderRadius: 8,
  },
})
