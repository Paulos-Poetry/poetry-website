# Heroku to Supabase Migration Guide

## Overview
This guide helps you seamlessly migrate your poetry website from Heroku (MongoDB) to Supabase (PostgreSQL) with side-by-side testing.

## What We've Added

### 1. Backend Switcher System
- **BackendContext**: Global state management for switching between backends
- **BackendSwitcher Component**: UI component with toggle buttons
- **API Service Layer**: Unified interface for both backends

### 2. Updated Pages
- **TranslationsLanding**: Now includes backend switcher and loading states
- **PoetryLanding**: Updated with backend switcher and error handling
- Both pages automatically refetch data when backend changes

## Setup Instructions

### Step 1: Configure Environment Variables
1. Copy `.env.example` to `.env.local` in your client folder
2. Update your Supabase credentials:

```bash
# In client/.env.local
VITE_ADDRESS=https://paulospoetry.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Set Up Supabase Database
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase-migration/schema.sql`
3. This creates all tables with proper relationships and Row Level Security

### Step 3: Export Data from MongoDB (Optional for now)
```bash
# In the root directory
cd supabase-migration
node export-data.js
```

### Step 4: Import to Supabase (When ready)
1. Update Supabase credentials in `import-to-supabase.js`
2. Run: `node import-to-supabase.js`

## How the Switcher Works

### Frontend Changes
- **Global Context**: `BackendContext` manages current backend state
- **Persistent Storage**: Remembers your choice in localStorage
- **Real-time Switching**: Pages automatically refetch when backend changes

### API Layer
- **Unified Interface**: Same function calls work for both backends
- **Type Safety**: TypeScript interfaces ensure consistency
- **Error Handling**: Clear error messages specify which backend failed

### UI Components
- **Visual Indicator**: Shows which backend is active
- **Loading States**: Clear feedback during data fetching
- **Error Messages**: Backend-specific error reporting

## Testing Process

### Phase 1: Setup Supabase (Current)
1. Configure Supabase environment variables
2. Run database schema setup
3. Test backend switcher (Supabase will show "not configured" until setup)

### Phase 2: Data Migration
1. Export current MongoDB data
2. Import to Supabase
3. Verify data integrity

### Phase 3: Side-by-Side Testing
1. Use switcher to compare both backends
2. Test all CRUD operations
3. Verify file uploads/downloads work
4. Check authentication flows

### Phase 4: Full Migration
1. Update production environment variables
2. Switch default backend to Supabase
3. Monitor for issues
4. Decommission Heroku when stable

## Key Benefits

### 1. Zero Downtime
- Both backends run simultaneously
- Instant switching between backends
- No user disruption during migration

### 2. Data Verification
- Side-by-side comparison of data
- Easy to spot migration issues
- Rollback capability if needed

### 3. Gradual Migration
- Test individual features separately
- Migrate users progressively
- Reduce migration risks

## Database Schema Changes

### MongoDB → PostgreSQL
- **Collections** → **Tables**
- **Embedded Documents** → **Normalized Tables**
- **ObjectId** → **UUID**
- **Buffer (PDFs)** → **BYTEA**

### Key Transformations
- Comments moved from embedded array to separate table
- All dates standardized to `created_at`/`updated_at`
- User roles simplified to boolean `is_admin`
- File storage moved to base64 encoding (temporarily)

## Next Steps

1. **Set up Supabase project** and configure environment variables
2. **Test the switcher** - you should see it in the Translations and Poetry pages
3. **Run database migration** when ready to populate Supabase
4. **Test all functionality** using the switcher
5. **Gradually move production traffic** to Supabase

## Troubleshooting

### Switcher Not Appearing
- Check that `BackendProvider` wraps your app
- Verify environment variables are set correctly

### Supabase Errors
- Ensure database schema is created
- Check Row Level Security policies
- Verify API keys have correct permissions

### Data Inconsistencies
- Run export script to check current data format
- Compare MongoDB and PostgreSQL data structures
- Test with small dataset first

## File Structure
```
client/
├── src/
│   ├── contexts/BackendContext.tsx
│   ├── components/BackendSwitcher.tsx
│   ├── services/apiService.ts
│   └── styles/BackendSwitcher.scss
└── .env.example
```

This setup gives you complete control over the migration process with the ability to test and verify everything before making the final switch!