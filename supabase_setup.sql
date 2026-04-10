-- ===============================================================
-- Supabase Setup Script for Redwan AI Note
-- ===============================================================
-- This script sets up the scalable architecture for publishing notes.
-- It includes the table definition, indexes, and RLS policies.

-- 1. Create the published_notes table
CREATE TABLE IF NOT EXISTS public.published_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code TEXT UNIQUE NOT NULL, -- Human-readable code for sharing
    user_id UUID DEFAULT auth.uid(), -- Owner of the note
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    emoji TEXT DEFAULT '📄',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.published_notes ENABLE ROW LEVEL SECURITY;

-- 3. Security Policies
-- Allow anyone to read a published note (Public Read)
CREATE POLICY "Allow public read access" 
ON public.published_notes 
FOR SELECT 
USING (true);

-- Allow authenticated users to publish their own notes
CREATE POLICY "Allow authenticated insert" 
ON public.published_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow owners to update their published notes
CREATE POLICY "Allow owner update" 
ON public.published_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow owners to delete their published notes
CREATE POLICY "Allow owner delete" 
ON public.published_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Scalability Indexes
-- Index for fast lookups by short_code (used for sharing/importing)
CREATE INDEX IF NOT EXISTS idx_published_notes_short_code ON public.published_notes(short_code);
-- Index for fast lookups by user_id (used for listing user's published notes)
CREATE INDEX IF NOT EXISTS idx_published_notes_user_id ON public.published_notes(user_id);

-- 5. Function to update timestamp on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_published_notes_updated_at
    BEFORE UPDATE ON public.published_notes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
