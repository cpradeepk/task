# Material Design 3 Implementation Guide

**Last Updated:** 2025-11-12  
**Status:** In Progress  
**Completed:** OfflineBanner component, Material theme configuration

---

## Overview

This guide documents the Material Design 3 implementation for the JSR Task Management mobile app. The goal is to redesign all screens with modern Material Design 3 principles while preserving existing offline functionality.

---

## Completed Work

### 1. Material Design Theme Configuration ✅

**File:** `apps/mobile/src/config/materialTheme.ts`

**Features:**
- Material Design 3 color palette (light and dark modes)
- Typography scale (Display, Headline, Title, Body, Label)
- Spacing system (8dp grid: xs=4, sm=8, md=16, lg=24, xl=32, xxl=48)
- Elevation levels (level0-level5)
- React Native Paper theme integration

**Usage:**
```typescript
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'

const styles = StyleSheet.create({
  container: {
    padding: materialSpacing.md,
    backgroundColor: materialColors.surface,
  },
  title: {
    ...materialTypography.headlineMedium,
    color: materialColors.text,
  },
})
```

---

### 2. OfflineBanner Component ✅

**File:** `apps/mobile/src/components/OfflineBanner.tsx`

**Features:**
- Material Design 3 styling with elevation and shadows
- Smooth slide-in/slide-out animations using Animated API
- Two-line layout with icon, title, and subtitle
- Proper Material typography and spacing
- Enabled in `App.tsx` (previously commented out)

**Material Design Elements:**
- ✅ Elevation (level2)
- ✅ Material colors (warning background, white text)
- ✅ Material typography (titleMedium, bodySmall)
- ✅ Material spacing (md padding, sm icon margin)
- ✅ Smooth animations (spring for slide-in, timing for slide-out)

---

## Dependencies Installed

```json
{
  "react-native-paper": "^5.x",
  "react-native-safe-area-context": "^4.x"
}
```

**Note:** React Native Paper is the official Material Design 3 library for React Native.

---

## Material Design 3 Principles

### 1. Color System

**Light Mode:**
- Primary: #1976D2 (Blue 700)
- Secondary: #FF6F00 (Orange 900)
- Surface: #FFFFFF
- Background: #FAFAFA
- Error: #F44336 (Red 500)

**Dark Mode:**
- Primary: #90CAF9 (Blue 200)
- Secondary: #FFB74D (Orange 300)
- Surface: #1E1E1E
- Background: #121212
- Error: #E57373 (Red 300)

### 2. Typography Scale

- **Display:** Large headings (57px, 45px, 36px)
- **Headline:** Section headers (32px, 28px, 24px)
- **Title:** Card titles, list headers (22px, 16px, 14px)
- **Body:** Main content (16px, 14px, 12px)
- **Label:** Buttons, labels (14px, 12px, 11px)

### 3. Spacing (8dp Grid)

- xs: 4dp
- sm: 8dp
- md: 16dp
- lg: 24dp
- xl: 32dp
- xxl: 48dp

### 4. Elevation Levels

- Level 0: No elevation (flat)
- Level 1: 1dp (subtle)
- Level 2: 3dp (cards, buttons)
- Level 3: 6dp (floating action buttons)
- Level 4: 8dp (navigation drawer)
- Level 5: 12dp (modal dialogs)

---

## Screen Redesign Checklist

For each screen, follow this checklist to ensure Material Design 3 compliance:

### Visual Design

- [ ] Use Material colors from `materialColors`
- [ ] Apply Material typography from `materialTypography`
- [ ] Use Material spacing from `materialSpacing`
- [ ] Add appropriate elevation to cards and surfaces
- [ ] Implement proper shadows (shadowColor, shadowOffset, shadowOpacity, shadowRadius)
- [ ] Use Material Design icons (consider `@expo/vector-icons` MaterialCommunityIcons)

### Components

- [ ] Replace custom buttons with Material buttons (React Native Paper Button)
- [ ] Use Material cards for list items (React Native Paper Card)
- [ ] Implement Material text inputs (React Native Paper TextInput)
- [ ] Add Material FAB (Floating Action Button) where appropriate
- [ ] Use Material chips for tags/filters
- [ ] Implement Material snackbars for notifications

### Animations

- [ ] Add smooth transitions (Animated API or Reanimated)
- [ ] Implement ripple effects for touch feedback
- [ ] Use spring animations for natural movement
- [ ] Add fade-in animations for content loading

### Offline Handling

- [ ] Integrate OfflineBanner component
- [ ] Disable action buttons when offline (or show "Will sync later" message)
- [ ] Display offline status in UI (badges, icons)
- [ ] Show queued operations count (when mutation queue is implemented)

### Accessibility

- [ ] Ensure touch targets are at least 48x48dp
- [ ] Maintain proper color contrast ratios (WCAG AA)
- [ ] Add accessibility labels for screen readers
- [ ] Support dynamic font sizing

---

## Screen-by-Screen Implementation Plan

