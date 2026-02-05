-- Supabase Schema for HSE Compliance Inspector
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE inspection_status AS ENUM ('draft', 'in_progress', 'completed');
CREATE TYPE user_role AS ENUM ('admin', 'inspector', 'viewer');
CREATE TYPE room_status AS ENUM ('pending', 'analyzed');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    organization TEXT,
    role user_role DEFAULT 'inspector'
);

-- Inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    site_name TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    inspection_date DATE NOT NULL,
    geo_location TEXT,
    company_logo TEXT,
    scope TEXT[] NOT NULL DEFAULT '{}',
    status inspection_status DEFAULT 'draft',
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    metadata JSONB
);

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'General',
    status room_status DEFAULT 'pending',
    evacuation_plan TEXT,
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Captures table
CREATE TABLE IF NOT EXISTS public.captures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    original_image_url TEXT NOT NULL,
    overlay_image_url TEXT,
    analysis JSONB,
    error TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_inspection_id ON public.rooms(inspection_id);
CREATE INDEX IF NOT EXISTS idx_captures_room_id ON public.captures(room_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Inspections policies
CREATE POLICY "Users can view own inspections"
    ON public.inspections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inspections"
    ON public.inspections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inspections"
    ON public.inspections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inspections"
    ON public.inspections FOR DELETE
    USING (auth.uid() = user_id);

-- Rooms policies (via inspection ownership)
CREATE POLICY "Users can view rooms of own inspections"
    ON public.rooms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE inspections.id = rooms.inspection_id
            AND inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create rooms in own inspections"
    ON public.rooms FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE inspections.id = rooms.inspection_id
            AND inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update rooms in own inspections"
    ON public.rooms FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE inspections.id = rooms.inspection_id
            AND inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete rooms in own inspections"
    ON public.rooms FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE inspections.id = rooms.inspection_id
            AND inspections.user_id = auth.uid()
        )
    );

-- Captures policies (via room/inspection ownership)
CREATE POLICY "Users can view captures of own inspections"
    ON public.captures FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rooms
            JOIN public.inspections ON inspections.id = rooms.inspection_id
            WHERE rooms.id = captures.room_id
            AND inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create captures in own inspections"
    ON public.captures FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.rooms
            JOIN public.inspections ON inspections.id = rooms.inspection_id
            WHERE rooms.id = captures.room_id
            AND inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update captures in own inspections"
    ON public.captures FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.rooms
            JOIN public.inspections ON inspections.id = rooms.inspection_id
            WHERE rooms.id = captures.room_id
            AND inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete captures in own inspections"
    ON public.captures FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.rooms
            JOIN public.inspections ON inspections.id = rooms.inspection_id
            WHERE rooms.id = captures.room_id
            AND inspections.user_id = auth.uid()
        )
    );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON public.inspections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for images (run separately in Storage settings)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-images', 'inspection-images', false);
