# Stelli - TODO & Backlog

This document tracks pending features, improvements, and known issues for the Stelli app.

---

## 🚀 In Progress

### UI Consistency - Native Modal Replacement
**Status**: 62% Complete (5/8 files)

Replace all native `Alert.alert` and `ActionSheetIOS` modals with custom `CustomActionSheet` component for consistent styling.

**Completed**:
- ✅ [app/(authenticated)/list/[id].tsx](app/(authenticated)/list/[id].tsx) - List detail screen (6 instances)
- ✅ [app/(authenticated)/entry/[id].tsx](app/(authenticated)/entry/[id].tsx) - Entry detail screen (5 instances)
- ✅ [components/ShareListModal.tsx](components/ShareListModal.tsx) - Share list modal (3 instances)
- ✅ [app/(authenticated)/create-list.tsx](app/(authenticated)/create-list.tsx) - Create list screen (2 instances)
- ✅ [app/(authenticated)/add-entry/[listId].tsx](app/(authenticated)/add-entry/[listId].tsx) - Add entry screen (2 instances)

**Remaining**:
- ⏳ [app/shared/[token].tsx](app/shared/[token].tsx) - Shared list screen (3 instances)
- ⏳ [app/sign-up.tsx](app/sign-up.tsx) - Sign up screen (2 instances)
- ⏳ [app/index.tsx](app/index.tsx) - Welcome screen (4 instances)

---

## 📋 To Do

### Core Features

#### Entry Management
- **Delete Entry Implementation** - [list/[id].tsx:150](app/(authenticated)/list/[id].tsx:150)
  - Implement actual delete entry mutation
  - Currently shows success message without deleting
  - Priority: HIGH

#### Sort & Filter
- **Apply Sort & Filter Logic** - [list/[id].tsx:204](app/(authenticated)/list/[id].tsx:204)
  - Implement the apply functionality for sort/filter modal
  - Currently non-functional
  - Priority: MEDIUM

- **Sorting Logic** - [list/[id].tsx:211](app/(authenticated)/list/[id].tsx:211)
  - Implement actual sorting by date/rating/name
  - Sort UI exists but doesn't filter results
  - Priority: MEDIUM

- **Filtering Logic** - [list/[id].tsx:217](app/(authenticated)/list/[id].tsx:217)
  - Implement filtering (all/highRated/recent)
  - Filter UI exists but doesn't filter results
  - Priority: MEDIUM

### Premium Features (Phase 2)

#### Voice-to-Text Entry Creation
- **Status**: Not Started
- **Requirements**:
  - OpenAI Whisper integration for speech-to-text
  - GPT-4o-mini for field extraction from transcribed text
  - Recording UI component
  - Premium subscription gate
  - Environment variables for OpenAI API key
- **Priority**: LOW (Premium feature)

#### Photo Attachments
- **Status**: Not Started
- **Requirements**:
  - Photo field type in field definitions
  - Image picker integration (already have expo-image-picker)
  - Supabase storage for photos
  - Premium subscription gate
- **Priority**: LOW (Premium feature)

#### Location Fields
- **Status**: Not Started
- **Requirements**:
  - Location field type in field definitions
  - Map integration (expo-location)
  - Location picker component
  - Premium subscription gate
- **Priority**: LOW (Premium feature)

### Missing Screens

#### Edit List Screen
- **File**: `app/(authenticated)/edit-list/[id].tsx`
- **Status**: Not Created
- **Description**: Allow users to edit existing lists (name, description, icon, rating type, fields)
- **Referenced From**: [list/[id].tsx:150](app/(authenticated)/list/[id].tsx:150)
- **Priority**: HIGH

### Testing

#### Test Infrastructure
- **Status**: Not Set Up
- **Requirements**:
  - Jest configuration
  - React Native Testing Library
  - Unit tests for components
  - Integration tests for screens
  - E2E tests for critical flows
- **Priority**: MEDIUM

---

## 🐛 Known Issues

