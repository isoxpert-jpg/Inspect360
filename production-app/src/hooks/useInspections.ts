import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Simplified types for inspections
interface Inspection {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    company_name: string;
    site_name: string;
    inspector_name: string;
    inspection_date: string;
    geo_location: string | null;
    company_logo: string | null;
    scope: string[];
    status: 'draft' | 'in_progress' | 'completed';
    overall_score: number | null;
    metadata: Record<string, unknown> | null;
}

interface InsertInspection {
    user_id: string;
    company_name: string;
    site_name: string;
    inspector_name: string;
    inspection_date: string;
    geo_location?: string | null;
    company_logo?: string | null;
    scope: string[];
    status?: 'draft' | 'in_progress' | 'completed';
    overall_score?: number | null;
    metadata?: Record<string, unknown> | null;
}

interface UpdateInspection {
    company_name?: string;
    site_name?: string;
    inspector_name?: string;
    inspection_date?: string;
    geo_location?: string | null;
    company_logo?: string | null;
    scope?: string[];
    status?: 'draft' | 'in_progress' | 'completed';
    overall_score?: number | null;
    metadata?: Record<string, unknown> | null;
}

interface UseInspectionsState {
    inspections: Inspection[];
    loading: boolean;
    error: string | null;
}

export function useInspections() {
    const [state, setState] = useState<UseInspectionsState>({
        inspections: [],
        loading: false,
        error: null,
    });

    const fetchInspections = useCallback(async (userId?: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            let query = supabase
                .from('inspections')
                .select('*')
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            setState({
                inspections: (data as Inspection[]) || [],
                loading: false,
                error: null,
            });

            return data as Inspection[];
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch inspections';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);

    const createInspection = useCallback(async (inspection: InsertInspection) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { data, error } = await supabase
                .from('inspections')
                .insert(inspection as never)
                .select()
                .single();

            if (error) throw error;

            const newInspection = data as Inspection;
            setState(prev => ({
                ...prev,
                inspections: [newInspection, ...prev.inspections],
                loading: false,
            }));

            return newInspection;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create inspection';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);

    const updateInspection = useCallback(async (id: string, updates: UpdateInspection) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { data, error } = await supabase
                .from('inspections')
                .update({ ...updates, updated_at: new Date().toISOString() } as never)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            const updatedInspection = data as Inspection;
            setState(prev => ({
                ...prev,
                inspections: prev.inspections.map(i => i.id === id ? updatedInspection : i),
                loading: false,
            }));

            return updatedInspection;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update inspection';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);

    const deleteInspection = useCallback(async (id: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { error } = await supabase
                .from('inspections')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setState(prev => ({
                ...prev,
                inspections: prev.inspections.filter(i => i.id !== id),
                loading: false,
            }));

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete inspection';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return false;
        }
    }, []);

    const getInspection = useCallback(async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('inspections')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Inspection;
        } catch (err) {
            console.error('Failed to get inspection:', err);
            return null;
        }
    }, []);

    return {
        ...state,
        fetchInspections,
        createInspection,
        updateInspection,
        deleteInspection,
        getInspection,
    };
}
