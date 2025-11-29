import React, { useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native'
import { Avatar, Text, Divider, List, Button, IconButton } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { getUserData } from '../utils/secureStorage'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { AuthContext } from '../contexts/AuthContext'

interface NavigationItem {
  screen: string
  label: string
  icon: string
}

interface CustomDrawerContentProps {
  visible: boolean
  onClose: () => void
}

export default function CustomDrawerContent({ visible, onClose }: CustomDrawerContentProps) {
  const navigation = useNavigation<any>()
  const { signOut } = React.useContext(AuthContext)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expandedAdmin, setExpandedAdmin] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const userData = await getUserData()
      if (userData) {
        setCurrentUser(userData)
      }
    }
    loadUser()
  }, [])

  const getNavigationItems = (): NavigationItem[] => {
    if (!currentUser) return []

    const baseItems: NavigationItem[] = [
      { screen: 'Dashboard', label: 'Dashboard', icon: 'view-dashboard' },
    ]


    switch (currentUser.role) {
      case 'amtarikshian':
        return [
          ...baseItems,
          { screen: 'TaskList', label: 'Tasks', icon: 'checkbox-marked-circle' },
          { screen: 'BugList', label: 'Development', icon: 'bug' },
          { screen: 'Feed', label: 'Feed', icon: 'rss' },
          { screen: 'LeaveList', label: 'Leave', icon: 'calendar-clock' },
          { screen: 'WFHList', label: 'WFH', icon: 'home-account' },
        ]

      case 'management':
        return [
          ...baseItems,
          { screen: 'TaskList', label: 'Tasks', icon: 'checkbox-marked-circle' },
          { screen: 'BugList', label: 'Development', icon: 'bug' },
          { screen: 'Feed', label: 'Feed', icon: 'rss' },
          { screen: 'LeaveList', label: 'Leave', icon: 'calendar-clock' },
          { screen: 'WFHList', label: 'WFH', icon: 'home-account' },
        ]

      case 'top_management':
        return [
          ...baseItems,
          { screen: 'TaskList', label: 'Tasks', icon: 'checkbox-marked-circle' },
          { screen: 'BugList', label: 'Development', icon: 'bug' },
          { screen: 'Feed', label: 'Feed', icon: 'rss' },
        ]

      case 'admin':
        return [
          ...baseItems,
          { screen: 'BugList', label: 'Development', icon: 'bug' },
          { screen: 'Feed', label: 'Feed', icon: 'rss' },
        ]

      default:
        return baseItems
    }
  }

  const adminItems: NavigationItem[] = [
    { screen: 'Projects', label: 'Projects', icon: 'briefcase' },
    { screen: 'MasterTasks', label: 'Master Tasks', icon: 'checkbox-marked-circle' },
    { screen: 'MasterBugs', label: 'Master Development', icon: 'bug' },
    { screen: 'Users', label: 'User Management', icon: 'account-group' },
    { screen: 'FeedTopics', label: 'Feed Topics', icon: 'rss' },
    { screen: 'Approvals', label: 'Approvals', icon: 'calendar-check' },
    { screen: 'Settings', label: 'Settings', icon: 'cog' },
    { screen: 'DeletedItems', label: 'Deleted Items', icon: 'delete' },
  ]

  const navigationItems = getNavigationItems()
  const showAdminSection = currentUser?.role === 'admin' || currentUser?.role === 'top_management'

  const handleLogout = async () => {
    await signOut()
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.menuContainer}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Image
                source={require('../../assets/amtariksha_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.appTitle}>JSR Task Management</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={onClose}
                style={styles.closeButton}
                iconColor={materialColors.surface}
              />
            </View>

            {/* User Profile Section */}
            <View style={styles.profileSection}>
              <Avatar.Text
                size={60}
                label={currentUser ? getInitials(currentUser.name) : '?'}
                style={styles.avatar}
                color={materialColors.surface}
              />
              <Text style={styles.userName}>{currentUser?.name || 'Loading...'}</Text>
              <Text style={styles.userRole}>{currentUser?.role || ''}</Text>
              <Text style={styles.userEmployeeId}>{currentUser?.employeeId || ''}</Text>
            </View>

            <Divider style={styles.divider} />

            {/* Navigation Items */}
            <View style={styles.navigationSection}>
              {navigationItems.map((item) => (
                <List.Item
                  key={item.screen}
                  title={item.label}
                  left={(props) => <List.Icon {...props} icon={item.icon} color={materialColors.primary} />}
                  onPress={() => {
                    if (item.screen === 'Dashboard') {
                      navigation.navigate('Main', { screen: 'HomeTab' })
                    } else {
                      navigation.navigate(item.screen)
                    }
                    onClose()
                  }}
                  style={styles.navItem}
                  titleStyle={styles.navItemTitle}
                />
              ))}

              {/* Admin Section */}
              {showAdminSection && (
                <>
                  <Divider style={styles.divider} />
                  <List.Accordion
                    title="Admin"
                    left={(props) => <List.Icon {...props} icon="shield-account" color={materialColors.primary} />}
                    expanded={expandedAdmin}
                    onPress={() => setExpandedAdmin(!expandedAdmin)}
                    style={styles.navItem}
                    titleStyle={styles.navItemTitle}
                  >
                    {adminItems.map((item) => (
                      <List.Item
                        key={item.screen}
                        title={item.label}
                        left={(props) => <List.Icon {...props} icon={item.icon} color={materialColors.textSecondary} />}
                        onPress={() => {
                          navigation.navigate(item.screen)
                          onClose()
                        }}
                        style={styles.adminNavItem}
                        titleStyle={styles.adminNavItemTitle}
                      />
                    ))}
                  </List.Accordion>
                </>
              )}
            </View>

            <Divider style={styles.divider} />

            {/* Logout Button */}
            <View style={styles.logoutSection}>
              <Button
                mode="contained"
                onPress={handleLogout}
                icon="logout"
                buttonColor={materialColors.error}
                textColor={materialColors.surface}
                style={styles.logoutButton}
              >
                Logout
              </Button>
            </View>
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    width: 300,
    backgroundColor: materialColors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: materialColors.primary,
    padding: materialSpacing.lg,
    paddingTop: materialSpacing.xxl,
    alignItems: 'center',
    position: 'relative',
  },
  logo: {
    width: 200,
    height: 50,
    marginBottom: materialSpacing.sm,
  },
  appTitle: {
    ...materialTypography.titleMedium,
    color: '#000000',
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  profileSection: {
    padding: materialSpacing.lg,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    backgroundColor: materialColors.primary,
    marginBottom: materialSpacing.md,
  },
  userName: {
    ...materialTypography.titleLarge,
    color: '#000000',
    fontWeight: '600',
  },
  userRole: {
    ...materialTypography.bodyMedium,
    color: '#666666',
    marginTop: materialSpacing.xs,
    textTransform: 'capitalize',
  },
  userEmployeeId: {
    ...materialTypography.bodySmall,
    color: '#999999',
    marginTop: materialSpacing.xs,
  },
  divider: {
    backgroundColor: materialColors.outline,
    marginVertical: materialSpacing.sm,
  },
  navigationSection: {
    flex: 1,
  },
  navItem: {
    paddingVertical: materialSpacing.xs,
  },
  navItemTitle: {
    ...materialTypography.bodyLarge,
    color: materialColors.text,
  },
  adminNavItem: {
    paddingLeft: materialSpacing.xl,
    paddingVertical: materialSpacing.xs,
  },
  adminNavItemTitle: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
  },
  logoutSection: {
    padding: materialSpacing.md,
  },
  logoutButton: {
    borderRadius: 8,
  },
})
