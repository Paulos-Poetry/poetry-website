# Data Structure Mapping: MongoDB (Heroku) → PostgreSQL (Supabase)

## Current MongoDB Structures (from models)

### 1. Poems Collection
```typescript
// MongoDB Document
{
  _id: ObjectId,
  title: String,
  contentEnglish: String,
  contentGreek: String, 
  likes: Number (default: 0),
  comments: [
    {
      _id: ObjectId (auto-generated),
      author: String,
      text: String,
      createdAt: Date
    }
  ],
  // MongoDB automatically adds:
  __v: Number,
  createdAt: Date (from _id.getTimestamp())
}
```

### 2. Translations Collection
```typescript
// MongoDB Document
{
  _id: ObjectId,
  title: String,
  pdf: Buffer,
  contentType: String (default: true), // Note: should be string like "application/pdf"
  content: String,
  createdAt: Date,
  // MongoDB automatically adds:
  __v: Number
}
```

### 3. Users Collection
```typescript
// MongoDB Document
{
  _id: ObjectId,
  username: String,
  email: String (unique),
  password: String (hashed),
  isAdmin: Boolean (default: false),
  // MongoDB automatically adds:
  __v: Number,
  createdAt: Date (from _id.getTimestamp())
}
```

## Supabase PostgreSQL Mapping

### 1. poems Table
```sql
CREATE TABLE poems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,     -- Maps from _id
  title VARCHAR(255) NOT NULL,                       -- Direct mapping
  content_english TEXT NOT NULL,                     -- Maps from contentEnglish
  content_greek TEXT NOT NULL,                       -- Maps from contentGreek
  likes INTEGER DEFAULT 0,                           -- Direct mapping
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Maps from _id.getTimestamp()
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. comments Table (Normalized from embedded comments)
```sql
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,     -- Maps from comment._id
  poem_id UUID REFERENCES poems(id) ON DELETE CASCADE, -- Parent poem reference
  author VARCHAR(255) NOT NULL,                      -- Direct mapping
  text TEXT NOT NULL,                                 -- Direct mapping
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- Maps from comment.createdAt
);
```

### 3. translations Table
```sql
CREATE TABLE translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,     -- Maps from _id
  title VARCHAR(255) NOT NULL,                       -- Direct mapping
  pdf_data BYTEA NOT NULL,                          -- Maps from pdf (Buffer → bytea)
  content_type VARCHAR(100) DEFAULT 'application/pdf', -- Maps from contentType
  content TEXT,                                       -- Direct mapping
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Maps from createdAt
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,     -- Maps from _id
  username VARCHAR(255) NOT NULL,                    -- Direct mapping
  email VARCHAR(255) UNIQUE NOT NULL,                -- Direct mapping
  password VARCHAR(255) NOT NULL,                    -- Direct mapping
  is_admin BOOLEAN DEFAULT FALSE,                    -- Maps from isAdmin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Maps from _id.getTimestamp()
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Key Differences & Considerations

### 1. ID System
- **MongoDB**: Uses ObjectId (12-byte identifier)
- **Supabase**: Uses UUID (36-character string)
- **Migration**: Need to map old ObjectIds to new UUIDs

### 2. Embedded vs Normalized Data
- **MongoDB**: Comments embedded in poems
- **Supabase**: Comments in separate table with foreign key

### 3. Binary Data
- **MongoDB**: Buffer type for PDF storage
- **Supabase**: BYTEA type for binary data

### 4. Timestamps
- **MongoDB**: Can extract creation time from ObjectId
- **Supabase**: Explicit timestamp columns

### 5. API Response Format
MongoDB typically returns:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Sample Poem",
  "contentEnglish": "...",
  "__v": 0
}
```

Supabase should return equivalent:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000", 
  "_id": "550e8400-e29b-41d4-a716-446655440000", // For compatibility
  "title": "Sample Poem",
  "contentEnglish": "...",
  "content_english": "..." // Both naming conventions
}
```

## Migration Steps

1. **Export MongoDB data** with proper ObjectId → UUID mapping
2. **Transform embedded comments** to separate records
3. **Convert Buffer data** to base64 for transfer, then to bytea in Supabase
4. **Maintain API compatibility** by supporting both naming conventions
5. **Test thoroughly** with the data inspector tool