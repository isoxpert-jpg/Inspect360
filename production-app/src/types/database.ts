// Supabase Database Types
// These types should be regenerated using: npx supabase gen types typescript

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            inspections: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    user_id: string
                    company_name: string
                    site_name: string
                    inspector_name: string
                    inspection_date: string
                    geo_location: string | null
                    company_logo: string | null
                    scope: string[]
                    status: 'draft' | 'in_progress' | 'completed'
                    overall_score: number | null
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id: string
                    company_name: string
                    site_name: string
                    inspector_name: string
                    inspection_date: string
                    geo_location?: string | null
                    company_logo?: string | null
                    scope: string[]
                    status?: 'draft' | 'in_progress' | 'completed'
                    overall_score?: number | null
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                    company_name?: string
                    site_name?: string
                    inspector_name?: string
                    inspection_date?: string
                    geo_location?: string | null
                    company_logo?: string | null
                    scope?: string[]
                    status?: 'draft' | 'in_progress' | 'completed'
                    overall_score?: number | null
                    metadata?: Json | null
                }
            }
            rooms: {
                Row: {
                    id: string
                    created_at: string
                    inspection_id: string
                    name: string
                    department: string
                    status: 'pending' | 'analyzed'
                    evacuation_plan: string | null
                    timestamp: number
                }
                Insert: {
                    id?: string
                    created_at?: string
                    inspection_id: string
                    name: string
                    department: string
                    status?: 'pending' | 'analyzed'
                    evacuation_plan?: string | null
                    timestamp?: number
                }
                Update: {
                    id?: string
                    created_at?: string
                    inspection_id?: string
                    name?: string
                    department?: string
                    status?: 'pending' | 'analyzed'
                    evacuation_plan?: string | null
                    timestamp?: number
                }
            }
            captures: {
                Row: {
                    id: string
                    created_at: string
                    room_id: string
                    original_image_url: string
                    overlay_image_url: string | null
                    analysis: Json | null
                    error: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    room_id: string
                    original_image_url: string
                    overlay_image_url?: string | null
                    analysis?: Json | null
                    error?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    room_id?: string
                    original_image_url?: string
                    overlay_image_url?: string | null
                    analysis?: Json | null
                    error?: string | null
                }
            }
            profiles: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    organization: string | null
                    role: 'admin' | 'inspector' | 'viewer'
                }
                Insert: {
                    id: string
                    created_at?: string
                    updated_at?: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    organization?: string | null
                    role?: 'admin' | 'inspector' | 'viewer'
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    organization?: string | null
                    role?: 'admin' | 'inspector' | 'viewer'
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            inspection_status: 'draft' | 'in_progress' | 'completed'
            user_role: 'admin' | 'inspector' | 'viewer'
            room_status: 'pending' | 'analyzed'
        }
    }
}
