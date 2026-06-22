import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native'
import { Text, Divider, Avatar, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { getCurrentUser, User } from '../services/userService'
import { materialSpacing, materialTypography } from '../config/materialTheme'
import { AuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

interface NavigationMenuProps {
  visible: boolean
  onClose: () => void
}

export default function NavigationMenu({ visible, onClose }: NavigationMenuProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const navigation = useNavigation<any>()
  const { signOut } = React.useContext(AuthContext)
  const { colors } = useTheme()
  const styles = getStyles(colors)

  useEffect(() => {
    if (visible) {
      loadCurrentUser()
    }
  }, [visible])

  const loadCurrentUser = async () => {
    const user = await getCurrentUser()
    setCurrentUser(user)
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'amtarikshian':
        return 'Employee'
      case 'management':
        return 'Management'
      case 'top_management':
        return 'Top Management'
      case 'admin':
        return 'Admin'
      default:
        return role
    }
  }

  const getNavigationItems = () => {
    if (!currentUser) return []

    // Base items
    const homeSection = [
      { screen: 'Dashboard', label: 'Home', icon: 'home-outline' },
    ]

    const workSection = [
      { screen: 'TaskList', label: 'Tasks', icon: 'checkbox-marked-circle-outline' },
      { screen: 'BugList', label: 'Bugs', icon: 'bug-outline' },
      { screen: 'Feed', label: 'Feed', icon: 'rss' },
    ]

    const approvalSection = [
      { screen: 'LeaveList', label: 'Leaves', icon: 'calendar-clock' },
      { screen: 'WFHList', label: 'WFH', icon: 'home-account' },
    ]

    let items = [...homeSection]

    if (['amtarikshian', 'management', 'top_management', 'admin'].includes(currentUser.role)) {
      items = [...items, ...workSection]
    }

    if (['amtarikshian', 'management'].includes(currentUser.role)) {
      items = [...items, ...approvalSection]
    }

    if (currentUser.role === 'admin') {
      items = [...items, { screen: 'Settings', label: 'Settings', icon: 'cog-outline' }]
    }

    return items
  }

  const handleNavigate = (screen: string) => {
    onClose()
    navigation.navigate(screen)
  }

  const handleLogout = () => {
    onClose()
    signOut()
  }

  const navigationItems = getNavigationItems()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/amtariksha_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>Karmayog</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          <Divider style={styles.divider} />

          {/* User Profile */}
          {currentUser && (
            <View style={styles.profileSection}>
              <Avatar.Text
                size={60}
                label={currentUser.name.substring(0, 2).toUpperCase()}
                style={styles.avatar}
                color="#FFFFFF"
              />
              <Text style={styles.userName}>{currentUser.name}</Text>
              <Text style={styles.userRole}>{getRoleDisplayName(currentUser.role)}</Text>
              <Text style={styles.userId}>{currentUser.employeeId}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Navigation Items */}
          <ScrollView style={styles.menuItems}>
            {navigationItems.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.screen)}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Divider style={styles.divider} />

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={24} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: materialSpacing.lg,
    backgroundColor: colors.background,
  },
  logo: {
    width: 140,
    height: 31,
  },
  appTitle: {
    ...materialTypography.titleMedium,
    color: colors.text,
    flex: 1,
    marginLeft: materialSpacing.sm,
  },
  closeButton: {
    margin: 0,
  },
  profileSection: {
    padding: materialSpacing.lg,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  userName: {
    ...materialTypography.titleLarge,
    color: colors.text,
    marginTop: materialSpacing.sm,
  },
  userRole: {
    ...materialTypography.bodyMedium,
    color: colors.textSecondary,
    marginTop: materialSpacing.xs,
  },
  userId: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
    marginTop: materialSpacing.xs,
  },
  divider: {
    backgroundColor: colors.border,
  },
  menuItems: {
    maxHeight: 300,
    paddingVertical: materialSpacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: materialSpacing.md,
    paddingHorizontal: materialSpacing.lg,
  },
  menuItemText: {
    ...materialTypography.bodyLarge,
    color: colors.text,
    marginLeft: materialSpacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: materialSpacing.md,
    backgroundColor: colors.errorLight,
    marginHorizontal: materialSpacing.lg,
    marginVertical: materialSpacing.lg,
    borderRadius: 8,
  },
  logoutText: {
    ...materialTypography.labelLarge,
    color: colors.error,
    marginLeft: materialSpacing.sm,
    fontWeight: '600',
  },
})
