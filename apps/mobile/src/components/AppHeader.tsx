/**
 * AppHeader Component
 * A reusable, premium header toolbar for all tab screens in the mobile app.
 * Includes a drawer toggler, screen title, theme toggle, notification bell, and project filter.
 */

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text, IconButton, Modal, Portal, Checkbox, Button as PaperButton, Divider } from 'react-native-paper'
import { useTheme, useDrawer } from '../contexts/ThemeContext'
import { useProjectFilter } from '../contexts/ProjectFilterContext'
import NotificationBell from './NotificationBell'
import { materialTypography } from '../config/materialTheme'

interface AppHeaderProps {
  title: string
  rightAction?: React.ReactNode
}

export default function AppHeader({ title, rightAction }: AppHeaderProps) {
  const { colors, theme, toggleTheme } = useTheme()
  const { openDrawer } = useDrawer()
  const { selectedProjectIds, setSelectedProjectIds, projects, isLoading } = useProjectFilter()
  const [isModalVisible, setIsModalVisible] = useState(false)

  const handleToggleProject = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      setSelectedProjectIds(selectedProjectIds.filter(id => id !== projectId))
    } else {
      setSelectedProjectIds([...selectedProjectIds, projectId])
    }
  }

  const handleSelectAll = () => {
    setSelectedProjectIds(projects.map(p => p.projectId))
  }

  const handleClearAll = () => {
    setSelectedProjectIds([])
  }

  return (
    <>
      <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.leftSection}>
          <IconButton
            icon="menu"
            size={24}
            iconColor={colors.text}
            onPress={openDrawer}
            style={styles.iconButton}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.rightSection}>
          {/* Project Filter Button */}
          <View style={{ position: 'relative' }}>
            <IconButton
              icon="folder-multiple"
              size={22}
              iconColor={selectedProjectIds.length > 0 ? colors.primary : colors.text}
              onPress={() => setIsModalVisible(true)}
              style={styles.iconButton}
            />
            {selectedProjectIds.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{selectedProjectIds.length}</Text>
              </View>
            )}
          </View>

          <IconButton
            icon={theme === 'dark' ? 'weather-sunny' : 'weather-night'}
            size={22}
            iconColor={colors.text}
            onPress={toggleTheme}
            style={styles.iconButton}
          />
          <NotificationBell />
          {rightAction}
        </View>
      </View>

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Projects</Text>
            <IconButton
              icon="close"
              size={20}
              iconColor={colors.textSecondary}
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            />
          </View>
          
          <Divider style={{ backgroundColor: colors.border }} />

          <View style={styles.actionButtonsRow}>
            <PaperButton
              mode="text"
              compact
              textColor={colors.primary}
              onPress={handleSelectAll}
            >
              Select All
            </PaperButton>
            <PaperButton
              mode="text"
              compact
              textColor={colors.primary}
              onPress={handleClearAll}
            >
              Clear
            </PaperButton>
          </View>

          <Divider style={{ backgroundColor: colors.border }} />

          <ScrollView style={styles.projectsList}>
            {isLoading ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading projects...</Text>
            ) : projects.length === 0 ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>No projects found</Text>
            ) : (
              projects.map(project => {
                const isSelected = selectedProjectIds.includes(project.projectId)
                return (
                  <TouchableOpacity
                    key={project.id}
                    onPress={() => handleToggleProject(project.projectId)}
                    style={[
                      styles.projectItem,
                      isSelected && { backgroundColor: colors.primaryLight + '30' }
                    ]}
                  >
                    <Checkbox
                      status={isSelected ? 'checked' : 'unchecked'}
                      color={colors.primary}
                      onPress={() => handleToggleProject(project.projectId)}
                    />
                    <Text style={[styles.projectName, { color: colors.text }]}>
                      {project.projectName}
                    </Text>
                  </TouchableOpacity>
                )
              })
            )}
          </ScrollView>

          <Divider style={{ backgroundColor: colors.border }} />

          <View style={styles.modalFooter}>
            <PaperButton
              mode="contained"
              buttonColor={colors.primary}
              textColor="#FFFFFF"
              onPress={() => setIsModalVisible(false)}
              style={styles.applyButton}
            >
              Apply Filter
            </PaperButton>
          </View>
        </Modal>
      </Portal>
    </>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...materialTypography.titleLarge,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    margin: 0,
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  projectsList: {
    marginVertical: 10,
    maxHeight: 300,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginVertical: 2,
  },
  projectName: {
    ...materialTypography.bodyMedium,
    marginLeft: 8,
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  modalFooter: {
    marginTop: 10,
    alignItems: 'center',
  },
  applyButton: {
    width: '100%',
    borderRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
})
