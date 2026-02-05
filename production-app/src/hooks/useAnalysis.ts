import { useState, useCallback } from 'react';
import type { AnalysisResult, InspectionScope } from '@/types';

interface AnalyzeOptions {
    image: string;
    scope: InspectionScope[];
    roomName: string;
    department: string;
    customPrompt?: string;
}

interface UseAnalysisState {
    loading: boolean;
    error: string | null;
    result: AnalysisResult | null;
}

export function useAnalysis() {
    const [state, setState] = useState<UseAnalysisState>({
        loading: false,
        error: null,
        result: null,
    });

    const analyze = useCallback(async (options: AnalyzeOptions) => {
        setState({ loading: true, error: null, result: null });

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            setState({
                loading: false,
                error: null,
                result: data.analysis,
            });

            // Return both analysis and overlayImage
            return {
                analysis: data.analysis,
                overlayImage: data.overlayImage || null,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Analysis failed';
            setState({ loading: false, error: message, result: null });
            return null;
        }
    }, []);

    const generateEvacuationPlan = useCallback(async (options: {
        roomName: string;
        department: string;
        scope: InspectionScope[];
        findings?: Array<{ issue: string; type: string }>;
        hazards?: string[];
    }) => {
        try {
            const response = await fetch('/api/evacuation-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.evacuationPlan;
        } catch (err) {
            console.error('Evacuation plan generation failed:', err);
            return null;
        }
    }, []);

    const reset = useCallback(() => {
        setState({ loading: false, error: null, result: null });
    }, []);

    return {
        ...state,
        analyze,
        generateEvacuationPlan,
        reset,
    };
}