### Non-Critical Bugs

#### 1. View-Only Message Content
- **Location**: [list/[id].tsx:922](app/(authenticated)/list/[id].tsx:922)
- **Issue**: View-only message just shows "View Only" without explanation
- **Expected**: "This is a view-only list. You can view all entries, but cannot edit or add to this list."
- **Severity**: COSMETIC
- **Fix**: Update title parameter in CustomActionSheet to include full message

#### 2. Success Message Timing
- **Location**: Multiple files ([list/[id].tsx:171](app/(authenticated)/list/[id].tsx:171), [add-entry/[listId].tsx:103](app/(authenticated)/add-entry/[listId].tsx:103))
- **Issue**: Success messages auto-dismiss after 1500ms which might be too fast for users to read
- **Reproduction**: Create an entry or delete a list - success message disappears quickly
- **Consideration**: May want to require user dismissal instead of auto-dismiss
- **Severity**: MINOR

#### 3. window.location.reload() in React Native
- **Location**: [home.tsx:256](app/(authenticated)/home.tsx:256)
- **Issue**: Using `window.location.reload()` in error handler - this is a web API and won't work in React Native
- **Expected**: Should use queryClient.invalidateQueries or router navigation
- **Severity**: MINOR (breaks functionality on error)
- **Fix**: Replace with `queryClient.invalidateQueries({ queryKey: ['userLists', 'subscribedLists'] })` or similar

#### 4. Delete Entry Not Implemented
- **Location**: [list/[id].tsx:150](app/(authenticated)/list/[id].tsx:150)
- **Issue**: Delete entry mutation is not implemented - TODO comment indicates it's incomplete
- **Expected**: Should call an actual mutation to delete the entry from database
- **Severity**: MINOR (feature incomplete)
- **Current Behavior**: Shows success message without actually deleting
- **Fix**: Implement actual delete mutation using useEntryActions hook

#### 5. Sort & Filter Apply Button Non-Functional
- **Location**: [list/[id].tsx:204](app/(authenticated)/list/[id].tsx:204)
- **Issue**: Apply button in sort/filter modal doesn't actually apply the filters
- **Expected**: Should filter and sort the entries list based on selected criteria
- **Severity**: MINOR (feature incomplete)
- **Current Behavior**: Modal closes but no filtering/sorting happens
- **Fix**: Implement actual sorting/filtering logic using appliedSortCriteria and appliedFilterCriteria state

#### 6. Sort/Filter UI State Not Persisted
- **Location**: [list/[id].tsx:208-217](app/(authenticated)/list/[id].tsx:208-217)
- **Issue**: handleSortChange and handleFilterChange update state but don't actually filter entries
- **Expected**: Entries should be sorted/filtered in real-time or on apply
- **Severity**: MINOR (feature incomplete)
- **Related**: Issue #5 above

#### 7. Rating Type "None" Defaults to "Stars"
- **Location**: [create-list.tsx:333](app/(authenticated)/create-list.tsx:333)
- **Issue**: When user selects "None" rating type, it still creates list with 'stars' rating type
- **Expected**: Should create list with no rating requirement when "None" is selected
- **Severity**: MINOR
- **Current Code**: `rating_type: ratingType === 'none' ? 'stars' : ratingType`
- **Fix**: Need to handle 'none' properly in database schema or use null

#### 8. Missing Required Field Star in Entry Detail View Mode
- **Location**: [entry/[id].tsx:419](app/(authenticated)/entry/[id].tsx:419)
- **Issue**: In view-only mode, field labels don't show required asterisk
- **Expected**: For consistency, required fields should show asterisk in both edit and view modes (or document this is intentional)
- **Severity**: TRIVIAL (cosmetic inconsistency)
- **Note**: This may be intentional for cleaner view mode

