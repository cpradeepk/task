# Theme Update Guide for Remaining Screens

## Pattern for Making Screens Theme-Aware

### Step 1: Import useTheme Hook

```typescript
import { useTheme } from '../contexts/ThemeContext'
```

### Step 2: Get Colors in Component

```typescript
export default function YourScreen() {
  const { colors } = useTheme()
  // ... rest of component
```

### Step 3: Convert StyleSheet to Function

**Before:**
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB', // ❌ Hardcoded
  },
})
```

**After:**
```typescript
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.background, // ✅ Theme-aware
  },
})
```

### Step 4: Use Dynamic Styles in Component

```typescript
export default function YourScreen() {
  const { colors } = useTheme()
  const styles = getStyles(colors) // Call function with colors
  
  // ... rest of component
}
```

### Step 5: Update ActivityIndicator Colors

```typescript
// Before
<ActivityIndicator size="large" color="#3B82F6" />

// After
<ActivityIndicator size="large" color={colors.primary} />
```

---

## Color Mapping Reference

| Hardcoded Color | Theme Color Property | Usage |
|----------------|---------------------|-------|
| `#F9FAFB` | `colors.background` | Screen background |
| `#FFFFFF` | `colors.card` | Card/container background |
| `#111827` | `colors.text` | Primary text |
| `#6B7280` | `colors.textSecondary` | Secondary text |
| `#9CA3AF` | `colors.textTertiary` | Tertiary text (hints, labels) |
| `#E5E7EB` | `colors.border` | Borders |
| `#F3F4F6` | `colors.borderLight` | Light borders/backgrounds |
| `#3B82F6` | `colors.primary` | Primary actions, buttons |
| `#EFF6FF` | `colors.primaryLight` | Primary light backgrounds |
| `#10B981` | `colors.success` | Success states |
| `#D1FAE5` | `colors.successLight` | Success backgrounds |
| `#F59E0B` | `colors.warning` | Warning states |
| `#FEF3C7` | `colors.warningLight` | Warning backgrounds |
| `#EF4444` | `colors.error` | Error states |
| `#FEE2E2` | `colors.errorLight` | Error backgrounds |
| `#8B5CF6` | `colors.purple` | Purple accents |
| `#EC4899` | `colors.pink` | Pink accents |

---

## Screens to Update (Priority Order)

### High Priority (User-Facing)
1. ✅ **LeaveListScreen** - COMPLETE
2. ⏳ **LeaveDetailsScreen** - Same pattern as LeaveListScreen
3. ⏳ **CreateLeaveScreen** - Same pattern
4. ⏳ **WFHListScreen** - Same pattern
5. ⏳ **WFHDetailsScreen** - Same pattern
6. ⏳ **CreateWFHScreen** - Same pattern
7. ⏳ **DashboardScreen** - Main screen, high visibility
8. ⏳ **BugListScreen** - Frequently used
9. ⏳ **TaskListScreen** - Frequently used

### Medium Priority
10. ⏳ **BugDetailsScreen**
11. ⏳ **TaskDetailsScreen**
12. ⏳ **CreateBugScreen**
13. ⏳ **CreateTaskScreen**
14. ⏳ **FeedScreen**
15. ⏳ **NotificationsScreen**

### Low Priority (Already Updated)
- ✅ **SettingsScreen** - Already has dark mode toggle
- ✅ **LoginScreen** - Can remain light-only

---

## Example: Complete Update for LeaveDetailsScreen

```typescript
// 1. Add import
import { useTheme } from '../contexts/ThemeContext'

// 2. Get colors in component
export default function LeaveDetailsScreen({ route }: any) {
  const { colors } = useTheme()
  const styles = getStyles(colors) // Add this line
  
  // ... rest of component
  
  // 3. Update ActivityIndicator
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

// 4. Convert StyleSheet to function
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Was: '#F9FAFB'
  },
  card: {
    backgroundColor: colors.card, // Was: '#FFFFFF'
    borderColor: colors.border, // Was: '#E5E7EB'
  },
  title: {
    color: colors.text, // Was: '#111827'
  },
  subtitle: {
    color: colors.textSecondary, // Was: '#6B7280'
  },
  button: {
    backgroundColor: colors.primary, // Was: '#3B82F6'
  },
  // ... rest of styles
})
```

---

## Quick Find & Replace Tips

For each screen file:

1. **Find:** `const styles = StyleSheet.create({`
   **Replace:** `const getStyles = (colors: any) => StyleSheet.create({`

2. **Find:** `backgroundColor: '#F9FAFB'`
   **Replace:** `backgroundColor: colors.background`

3. **Find:** `backgroundColor: '#FFFFFF'`
   **Replace:** `backgroundColor: colors.card`

4. **Find:** `color: '#111827'`
   **Replace:** `color: colors.text`

5. **Find:** `color: '#6B7280'`
   **Replace:** `color: colors.textSecondary`

6. **Find:** `color: '#9CA3AF'`
   **Replace:** `color: colors.textTertiary`

7. **Find:** `borderColor: '#E5E7EB'`
   **Replace:** `borderColor: colors.border`

8. **Find:** `backgroundColor: '#3B82F6'`
   **Replace:** `backgroundColor: colors.primary`

9. **Find:** `color="#3B82F6"`
   **Replace:** `color={colors.primary}`

---

## Estimated Time per Screen

- Simple screens (List, Details): 5-10 minutes each
- Complex screens (Create forms): 10-15 minutes each
- Total for all remaining screens: ~2-3 hours

---

## Testing Checklist

After updating each screen:
- [ ] Screen renders correctly in light mode
- [ ] Screen renders correctly in dark mode
- [ ] Toggle theme in Settings - screen updates immediately
- [ ] All text is readable (good contrast)
- [ ] All buttons/cards have proper colors
- [ ] No hardcoded colors remain (search for `#` in file)

