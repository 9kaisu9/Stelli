# Share List Debugging

## Issue
When pasting a share token and trying to import a list, it says "List Not Found".

## Investigation Steps

### 1. Check Database Tables
The code references these tables:
- `shared_lists` - where share tokens are stored
- `list_subscriptions` - where user subscriptions to shared lists are stored

### 2. Current Flow
1. User clicks "Share List" in list detail screen
2. `ShareListModal` calls `useShareList.generateShareUrl(permissionType)`
3. This creates/gets a record in `shared_lists` table with a `share_token`
4. The token is displayed to user
5. User copies token and pastes it in "Import List" on home screen
6. App navigates to `/shared/[token]`
7. `useSharedList(token)` queries `shared_lists` table for the token
8. **THIS IS WHERE IT FAILS** - "List Not Found"

### 3. Possible Issues

#### Issue A: Table Doesn't Exist
The `shared_lists` table may not exist in Supabase.

**Solution**: Create the table with this schema:
```sql
CREATE TABLE shared_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit')),
  share_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX idx_shared_lists_token ON shared_lists(share_token);

-- RLS Policies
ALTER TABLE shared_lists ENABLE ROW LEVEL SECURITY;

-- Anyone can read shared lists by token (public sharing)
CREATE POLICY "Anyone can view shared lists"
  ON shared_lists FOR SELECT
  USING (true);

-- Only list owners can create share links
CREATE POLICY "List owners can create share links"
  ON shared_lists FOR INSERT
  WITH CHECK (
    shared_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id AND lists.user_id = auth.uid()
    )
  );

-- Only the person who created the share link can delete it
CREATE POLICY "Share creators can delete their links"
  ON shared_lists FOR DELETE
  USING (shared_by_user_id = auth.uid());
```

#### Issue B: list_subscriptions Table Doesn't Exist
The `list_subscriptions` table may not exist in Supabase.

**Solution**: Create the table with this schema:
```sql
CREATE TABLE list_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, user_id) -- User can only subscribe once per list
);

-- RLS Policies
ALTER TABLE list_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their subscriptions"
  ON list_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own subscriptions
CREATE POLICY "Users can create subscriptions"
  ON list_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete their subscriptions"
  ON list_subscriptions FOR DELETE
  USING (user_id = auth.uid());
```

#### Issue C: RLS Policies Blocking Access
The SELECT policy on `shared_lists` might be too restrictive.

**Check**: The policy should allow `SELECT` for anyone with a valid token:
```sql
-- This should work for unauthenticated users too
CREATE POLICY "Anyone can view shared lists"
  ON shared_lists FOR SELECT
  USING (true);
```

#### Issue D: Query Join Failing
The query in `useSharedList` does a complex join:
```typescript
.select(`
  *,
  lists (*),
  shared_by_profile:profiles!shared_by_user_id (display_name, id)
`)
```

The join `profiles!shared_by_user_id` might fail if:
- The `profiles` table doesn't have a record for the sharing user
- The foreign key relationship isn't properly set up

**Solution**: Make the profile join optional or check if profiles exist.

### 4. Immediate Fix

Add console logging to debug:

```typescript
// In useSharedList hook (lib/hooks/useShareList.ts line 108)
queryFn: async () => {
  console.log('🔍 Looking up share token:', shareToken);

  const { data, error } = await supabase
    .from('shared_lists')
    .select(`
      *,
      lists (*),
      shared_by_profile:profiles!shared_by_user_id (display_name, id)
    `)
    .eq('share_token', shareToken)
    .single();

  console.log('📊 Query result:', { data, error });

  if (error) {
    console.error('❌ Error fetching shared list:', error);
    throw error;
  }
  return data;
},
```

### 5. Test Procedure

1. Generate a share link
2. Copy the token (not the URL)
3. Check browser console / Expo logs for what token was generated
4. Paste token in import field
5. Check browser console / Expo logs for what token is being looked up
6. Check if they match exactly
7. Check for any errors in the query

### 6. Expected Database State

After generating a share link, you should see in Supabase:
- `shared_lists` table has a record with:
  - `list_id`: The ID of the list being shared
  - `shared_by_user_id`: Your user ID
  - `permission_type`: 'view' or 'edit'
  - `share_token`: The generated token (32 characters)
  - `created_at`: Timestamp

When you paste the token and try to import:
- Query should find the record by `share_token`
- Should join with `lists` table to get list details
- Should join with `profiles` table to get sharer's display name