#### 9. Number Input Allows Incomplete Values
- **Location**: [FieldInput.tsx:60-62](components/FieldInput.tsx:60-62)
- **Issue**: Number input allows storing incomplete strings like "5." or "-" as values
- **Expected**: Should only store valid numbers or null
- **Severity**: MINOR
- **Impact**: Could cause issues when displaying or calculating with these values
- **Fix**: Convert incomplete strings to valid numbers before storing

#### 10. Entry Name Field Uses Generic ID 'name'
- **Location**: [add-entry/[listId].tsx:153](app/(authenticated)/add-entry/[listId].tsx:153), [entry/[id].tsx:296](app/(authenticated)/entry/[id].tsx:296)
- **Issue**: The Name field is accessed using string 'name' instead of field ID '1'
- **Expected**: Should use consistent field ID approach (field_values['1'])
- **Severity**: MINOR (inconsistency)
- **Current**: Mix of `fieldValues.name` and `fieldValues['1']`
- **Impact**: Could cause confusion or bugs if field definition changes

#### 11. Empty Field Name Shows Generic Placeholder
- **Location**: [create-list.tsx:107](app/(authenticated)/create-list.tsx:107)
- **Issue**: When custom field has no name, shows "Field #X" in collapsed state
- **Expected**: This is actually good UX, but could be improved to show field type as well
- **Severity**: TRIVIAL (enhancement opportunity)
- **Suggestion**: Show "Field #X (text)" or "Field #X (dropdown)"

#### 12. Dropdown Can Be Deselected to Null
- **Location**: [FieldInput.tsx:186](components/FieldInput.tsx:186)
- **Issue**: Dropdown fields can be toggled off back to null, even if required
- **Expected**: For required dropdowns, should select another option instead of deselecting
- **Severity**: MINOR
- **Impact**: Validation will catch it, but UX could be better

#### 13. Privacy Setting Exists But Isn't Used
- **Location**: [create-list.tsx:290](app/(authenticated)/create-list.tsx:290)
- **Issue**: User can select Public/Private but it's only tracked in analytics, not saved to database
- **Expected**: Should save is_public field to database or remove the UI
- **Severity**: MINOR (feature incomplete)
- **Current**: `isPublic` state is set but never used in mutation

#### 14. Entry Card Assumes Field '1' is Name
- **Location**: [EntryCard.tsx:57](components/EntryCard.tsx:57)
- **Issue**: Uses `entry.field_values?.name` to get entry name
- **Expected**: Should use consistent field_values['1'] or document the name mapping
- **Severity**: TRIVIAL (inconsistency with other parts of code)

#### 15. Star Rating Display Has Hardcoded Icon Size
- **Location**: [EntryCard.tsx:111](components/EntryCard.tsx:111)
- **Issue**: Star icon size is hardcoded to 9px in circular layout
- **Expected**: Should use responsive sizing or design system constant
- **Severity**: TRIVIAL (cosmetic)

#### 16. Temporary Testing Code Left In Production
- **Location**: [home.tsx:79-80](app/(authenticated)/home.tsx:79-80)
- **Issue**: Comment says "TEMP: Allow unlimited lists for testing" but code overrides subscription check
- **Expected**: Should remove this before production or gate it behind feature flag
- **Severity**: MINOR (testing code in production)
- **Security**: Could allow free users to bypass subscription limits
- **Fix**: Remove line 80 or implement proper feature flag

#### 17. Coming Soon Alert for Share Feature
- **Location**: [home.tsx:475](app/(authenticated)/home.tsx:475)
- **Issue**: Share button shows "Coming Soon" alert instead of being disabled or hidden
- **Expected**: Either implement sharing or hide the button until ready
- **Severity**: TRIVIAL (UX)
- **Note**: Sharing IS implemented in list detail screen but not in home screen menu

#### 18. No Validation on Display Name Length
- **Location**: [profile.tsx:67-68](app/(authenticated)/profile.tsx:67-68)
- **Issue**: Display name only checks if trimmed name is empty, no max length validation
- **Expected**: Should enforce reasonable max length (e.g., 50 characters)
- **Severity**: MINOR
- **Impact**: Could cause UI layout issues with very long names

