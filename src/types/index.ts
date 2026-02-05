// Inspection Scope Types
export type InspectionScope =
    | 'OHS'
    | 'FireSafety'
    | 'Environmental'
    | 'FoodSafety'
    | 'Security'
    | 'FacilitiesManagement';

// Standard Reference
export interface Standard {
    standardId: string;
    description: string;
}

// Remediation Item
export interface RemediationItem {
    item: string;
    quantity: string;
    reason: string;
}

// Finding Types
export type FindingType =
    | 'Good condition'
    | 'Minor issue'
    | 'Major defect'
    | 'Safety hazard'
    | 'Compliance gap';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'None';

export interface Finding {
    issue: string;
    type: FindingType;
    risk: RiskLevel;
    recommendation: string;
}

// Analysis Result from AI
export interface AnalysisResult {
    score: number;
    hazards: string[];
    zoningIssues: string;
    summary: string;
    relevantStandards: Standard[];
    missingDocuments: string[];
    recommendedItems: RemediationItem[];
    category?: string;
    detailedFindings?: Finding[];
    riskLevel?: RiskLevel;
}

// Image Capture
export interface ImageCapture {
    id: string;
    originalImage: string;
    overlayImage?: string;
    analysis?: AnalysisResult;
    error?: string;
}

// Custom Check
export interface CustomCheck {
    id: string;
    query: string;
    result: string;
    timestamp: number;
}

// Room
export interface Room {
    id: string;
    name: string;
    department: string;
    captures: ImageCapture[];
    evacuationPlan?: string;
    generatePlanRequest?: boolean;
    customChecks: CustomCheck[];
    timestamp: number;
    status: 'pending' | 'analyzed';
}

// Inspection Log
export interface InspectionLog {
    id: string;
    timestamp: number;
    action: string;
    details: string;
    type: 'info' | 'ai' | 'error' | 'success';
}

// App State
export interface AppState {
    view: 'setup' | 'dashboard' | 'staging' | 'room-detail' | 'report';
    scope: InspectionScope[];
    companyName: string;
    siteName: string;
    inspectorName: string;
    companyLogo: string | null;
    inspectionDate: string;
    geoLocation: string;
    rooms: Room[];
    activeRoomId: string | null;
    stagingImages: File[];
    stagingRoomName: string;
    stagingDepartment: string;
    stagingGeneratePlan: boolean;
    loading: boolean;
    loadingMessage: string;
    logs: InspectionLog[];
    showLogs: boolean;
}

// Scope Configuration
export interface ScopeConfig {
    label: string;
    icon: string;
    color: string;
    focus: string;
    standards: string;
    documents: string;
    hex: string;
}

// API Response Types
export interface AnalyzeImageRequest {
    image: string;
    scope: InspectionScope[];
    roomName: string;
    department: string;
}

export interface AnalyzeImageResponse {
    success: boolean;
    analysis?: AnalysisResult;
    overlayImage?: string;
    error?: string;
}

// User Profile
export interface UserProfile {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    organization: string | null;
    role: 'admin' | 'inspector' | 'viewer';
}