### Priority 1: Core Screens (High Impact)

#### 1. LoginScreen.tsx
**Material Design Elements:**
- Gradient background or Material surface
- Material TextInput with outlined variant
- Material Button with contained variant
- Smooth fade-in animation
- Material typography for title and labels

**Offline Handling:**
- Show offline banner if no connection
- Disable login button when offline
- Display cached user info (if available)

---

#### 2. DashboardScreen.tsx
**Material Design Elements:**
- Card-based layout with elevation
- Material FAB for quick actions
- Material chips for filters
- Number ticker animations for statistics
- Pull-to-refresh with Material loading indicator

**Offline Handling:**
- Show offline banner
- Display cached statistics
- Indicate which data is stale

---

#### 3. TaskListScreen.tsx
**Material Design Elements:**
- Material cards for each task
- Swipe actions (edit, delete) with ripple effects
- Material chips for status/priority
- Floating Action Button for "Create Task"
- Pull-to-refresh
- Empty state with Material illustration

**Offline Handling:**
- Show offline banner
- Display cached tasks
- Disable create/edit when offline (or queue)
- Show "Queued" badge for pending operations

---

#### 4. TaskDetailsScreen.tsx
**Material Design Elements:**
- Collapsible sections with Material expansion panels
- Material chips for assignees, tags
- Floating timer widget (Material FAB variant)
- Material buttons for actions
- Material dividers between sections

**Offline Handling:**
- Show offline banner
- Display cached task details
- Disable edit/delete when offline
- Show timer status (offline timers not allowed)

---

### Priority 2: Secondary Screens (Medium Impact)

#### 5. BugListScreen.tsx
Similar to TaskListScreen with bug-specific styling

#### 6. BugDetailsScreen.tsx
Similar to TaskDetailsScreen with attachment gallery

#### 7. FeedScreen.tsx
**Material Design Elements:**
- Card-based posts with elevation
- Material buttons for reactions
- Smooth scroll animations
- Pull-to-refresh

---

### Priority 3: Utility Screens (Low Impact)

#### 8. CreateTaskScreen.tsx
#### 9. CreateBugScreen.tsx
#### 10. SettingsScreen.tsx
#### 11. NotificationsScreen.tsx
#### 12. LeaveListScreen.tsx
#### 13. LeaveDetailsScreen.tsx
#### 14. CreateLeaveScreen.tsx
#### 15. WFHListScreen.tsx
#### 16. WFHDetailsScreen.tsx
#### 17. CreateWFHScreen.tsx
#### 18. FeedPostDetailsScreen.tsx
#### 19. CreateFeedPostScreen.tsx

---

## React Native Paper Components Reference

### Buttons
```typescript
import { Button } from 'react-native-paper'

<Button mode="contained" onPress={handlePress}>
  Submit
</Button>

<Button mode="outlined" onPress={handlePress}>
  Cancel
</Button>

<Button mode="text" onPress={handlePress}>
  Learn More
</Button>
```

### Cards
```typescript
import { Card } from 'react-native-paper'

<Card elevation={2}>
  <Card.Title title="Task Title" subtitle="Assigned to John" />
  <Card.Content>
    <Text>Task description...</Text>
  </Card.Content>
  <Card.Actions>
    <Button>Edit</Button>
    <Button>Delete</Button>
  </Card.Actions>
</Card>
```

### Text Inputs
```typescript
import { TextInput } from 'react-native-paper'

<TextInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  mode="outlined"
  left={<TextInput.Icon icon="email" />}
/>
```

### FAB (Floating Action Button)
```typescript
import { FAB } from 'react-native-paper'

<FAB
  icon="plus"
  style={styles.fab}
  onPress={handleCreate}
/>
```

### Chips
```typescript
import { Chip } from 'react-native-paper'

<Chip icon="information" onPress={handlePress}>
  High Priority
</Chip>
```

---

## Next Steps

1. **Redesign LoginScreen** with Material Design 3
2. **Redesign DashboardScreen** with card-based layout
3. **Redesign TaskListScreen** with Material cards and FAB
4. **Redesign TaskDetailsScreen** with collapsible sections
5. **Continue with remaining screens** following the checklist

---

## Testing Checklist

After redesigning each screen:

- [ ] Test on Android device (Material Design native platform)
- [ ] Test on iOS device (ensure Material Design adapts well)
- [ ] Test light and dark modes
- [ ] Test offline scenarios (banner appears, actions disabled)
- [ ] Test animations (smooth, no jank)
- [ ] Test accessibility (screen reader, font scaling)
- [ ] Test touch targets (48x48dp minimum)
- [ ] Build APK and test on Nokia 5.4

---

## Resources

- [Material Design 3 Guidelines](https://m3.material.io/)
- [React Native Paper Documentation](https://callstack.github.io/react-native-paper/)
- [Material Design Color Tool](https://material.io/resources/color/)
- [Material Design Icons](https://materialdesignicons.com/)

---

**End of Guide**