#### 19. Avatar Upload Has No Size Limit
- **Location**: [profile.tsx:89-145](app/(authenticated)/profile.tsx:89-145)
- **Issue**: Avatar upload doesn't check file size before uploading
- **Expected**: Should validate file size (e.g., max 5MB) and show error if too large
- **Severity**: MINOR
- **Impact**: Could cause slow uploads or storage bloat
- **Suggested Fix**: Add file size check and image compression

#### 20. Date Picker Always Opens Even in Readonly Mode
- **Location**: [FieldInput.tsx:84-88](components/FieldInput.tsx:84-88)
- **Issue**: Date picker handlers are defined but readonly check happens before rendering button
- **Expected**: Current implementation is correct, just documenting for clarity
- **Severity**: N/A (not a bug, just a code note)

#### 21. Field Name Accessed Inconsistently
- **Location**: Multiple files
- **Issue**: Entry name field accessed as both `field_values['1']` and `field_values.name`
- **Files**: [list/[id].tsx:521](app/(authenticated)/list/[id].tsx:521), [EntryCard.tsx:57](components/EntryCard.tsx:57)
- **Expected**: Should use consistent approach throughout codebase
- **Severity**: MINOR (inconsistency)
- **Recommendation**: Standardize on field_values['1'] or create a helper function

#### 22. No Confirmation on FAB Quick Create
- **Location**: [home.tsx:386-394](app/(authenticated)/home.tsx:386-394)
- **Issue**: FAB (Floating Action Button) and "+ New List" button both create lists without confirmation
- **Expected**: This is probably intentional, but worth documenting
- **Severity**: N/A (design choice, not a bug)

#### 23. Share Token Import Has No Validation
- **Location**: [home.tsx:165-177](app/(authenticated)/home.tsx:165-177)
- **Issue**: Share token input only checks if trimmed token is empty, no format validation
- **Expected**: Should validate token format (UUID pattern) before navigating
- **Severity**: MINOR
- **Impact**: Invalid tokens will fail on next screen anyway, but early validation improves UX

#### 24. Profile Picture Quality Set to 0.8
- **Location**: [profile.tsx:209](app/(authenticated)/profile.tsx:209), [profile.tsx:238](app/(authenticated)/profile.tsx:238)
- **Issue**: Image quality is hardcoded to 0.8 (80%)
- **Expected**: This is probably fine, but could be a constant in style guide
- **Severity**: TRIVIAL (not really a bug)
- **Recommendation**: Move to constants for consistency

#### 25. CustomActionSheet Text Formatting Issues
- **Location**: [CustomActionSheet.tsx](components/CustomActionSheet.tsx)
- **Issue**: Font size is too large or text doesn't fit properly in action sheet titles
- **Examples**:
  - Long confirmation messages get cut off
  - Multi-line titles may not have proper spacing
  - Font size doesn't scale well for different message lengths
- **Expected**: Text should wrap properly and be readable regardless of message length
- **Severity**: MINOR (cosmetic/UX)
- **Reproduction**: View any CustomActionSheet with long title text (e.g., share link success message, delete confirmations)
- **Fix**:
  - Adjust title typography in CustomActionSheet styles
  - Add proper lineHeight and maxHeight
  - Consider using ScrollView for very long messages
  - Make font size responsive to content length

#### 26. Imported List Metadata Doesn't Fit on One Line
- **Location**: List card component displaying imported/subscribed lists
- **Issue**: When displaying imported list metadata (number of entries, last updated date, original owner), the text overflows and doesn't fit on one line
- **Expected**: Metadata should either:
  - Wrap to multiple lines cleanly
  - Use smaller font size
  - Stack vertically instead of horizontally
  - Truncate with ellipsis
- **Severity**: MINOR (cosmetic/UX)
- **Reproduction**: Import a list from another user and view it in the home screen
- **Impact**: Makes the UI look cluttered and unprofessional
- **Fix**:
  - Redesign metadata layout to stack vertically
  - Add proper text truncation with ellipsis
  - Reduce font size for metadata text
  - Use numberOfLines prop to limit text wrapping

