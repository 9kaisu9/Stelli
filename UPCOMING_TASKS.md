# Upcoming Tasks - Stelli

This document outlines prioritized upcoming tasks based on the current state of the app.

**Last Updated**: 2025-12-09

---

## 🔴 HIGH PRIORITY

### 1. Delete Entry Implementation
**File**: `app/(authenticated)/list/[id].tsx:150`

**Description**: Currently shows success message but doesn't actually delete entries from database.

**Required**:
- Implement delete mutation in `useEntryActions` hook
- Connect to Supabase `entries` table
- Add proper error handling
- Update query cache after deletion

**Complexity**: Low (1-2 hours)

---

### 2. Edit List Screen
**File**: `app/(authenticated)/edit-list/[id].tsx` (doesn't exist)

**Description**: Create screen to edit existing lists (name, description, icon, rating type, custom fields).

**Required**:
- Create new route file
- Fetch existing list data
- Allow editing all list properties
- Handle field definition updates carefully (don't break existing entries)
- Update mutation with proper validation

**Complexity**: Medium (4-6 hours)

**Notes**:
- Be careful with field definition changes - may need migration logic
- Consider warning users if removing fields that have data

---

### 3. window.location.reload() Bug Fix
**File**: `app/(authenticated)/home.tsx:256`

**Description**: Using web API in React Native app - breaks functionality on error.

**Required**:
- Replace with `queryClient.invalidateQueries()`
- Test error recovery flow

**Complexity**: Trivial (5 minutes)

---

## 🟡 MEDIUM PRIORITY

### 4. Sort & Filter Implementation ✅ COMPLETE
**Files**: `app/(authenticated)/list/[id].tsx`

**Status**: ✅ Fully implemented and working

**Completed**:
- ✅ Sorting logic (date, rating, name) with multi-criteria support
- ✅ Drag-to-reorder priority for sort criteria
- ✅ Ascending/descending direction toggle
- ✅ Rating filter with 4 modes: above, below, between, unrated
- ✅ Date range filter with from/to date pickers
- ✅ Inline expansion UI for filter configuration
- ✅ Multiple filters with AND logic
- ✅ Add/remove filter functionality
- ✅ Filter logic correctly applied to entry list

**Implementation Details**:
- **Rating Filter**: 4 modes (Above/Below/Between/Unrated) with min/max range inputs
- **Date Filter**: Custom from/to date range with DateTimePicker
- **UI Pattern**: Inline expansion with chevron - tap to configure, remove button to delete
- **Filter Logic**: All active filters apply with AND logic (entry must pass all filters)
- **Default Values**: Rating defaults to full range, Date defaults to last 30 days

---

### 5. Complete Native Modal Replacement
**Files**:
- `app/shared/[token].tsx` (3 instances)
- `app/sign-up.tsx` (2 instances)
- `app/index.tsx` (4 instances)

**Description**: Replace remaining `Alert.alert` calls with `CustomActionSheet` for UI consistency.

**Complexity**: Low (1-2 hours)

---

### 6. Testing Infrastructure Setup
**Description**: Set up Jest + React Native Testing Library.

**Required**:
- Install dependencies
- Configure Jest for React Native
- Create test utilities
- Write sample tests for key components
- Add test scripts to package.json

**Complexity**: Medium (4-6 hours)

**Initial Focus**:
- Component tests (Button, TextInput, ListCard)
- Hook tests (useAuth, useShareList)
- Screen tests (critical user flows)

---

### 7. Form Validation with react-hook-form + zod
**Description**: Replace manual validation with centralized validation library.

**Required**:
- Create validation schemas in `lib/validation/`
- Update forms to use `useForm` hook
- Add proper error messages
- Improve UX with real-time validation

**Files to Update**:
- `app/(authenticated)/create-list.tsx`
- `app/(authenticated)/add-entry/[listId].tsx`
- `app/(authenticated)/profile.tsx`
- `app/sign-up.tsx`

**Complexity**: Medium (6-8 hours)

---

## 🟢 LOW PRIORITY / ENHANCEMENTS

### 8. Avatar Upload Validation
**File**: `app/(authenticated)/profile.tsx:89-145`

**Description**: Add file size validation and compression before upload.

**Required**:
- Check file size (max 5MB)
- Compress image before upload
- Show proper error messages

**Complexity**: Low (1-2 hours)

---

### 9. Display Name Length Validation
**File**: `app/(authenticated)/profile.tsx:67-68`

**Description**: Add max length validation (e.g., 50 characters).

**Complexity**: Trivial (10 minutes)

---

### 10. Share Token Format Validation
**File**: `app/(authenticated)/home.tsx:165-177`

**Description**: Validate token format before navigation.

**Required**:
- Check token length (32 characters)
- Validate format (alphanumeric)
- Show error for invalid tokens

**Complexity**: Trivial (15 minutes)

---

### 11. Remove Temporary Testing Code
**File**: `app/(authenticated)/home.tsx:79-80`

**Description**: Remove `canCreateList = true` override that bypasses subscription limits.

**Required**:
- Remove line 80
- Test subscription limits work correctly
- Or implement feature flag system

**Complexity**: Trivial (5 minutes)

**⚠️ Security Risk**: Currently allows free users to bypass limits

---

### 12. Privacy Setting Implementation
**File**: `app/(authenticated)/create-list.tsx:290`

**Description**: Public/Private toggle exists but doesn't save to database.

**Required**:
- Either implement `is_public` field in database
- Or remove the UI if not using

**Complexity**: Low (30 minutes)

---

### 13. Entry Name Field Consistency
**Files**: Multiple

**Description**: Entry name accessed inconsistently as both `field_values['1']` and `field_values.name`.

**Required**:
- Standardize on one approach (prefer `field_values['1']`)
- Or create helper function `getEntryName(entry)`
- Update all references

**Complexity**: Low (1 hour)

---

### 14. Number Input Value Validation
**File**: `components/FieldInput.tsx:60-62`

**Description**: Number inputs can store incomplete values like "5." or "-".

**Required**:
- Convert to valid number or null before storing
- Add validation on blur event

**Complexity**: Low (30 minutes)

---

### 15. Dropdown Required Field UX
**File**: `components/FieldInput.tsx:186`

**Description**: Required dropdowns can be deselected to null.

**Required**:
- Prevent deselecting required dropdowns
- Or force selection of another option

**Complexity**: Low (30 minutes)

---

## 🔮 FUTURE FEATURES (Not Immediate)

### Custom Field Sort & Filter (Post-MVP)
**Description**: Extend sort/filter system to work with custom fields.

**Sort by Custom Fields**:
- Date fields: Chronological order (asc/desc)
- Number fields: Numerical order (asc/desc)
- Text fields: Alphabetical order (asc/desc)
- Dropdown/Multi-select: By selected option
- Rating fields: By rating value (asc/desc)
- Yes/No fields: Group by true/false

**Filter by Custom Fields**:
- Date fields: Date range (from/to), before/after specific date
- Number fields: Range (min/max), greater than, less than
- Text fields: Contains text, starts with, exact match
- Dropdown/Multi-select: Equals value, includes any of values
- Rating fields: Range-based (same as main rating filter)
- Yes/No fields: Is Yes, Is No

**UI Considerations**:
- Modal needs search/grouping for 10+ field options
- Filter configuration needs to adapt to field type
- Active filters should show field name + configured range

**Complexity**: High (8-12 hours)

**Use Cases**:
- Restaurant list: Sort by "Last Visited" date field
- Movie list: Filter by "Streaming Service" dropdown
- Book list: Filter by "Genre" multi-select field

---

### Premium Features (Phase 2)
- Voice-to-text entry creation (OpenAI Whisper + GPT-4o-mini)
- Photo attachments for entries
- Location fields with map integration
- Advanced analytics dashboard

### Social Features (Phase 3)
- User profiles and following
- Discover public lists
- List templates marketplace
- Social sharing integrations

### Performance Optimizations
- List virtualization for 100+ entries
- Image lazy loading and caching
- Pagination for large lists

### Export/Import
- CSV export/import
- JSON backup/restore
- Batch operations

### Search
- Global search across all lists
- Entry search within lists
- Field-specific filters

---

## 📝 Documentation Tasks

### High Priority
- **README.md**: Project setup, environment variables, running the app
- **API Documentation**: Database schema, RLS policies, edge functions

### Medium Priority
- **Component Documentation**: Complete COMPONENTS.md with usage examples
- **Contributing Guide**: Code style, PR process, testing requirements

---

## 🎯 Recommended Next Steps

**This Week**:
1. Fix delete entry implementation (HIGH - 1 hour)
2. Fix `window.location.reload()` bug (HIGH - 5 min)
3. Create edit list screen (HIGH - 4-6 hours)

**Next Week**:
4. ✅ ~~Implement sort & filter~~ (COMPLETE)
5. Complete native modal replacement (MEDIUM - 1-2 hours)
6. Add validation improvements (LOW - 2 hours total)

**Future Sprints**:
- Set up testing infrastructure
- Implement form validation with react-hook-form
- Premium features (Phase 2)