### Peer Dependencies
- **Issue**: React 19.1 vs 19.2 conflicts
- **Workaround**: Use `--legacy-peer-deps` flag when installing packages
- **Documentation**: Already noted in [CLAUDE.md](CLAUDE.md)
- **Severity**: LOW (has workaround)

---

## 📝 Future Enhancements

### UX Improvements

#### Empty State Improvements
- Add illustrations to empty states
- Add "Get Started" tutorials for first-time users
- Add sample templates users can import

#### Onboarding
- Create welcome flow for new users
- Add feature discovery prompts
- Create interactive tutorial

#### Accessibility
- Add screen reader support
- Add high contrast mode
- Add font size preferences
- Improve keyboard navigation

### Performance

#### Image Optimization
- Implement lazy loading for entry cards
- Add image caching
- Optimize avatar uploads (resize before upload)

#### List Virtualization
- Implement FlatList for large entry lists
- Add pagination for lists with 100+ entries

### Features

#### Export/Import
- Export lists to CSV/JSON
- Import lists from CSV
- Backup/restore functionality

#### Search
- Global search across all lists
- Entry search within lists
- Field-specific search filters

#### Collaboration
- Real-time updates for shared lists
- Comments on entries
- Activity feed for shared lists

#### Analytics
- Usage statistics dashboard
- List insights (most used fields, average ratings)
- Personal trends over time

---

## 📚 Documentation

### Missing Documentation

#### README.md
- **Status**: Not Created
- **Should Include**:
  - Project description
  - Setup instructions
  - Environment variables
  - Running the app
  - Building for production
  - Contributing guidelines
- **Priority**: MEDIUM

#### API Documentation
- **Status**: Not Created
- **Should Include**:
  - Database schema documentation
  - Supabase RLS policies
  - Edge functions documentation
- **Priority**: LOW

#### Component Documentation
- **Status**: Partial (COMPONENTS.md exists)
- **Needs**:
  - Usage examples for all components
  - Prop type documentation
  - Storybook integration
- **Priority**: LOW

---

## 🔄 Technical Debt

### Code Quality

#### Form Validation
- **Current**: Manual validation in multiple places
- **Needed**: Centralized validation with react-hook-form + zod
- **Files**: Already installed, need to implement
- **Priority**: MEDIUM

#### Error Handling
- **Current**: Inconsistent error handling
- **Needed**: Global error boundary, standardized error messages
- **Priority**: MEDIUM

#### TypeScript Strictness
- **Current**: Some `any` types used
- **Needed**: Remove all `any` types, strict null checks
- **Priority**: LOW

### Refactoring

#### Duplicate Code
- Action sheet options arrays are similar across files
- Consider creating a helper function for common patterns
- **Priority**: LOW

#### Magic Numbers
- Some hardcoded values (timeouts, dimensions) should be constants
- **Priority**: LOW

---

## 📅 Roadmap

### Phase 1: Core Functionality (Current)
- ✅ List creation and management
- ✅ Entry creation and viewing
- ✅ Custom fields
- ✅ Rating systems
- ✅ List sharing
- ⏳ Entry editing
- ⏳ List editing
- ⏳ Entry deletion
- ⏳ Sort & filter

### Phase 2: Premium Features (Future)
- Voice-to-text entry creation
- Photo attachments
- Location fields
- Unlimited lists/entries
- Advanced analytics

### Phase 3: Social & Collaboration (Future)
- User profiles
- Follow other users
- Discover public lists
- List templates marketplace
- Social sharing integrations

---

## 📊 Progress Tracking

**Overall Completion**: ~75%
- Core Features: 80%
- Premium Features: 0%
- UI Consistency: 62%
- Documentation: 40%
- Testing: 0%

---

*Last Updated: 2025-11-29*
