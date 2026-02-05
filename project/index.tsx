import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Camera, 
  Upload, 
  ChevronLeft, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Printer, 
  Shield, 
  Flame, 
  Leaf, 
  Utensils, 
  X, 
  Plus, 
  BookOpen, 
  Loader2,
  Trash2,
  Map as MapIcon, // Aliased to avoid conflict with global Map constructor
  QrCode,
  CheckSquare,
  Building,
  Layers,
  MapPin,
  Calendar,
  User,
  Briefcase,
  Check,
  Globe,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Gavel,
  Clock,
  Play,
  Lock,
  ShoppingBag,
  GripVertical,
  ImageIcon,
  RefreshCw,
  AlertCircle,
  ClipboardCheck,
  LayoutDashboard,
  ThumbsUp,
  ThumbsDown,
  Activity,
  ScrollText,
  History
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

type InspectionScope = 'OHS' | 'Fire' | 'Environmental' | 'GMP' | 'Security' | 'Facility';

interface Standard {
  standardId: string;
  description: string;
}

interface RemediationItem {
  item: string;
  quantity: string;
  reason: string;
}

interface Finding {
  issue: string;
  type: 'Good condition' | 'Minor issue' | 'Major defect' | 'Safety hazard' | 'Compliance gap';
  risk: 'Low' | 'Medium' | 'High' | 'None';
  recommendation: string;
}

interface AnalysisResult {
  score: number;
  hazards: string[]; // Kept for backward compatibility (mapped from Major/Safety findings)
  zoningIssues: string;
  summary: string;
  relevantStandards: Standard[];
  missingDocuments: string[];
  recommendedItems: RemediationItem[];
  // New fields for Facility Management
  category?: string; 
  detailedFindings?: Finding[];
  riskLevel?: 'Low' | 'Medium' | 'High';
}

interface ImageCapture {
  id: string;
  originalImage: string;
  overlayImage?: string; // Optional (not generated yet if pending)
  analysis?: AnalysisResult; // Optional (not generated yet if pending)
  error?: string; // Captures API errors
}

interface CustomCheck {
  id: string;
  query: string;
  result: string;
  timestamp: number;
}

interface Room {
  id: string;
  name: string;
  department: string;
  captures: ImageCapture[];
  evacuationPlan?: string;
  generatePlanRequest?: boolean; // User intent to generate plan later
  customChecks: CustomCheck[];
  timestamp: number;
  status: 'pending' | 'analyzed';
}

interface InspectionLog {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  type: 'info' | 'ai' | 'error' | 'success';
}

interface AppState {
  view: 'setup' | 'dashboard' | 'staging' | 'room-detail' | 'report';
  scope: InspectionScope[]; 
  
  // Session Metadata
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
  
  // Activity Log
  logs: InspectionLog[];
  showLogs: boolean;
}

// --- AI Setup ---

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SCOPE_CONFIG: Record<InspectionScope, {
  label: string;
  icon: React.ElementType;
  color: string;
  focus: string;
  standards: string;
  documents: string;
  hex: string;
}> = {
  OHS: {
    label: 'Occupational Health & Safety',
    icon: Shield,
    color: 'bg-blue-600',
    focus: 'slip/trip hazards, working at heights, electrical safety, machine guarding, PPE compliance, and clear floor markings (green safe walkways, yellow/black zebra crossings around machines).',
    standards: 'ISO 45001:2018 (OH&S Management), OSHA 1910 (General Industry), Local Factories Acts (Latest Amendments), ANSI/ASSP Z10.0',
    documents: 'Hazard Identification & Risk Assessment (HIRA), PPE Issuance Register, Machinery Inspection Checklists, Lockout/Tagout (LOTO) Logs, Safety Training Attendance Records',
    hex: '#2563eb'
  },
  Fire: {
    label: 'Fire Safety',
    icon: Flame,
    color: 'bg-red-600',
    focus: 'blocked exits, extinguisher accessibility, signage, flammable storage, and sprinkler obstruction.',
    standards: 'NFPA 101 (Life Safety Code), NFPA 10 (Portable Extinguishers), NFPA 72 (Fire Alarm Code), ISO 7010 (Safety Signs), Local Fire Codes',
    documents: 'Fire Extinguisher Inspection Tags, Fire Alarm System Test Reports, Emergency Evacuation Drill Logs, Fire Safety Plan, Hot Work Permits',
    hex: '#dc2626'
  },
  Environmental: {
    label: 'Environmental',
    icon: Leaf,
    color: 'bg-green-600',
    focus: 'chemical spills, waste segregation, secondary containment, and emission control.',
    standards: 'ISO 14001:2015 (Environmental Management), EPA 40 CFR (Hazardous Waste), Local Environmental Protection Acts',
    documents: 'Waste Disposal Manifests, Spill Prevention Control & Countermeasure (SPCC) Plan, Safety Data Sheets (SDS), Air Emissions Monitoring Logs',
    hex: '#16a34a'
  },
  GMP: {
    label: 'Food Safety (GMP/HACCP)',
    icon: Utensils,
    color: 'bg-teal-600',
    focus: 'hygiene, cross-contamination, pest control, hairnets/beard nets, jewelry, personal items on prep surfaces, sanitation, and foreign material control.',
    standards: 'FSSC 22000 v6, ISO 22000:2018, CODEX Alimentarius General Principles of Food Hygiene, FDA 21 CFR Part 110',
    documents: 'Master Cleaning Schedule, Pest Control Service Reports, Staff Health & Hygiene Records, Temperature Control Logs, Allergen Management Plan',
    hex: '#0d9488'
  },
  Security: {
    label: 'Security & Surveillance',
    icon: Lock,
    color: 'bg-purple-600',
    focus: 'blind spots, poor lighting, weak entry points, missing camera coverage, intrusion risks, perimeter integrity, and access control gaps.',
    standards: 'ISO 27001:2013 Annex A.11 (Physical Security), ANSI/ASIS PAP.1-2012 (Physical Asset Protection), CPTED Principles',
    documents: 'CCTV System Maintenance Logs, Visitor Access Control Register, Security Incident Reports, Key & Access Card Control Policy, Perimeter Security Patrol Logs',
    hex: '#9333ea'
  },
  Facility: {
    label: 'Facility Management (ISO 41001)',
    icon: ClipboardCheck,
    color: 'bg-indigo-600',
    focus: 'exterior/interior conditions, MEP visuals, fire safety, security, assets, cleanliness, contractor compliance.',
    standards: 'ISO 41001:2018 (Facility Management), ASTM E2018-15 (Property Condition Assessments), International Building Code (IBC) Chapter 10',
    documents: 'Preventive Maintenance (PM) Schedule, Asset Register & Condition Assessment, Contractor Work Permits, Cleaning Service Level Agreements (SLA), Building Inspection Reports',
    hex: '#4f46e5'
  }
};

// --- Global Styles (Print Optimization) ---

const GlobalPrintStyles = `
  @media print {
    @page {
      size: A4;
      margin: 12mm 15mm; /* Slightly tighter margins for better fit */
    }
    html, body {
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      background: white;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Layout Helpers */
    .print-break-before { page-break-before: always !important; break-before: page !important; }
    .print-break-after { page-break-after: always !important; break-after: page !important; }
    .print-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    
    /* Cover Page */
    .print-cover-page {
      min-height: 98vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
    }
    
    /* Typography Overrides for Print */
    h1 { font-size: 22pt !important; line-height: 1.2 !important; color: #0f172a !important; margin-bottom: 0.5cm !important; }
    h2 { font-size: 16pt !important; margin-bottom: 0.3cm !important; color: #1e293b !important; break-after: avoid; }
    h3 { font-size: 12pt !important; margin-bottom: 0.2cm !important; color: #334155 !important; break-after: avoid; }
    p, li, td { font-size: 9pt !important; }
    
    /* Remove Web UI clutter */
    .no-print, button, nav, input[type="text"], input[type="file"], .overlay-slider-handle, .print-hidden {
      display: none !important;
    }

    /* Clean Card Style for Print */
    .print-card-clean {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin-bottom: 0.3cm !important;
    }
    
    /* Borders for Sections */
    .print-section-border {
      border-bottom: 1px solid #e2e8f0 !important;
      padding-bottom: 0.4cm !important;
      margin-bottom: 0.4cm !important;
    }

    /* Optimized Grid for Images */
    .print-grid-2 {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 5mm !important;
      margin-bottom: 0.4cm !important;
    }
    
    .print-image-compact {
        height: 160px !important;
        width: 100%;
        object-fit: cover;
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
    }
    
    /* Professional Table Styling */
    table.print-table { 
      width: 100% !important; 
      border-collapse: collapse; 
      margin-bottom: 0.5cm !important; 
      font-size: 9pt !important;
    }
    table.print-table th { 
      border-bottom: 2px solid #334155 !important; 
      background-color: #f1f5f9 !important;
      text-align: left; 
      padding: 6px 8px !important; 
      font-weight: 700 !important; 
      color: #0f172a !important; 
      text-transform: uppercase;
    }
    table.print-table td { 
      border-bottom: 1px solid #e2e8f0 !important; 
      padding: 6px 8px !important; 
      vertical-align: top;
    }
    table.print-table tr:nth-child(even) {
      background-color: #f8fafc !important;
    }
    
    /* Specific Manifest Styling */
    .remediation-manifest {
      margin-top: 1cm;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 0;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .remediation-header {
      color: white !important;
      padding: 8px 12px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10pt;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

// --- Components ---

const ActivityLogModal = ({ logs, isOpen, onClose }: { logs: InspectionLog[], isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-fade-in">
         <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
             <div className="flex items-center gap-2 text-slate-800 font-bold">
                <History className="w-5 h-5" /> Inspection Activity Log
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X className="w-5 h-5" />
             </button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {logs.length === 0 ? (
                 <div className="text-center text-slate-400 py-10">No activity recorded yet.</div>
             ) : (
                 logs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                        <div className="mt-1">
                           {log.type === 'ai' && <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Sparkles className="w-3 h-3" /></div>}
                           {log.type === 'info' && <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><ScrollText className="w-3 h-3" /></div>}
                           {log.type === 'success' && <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check className="w-3 h-3" /></div>}
                           {log.type === 'error' && <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><AlertCircle className="w-3 h-3" /></div>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-bold text-slate-800">{log.action}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{log.details}</p>
                        </div>
                    </div>
                 ))
             )}
         </div>
         <div className="p-4 border-t border-slate-200 text-center text-xs text-slate-400">
             {logs.length} Total Events Recorded
         </div>
      </div>
    </div>
  );
};

const ImageCompareSlider = ({ original, overlay, labelOriginal = "Original", labelOverlay = "Analysis" }: { original: string, overlay: string, labelOriginal?: string, labelOverlay?: string }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleWindowMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleWindowUp = () => setIsDragging(false);
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMove);
      window.addEventListener('mouseup', handleWindowUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleWindowUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-96 rounded-xl overflow-hidden cursor-col-resize select-none shadow-sm border border-slate-200 group touch-none print:hidden"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Background: Analysis Overlay */}
      <img src={overlay} className="absolute inset-0 w-full h-full object-cover" alt="Analysis" />
      <div className="absolute top-4 right-4 bg-blue-900/80 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none z-10">
        {labelOverlay}
      </div>

      {/* Foreground: Original (Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={original} className="absolute inset-0 w-full h-full object-cover" alt="Original" />
         <div className="absolute top-4 left-4 bg-slate-900/80 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
          {labelOriginal}
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white cursor-col-resize z-20 overlay-slider-handle"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600 border border-slate-100">
           <GripVertical className="w-4 h-4" />
        </div>
      </div>
      
      {/* Interaction Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
         Drag to compare
      </div>
    </div>
  );
};

function AnalysisDisplay({ analysis, compact = false, hideItems = false }: { analysis: AnalysisResult, compact?: boolean, hideItems?: boolean }) {
  // Check if this is a Facility Inspection result (has detailedFindings)
  const isFacility = !!analysis.detailedFindings;

  return (
    <div className={`space-y-4 print:space-y-3 ${compact ? 'text-xs' : ''}`}>
      {/* Score and Category (Facility Mode) */}
      {!compact && (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 print-card-clean print-section-border">
          <div className="flex items-center gap-4">
             <div className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
               {analysis.score}/100
             </div>
             <div>
               <div className="text-sm text-slate-600">Compliance Score</div>
               {analysis.category && (
                 <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1 inline-block">
                   {analysis.category}
                 </div>
               )}
             </div>
          </div>
          {analysis.riskLevel && (
             <div className={`px-3 py-1 rounded text-xs font-bold uppercase border ${
                 analysis.riskLevel === 'High' ? 'bg-red-100 text-red-700 border-red-200' :
                 analysis.riskLevel === 'Medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                 'bg-green-100 text-green-700 border-green-200'
             }`}>
                {analysis.riskLevel} Risk
             </div>
          )}
        </div>
      )}

      {/* Hazards / Findings */}
      {isFacility ? (
        // FACILITY MODE: Detailed Findings Table
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden print-card-clean">
            <div className="bg-slate-50 p-2 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase flex items-center gap-2 print:text-black">
                <ClipboardCheck className="w-4 h-4" /> Inspection Findings
            </div>
            <div className="divide-y divide-slate-100">
               {analysis.detailedFindings?.map((finding, i) => (
                  <div key={i} className="p-3 text-sm">
                      <div className="flex justify-between items-start mb-1">
                          <span className={`font-bold ${
                             finding.type === 'Good condition' ? 'text-green-700' :
                             finding.type === 'Safety hazard' ? 'text-red-700' :
                             finding.type === 'Major defect' ? 'text-red-600' :
                             finding.type === 'Minor issue' ? 'text-orange-600' : 'text-slate-700'
                          }`}>
                             {finding.type}
                          </span>
                          {finding.risk !== 'None' && (
                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                finding.risk === 'High' ? 'bg-red-100 text-red-800' :
                                finding.risk === 'Medium' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                             }`}>{finding.risk} Risk</span>
                          )}
                      </div>
                      <div className="text-slate-800 mb-1">{finding.issue}</div>
                      {finding.recommendation && (
                         <div className="text-slate-500 text-xs italic bg-slate-50 p-1.5 rounded flex gap-1">
                            <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" /> {finding.recommendation}
                         </div>
                      )}
                  </div>
               ))}
            </div>
        </div>
      ) : (
        // STANDARD MODE: Hazards List
        analysis.hazards.length > 0 && (
          <div className={`p-4 bg-red-50 rounded-lg border border-red-100 print-card-clean ${compact ? 'p-2' : ''}`}>
            <h3 className={`font-bold text-red-900 mb-2 flex items-center gap-2 ${compact ? 'text-sm' : ''} print:text-slate-800 print:uppercase print:text-xs`}>
              <AlertTriangle className={compact ? "w-3 h-3" : "w-4 h-4"} /> Identified Risks
            </h3>
            <ul className="space-y-1 print:space-y-1">
              {analysis.hazards.map((h, i) => (
                <li key={i} className={`text-red-800 flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'} print:text-slate-700`}>
                   <span className="mt-1.5 w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0 print:bg-slate-400" />
                   <span dangerouslySetInnerHTML={{ 
                     __html: h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                   }} />
                </li>
              ))}
            </ul>
          </div>
        )
      )}
      
      {/* Recommended Items (Standard Mode) */}
      {!isFacility && analysis.recommendedItems && analysis.recommendedItems.length > 0 && !compact && !hideItems && (
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 print-no-break print-card-clean">
           <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2 print:text-slate-800 print:uppercase print:text-xs">
             <ShoppingBag className="w-4 h-4" /> Required Safety Items
           </h3>
           <div className="grid grid-cols-1 gap-2 print:hidden">
              {analysis.recommendedItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-emerald-100">
                   <div>
                     <span className="font-bold text-emerald-800">{item.item}</span>
                     <span className="text-xs text-slate-500 block">{item.reason}</span>
                   </div>
                   <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                     Qty: {item.quantity}
                   </span>
                </div>
              ))}
           </div>
           
           {/* Print Version Table */}
           <div className="hidden print:block">
              <table className="print-table">
                 <thead>
                    <tr>
                       <th>Item / Equipment</th>
                       <th>Qty</th>
                       <th>Reason</th>
                    </tr>
                 </thead>
                 <tbody>
                    {analysis.recommendedItems.map((item, i) => (
                       <tr key={i}>
                          <td className="font-bold">{item.item}</td>
                          <td className="whitespace-nowrap">{item.quantity}</td>
                          <td className="italic text-slate-600">{item.reason}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Standards */}
      {analysis.relevantStandards && analysis.relevantStandards.length > 0 && (
        <div className={`p-4 bg-blue-50 rounded-lg border border-blue-100 print-no-break print-card-clean ${compact ? 'p-2' : ''}`}>
          <h3 className={`font-bold text-blue-900 mb-3 flex items-center gap-2 ${compact ? 'text-sm' : ''} print:text-slate-800 print:uppercase print:text-xs`}>
            <Gavel className={compact ? "w-3 h-3" : "w-4 h-4"} /> Applicable Law & Standards
          </h3>
          <ul className="space-y-2 print:space-y-1">
            {analysis.relevantStandards.map((s, i) => (
              <li key={i} className="text-sm bg-white p-2 rounded border border-blue-100 shadow-sm flex flex-col gap-1 print:border-none print:shadow-none print:bg-transparent print:p-0 print:mb-1">
                <div className="font-bold text-blue-800 font-mono text-xs flex items-center gap-2 print:text-slate-800 print:text-[9pt]">
                   {s.standardId.toLowerCase().includes('local') ? (
                     <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase tracking-wider print:border print:border-slate-400 print:bg-white print:text-slate-600">Local Law</span>
                   ) : (
                     <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase tracking-wider print:border print:border-slate-400 print:bg-white print:text-slate-600">Intl. Std</span>
                   )}
                   {s.standardId.replace(/\[.*?\]/g, '').trim()}
                </div>
                <div className="text-slate-700 leading-snug print:pl-0">{s.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
       {/* Missing Documentation */}
      {analysis.missingDocuments && analysis.missingDocuments.length > 0 && (
        <div className={`p-4 bg-amber-50 rounded-lg border border-amber-100 print-card-clean ${compact ? 'p-2' : ''}`}>
          <h3 className={`font-bold text-amber-900 mb-2 flex items-center gap-2 ${compact ? 'text-sm' : ''} print:text-slate-800 print:uppercase print:text-xs`}>
            <FileText className={compact ? "w-3 h-3" : "w-4 h-4"} /> Audit Documentation Gaps
          </h3>
          <ul className="list-disc pl-5 space-y-1 print:pl-4">
             {analysis.missingDocuments.map((doc, i) => (
               <li key={i} className={`text-amber-800 ${compact ? 'text-xs' : 'text-sm'} print:text-slate-700`}>{doc}</li>
             ))}
          </ul>
        </div>
      )}
      
      {!compact && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 print-card-clean print-no-break">
          <h3 className="font-bold text-slate-800 mb-1 print:uppercase print:text-xs">Assessment Summary</h3>
          <p className="text-sm text-slate-600 italic">
            "{analysis.summary}"
          </p>
        </div>
      )}
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-600';
}

function QrHeader({ title, subTitle, siteName, companyName, inspectorName, date, logo, themeColor }: { title: string, subTitle: string, siteName: string, companyName: string, inspectorName: string, date: string, logo?: string | null, themeColor?: string }) {
  // Use the specific production URL provided by the user
  const baseUrl = "https://compliance-inspector-241067531206.us-west1.run.app/";
  
  // Construct a functional URL that includes context
  const qrPayload = `${baseUrl}?report=${encodeURIComponent(title)}&site=${encodeURIComponent(siteName)}&date=${encodeURIComponent(date)}`;
  
  // Larger size for better scanning reliability when printed
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;
  
  const primaryColor = themeColor || '#0f172a'; // Default slate-900
  
  // Check if we are in Facility mode to change the App Title
  const isFacility = subTitle.includes('Facility');
  const appTitle = isFacility ? "Inspect360Pro: Facility Visual Inspection" : "Compliance Inspector";

  return (
    <div className="border-b-2 pb-4 mb-6 print:mb-8" style={{ borderColor: primaryColor }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {logo ? (
            <img src={logo} alt="Company Logo" className="h-16 w-auto object-contain max-w-[120px] print:block" />
          ) : (
            <div className="w-16 h-16 rounded flex items-center justify-center text-white print:hidden" style={{ backgroundColor: primaryColor }}>
               {isFacility ? <ClipboardCheck className="w-10 h-10" /> : <Shield className="w-10 h-10" />}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight print:text-2xl" style={{ color: primaryColor }}>{appTitle}</h1>
            <div className="text-lg font-bold text-slate-800 print:text-black">{companyName}</div>
            <div className="text-sm text-slate-500 font-medium print:text-slate-600">{siteName}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <img src={qrUrl} alt="Scan for Digital Report" className="w-24 h-24 border border-slate-200 p-1 block print:border-black" />
          <span className="text-[10px] text-slate-500 font-mono text-right w-24 leading-tight print:text-black">Scan for<br/>Digital Report</span>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-4 gap-4 text-xs text-slate-600 font-mono border-t border-slate-200 pt-2 print:border-slate-400 print:text-black">
         <div>
            <span className="text-slate-400 block uppercase text-[10px] print:text-slate-600">Inspector</span>
            <span className="font-bold">{inspectorName}</span>
         </div>
         <div>
            <span className="text-slate-400 block uppercase text-[10px] print:text-slate-600">Date</span>
            <span className="font-bold">{date}</span>
         </div>
         <div>
            <span className="text-slate-400 block uppercase text-[10px] print:text-slate-600">Scope</span>
            <span className="font-bold">{subTitle}</span>
         </div>
         <div className="text-right">
            <span className="text-slate-400 block uppercase text-[10px] print:text-slate-600">Ref</span>
            <span className="font-bold">{title}</span>
         </div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function ComplianceInspectorApp() {
  const [state, setState] = useState<AppState>({
    view: 'setup',
    scope: ['OHS'],
    companyName: '',
    siteName: '',
    inspectorName: '',
    companyLogo: null,
    inspectionDate: new Date().toLocaleDateString(),
    geoLocation: '',
    rooms: [],
    activeRoomId: null,
    stagingImages: [],
    stagingRoomName: '',
    stagingDepartment: '',
    stagingGeneratePlan: false,
    loading: false,
    loadingMessage: '',
    logs: [],
    showLogs: false
  });
  
  // Helper to log activities
  const addLog = (action: string, details: string = '', type: InspectionLog['type'] = 'info') => {
    setState(s => ({
        ...s,
        logs: [{
            id: Date.now().toString() + Math.random().toString(),
            timestamp: Date.now(),
            action,
            details,
            type
        }, ...s.logs]
    }));
  };

  const [customQuery, setCustomQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect GeoLocation on Mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setState(s => ({ ...s, geoLocation: 'Detecting...' }));
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
          setState(s => ({ ...s, geoLocation: loc }));
          // Note: can't access addLog directly here due to closure, but we are setting state
        },
        (error) => {
          console.error("GeoLocation Error:", error.message);
          setState(s => ({ ...s, geoLocation: s.geoLocation === 'Detecting...' ? '' : s.geoLocation }));
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.warn("Geolocation not supported by this browser.");
      setState(s => ({ ...s, geoLocation: '' }));
    }
  };

  const setView = (view: AppState['view']) => {
    setState(s => {
      // Log report generation specifically
      let newLogs = s.logs;
      if (view === 'report') {
         newLogs = [{
            id: Date.now().toString(),
            timestamp: Date.now(),
            action: 'Report Generated',
            details: `Viewing report for ${s.rooms.length} areas. Scope: ${s.scope.join(', ')}`,
            type: 'info'
         }, ...s.logs];
      }
      return { ...s, view, logs: newLogs };
    });
  };
  
  const toggleScope = (scope: InspectionScope) => {
    setState(s => {
      const isSelected = s.scope.includes(scope);
      let newScope = s.scope;
      if (isSelected) {
        newScope = s.scope.filter(item => item !== scope);
      } else {
        if (s.scope.length >= 2) return s; // Limit to 2 scopes
        newScope = [...s.scope, scope];
      }
      return { ...s, scope: newScope };
    });
  };

  const handleStartSession = () => {
    if (!state.siteName || !state.companyName || !state.inspectorName) {
      alert("Please fill in Company, Facility, and Inspector names to start.");
      return;
    }
    if (state.scope.length === 0) {
      alert("Please select at least one inspection scope.");
      return;
    }
    addLog('Session Initialized', `Inspector: ${state.inspectorName}, Site: ${state.siteName}, Scope: ${state.scope.join(', ')}`);
    setView('dashboard');
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setState(s => ({ ...s, companyLogo: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setState(s => ({
        ...s,
        view: 'staging',
        stagingImages: [...s.stagingImages, ...newFiles],
        stagingRoomName: s.stagingRoomName || `Area ${s.rooms.length + 1}`
      }));
    }
  };

  const handleSaveStaging = async () => {
    if (state.stagingImages.length === 0) return;

    setState(s => ({ ...s, loading: true, loadingMessage: 'Saving area to inspection queue...' }));

    try {
      const captures: ImageCapture[] = [];
      for (let i = 0; i < state.stagingImages.length; i++) {
        const file = state.stagingImages[i];
        const base64Data = await fileToBase64(file);
        captures.push({
          id: Date.now() + '-' + i,
          originalImage: `data:${file.type};base64,${base64Data}`,
        });
      }

      const newRoom: Room = {
        id: Date.now().toString(),
        name: state.stagingRoomName,
        department: state.stagingDepartment || 'General',
        captures: captures,
        generatePlanRequest: state.stagingGeneratePlan, 
        customChecks: [],
        timestamp: Date.now(),
        status: 'pending' 
      };

      addLog('Area Added', `Added "${newRoom.name}" with ${captures.length} images. Plan Requested: ${state.stagingGeneratePlan}`, 'info');

      setState(s => ({
        ...s,
        rooms: [...s.rooms, newRoom],
        stagingImages: [],
        stagingRoomName: '',
        stagingDepartment: '',
        stagingGeneratePlan: false,
        view: 'dashboard',
        loading: false
      }));

    } catch (error) {
      console.error(error);
      alert('Failed to save area.');
      setState(s => ({ ...s, loading: false }));
    }
  };

  const analyzeRoom = async (room: Room): Promise<Room> => {
     let evacuationPlanUri = room.evacuationPlan;

     addLog('AI Analysis Started', `Analyzing room: "${room.name}" (${room.captures.length} viewpoints). Model: gemini-2.5-flash`, 'ai');

     // Generate Evacuation Plan if requested and not already present
     if (room.generatePlanRequest && !evacuationPlanUri && room.captures.length > 0) {
        const base64Full = room.captures[0].originalImage;
        const base64Data = base64Full.split(',')[1];
        try {
          addLog('Plan Generation Started', `Generating evacuation plan for ${room.name}...`, 'ai');
          evacuationPlanUri = await generateEvacuationPlan(base64Data);
        } catch (e) {
          console.error("Plan generation failed", e);
          addLog('Plan Generation Failed', `Error generating plan for ${room.name}`, 'error');
        }
     }

     const updatedCaptures = await Promise.all(room.captures.map(async (capture) => {
        if (capture.analysis) return capture;

        try {
            const base64Data = capture.originalImage.split(',')[1];
            
            const [textAnalysis, overlayImage] = await Promise.all([
              performTextAnalysis(base64Data, state.scope, state.geoLocation),
              generateOverlay(base64Data, state.scope)
            ]);

            return {
                ...capture,
                analysis: textAnalysis,
                overlayImage: overlayImage,
                error: undefined
            };
        } catch (e: any) {
            console.error(`Analysis failed for capture ${capture.id}`, e);
            let errorMessage = "AI Analysis failed. Please try again.";
            if (e.message) {
              if (e.message.includes('429')) errorMessage = "Service is busy (Rate Limit Exceeded). Please retry in a moment.";
              else if (e.message.includes('503') || e.message.includes('500')) errorMessage = "AI Service temporarily unavailable. Please retry.";
              else if (e.message.includes('Safety')) errorMessage = "Image flagged by safety filters. Unable to process.";
              else errorMessage = `Analysis Error: ${e.message}`;
            }

            return {
                ...capture,
                error: errorMessage
            };
        }
     }));

     const failureCount = updatedCaptures.filter(c => c.error).length;
     if (failureCount > 0) {
        addLog('AI Analysis Complete (With Errors)', `${failureCount}/${updatedCaptures.length} images failed to analyze in ${room.name}.`, 'error');
     } else {
        addLog('AI Analysis Successful', `Successfully analyzed ${room.name}.`, 'success');
     }

     return {
         ...room,
         captures: updatedCaptures,
         evacuationPlan: evacuationPlanUri,
         status: 'analyzed'
     };
  };

  const handleBatchAnalyze = async () => {
    const pendingRooms = state.rooms.filter(r => r.status === 'pending' || r.captures.some(c => c.error));
    if (pendingRooms.length === 0) return;

    addLog('Batch Analysis Initiated', `Queued ${pendingRooms.length} rooms for batch processing.`, 'info');
    setState(s => ({ ...s, loading: true, loadingMessage: `Optimizing workflow: Analyzing ${pendingRooms.length} area(s) simultaneously...` }));

    try {
        const analyzedResults = await Promise.all(pendingRooms.map(room => analyzeRoom(room)));
        const updatedRooms = state.rooms.map(r => {
            const analyzed = analyzedResults.find(ar => ar.id === r.id);
            return analyzed || r;
        });

        setState(s => ({ 
            ...s, 
            rooms: updatedRooms, 
            loading: false,
            loadingMessage: ''
        }));

    } catch (e) {
        console.error(e);
        addLog('Batch Analysis Failed', 'An unexpected error occurred during batch processing.', 'error');
        alert("Batch analysis interrupted. Please try again.");
        setState(s => ({ ...s, loading: false }));
    }
  };

  const handleGeneratePlanForRoom = async (roomId: string) => {
    const room = state.rooms.find(r => r.id === roomId);
    if (!room || room.captures.length === 0) return;

    setState(s => ({ ...s, loading: true, loadingMessage: 'Generating AI Evacuation Plan...' }));
    addLog('Manual Plan Generation', `User requested plan generation for ${room.name}`, 'ai');

    try {
      const base64 = room.captures[0].originalImage.split(',')[1];
      const planUri = await generateEvacuationPlan(base64);

      setState(s => ({
        ...s,
        rooms: s.rooms.map(r => r.id === roomId ? { ...r, evacuationPlan: planUri } : r),
        loading: false
      }));
      addLog('Plan Generation Successful', `Plan created for ${room.name}`, 'success');
    } catch (e) {
      console.error(e);
      addLog('Plan Generation Failed', `Failed to generate plan for ${room.name}`, 'error');
      setState(s => ({ ...s, loading: false }));
      alert("Failed to generate plan");
    }
  };

  // ... (performCustomAnalysis, fileToBase64, performTextAnalysis, generateOverlay, generateEvacuationPlan helpers remain same) ...
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const performTextAnalysis = async (base64Image: string, scopes: InspectionScope[], location: string): Promise<AnalysisResult> => {
    const selectedConfigs = scopes.map(s => SCOPE_CONFIG[s]);
    const labels = selectedConfigs.map(c => c.label).join(', ');
    const focuses = selectedConfigs.map(c => c.focus).join('; ');
    const standards = selectedConfigs.map(c => c.standards).join('; ');
    const expectedDocs = selectedConfigs.map(c => c.documents).join('; ');

    const isFacilityScope = scopes.includes('Facility');

    const locContext = location && location !== 'Fetching...' && location !== 'Detecting...' 
      ? `The inspection is taking place at specific location: "${location}". You MUST infer the country/region and apply the specific local laws/codes relevant to this jurisdiction for each scope.`
      : `The inspection location is generic/unknown. Apply International Best Practices (ISO/NFPA).`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Compliance score 0-100" },
        hazards: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of hazards (Summary)." },
        zoningIssues: { type: Type.STRING, description: "Analysis of markings." },
        summary: { type: Type.STRING, description: "Executive summary." },
        relevantStandards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              standardId: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        },
        missingDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendedItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING },
              quantity: { type: Type.STRING },
              reason: { type: Type.STRING }
            }
          }
        },
        category: { type: Type.STRING, description: "One of the 9 specific facility categories if applicable." },
        riskLevel: { type: Type.STRING, description: "Overall risk level for this image: Low, Medium, or High." },
        detailedFindings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
               issue: { type: Type.STRING },
               type: { type: Type.STRING, description: "Good condition, Minor issue, Major defect, Safety hazard, or Compliance gap" },
               risk: { type: Type.STRING, description: "Low, Medium, High, or None" },
               recommendation: { type: Type.STRING, description: "Preventive/Corrective/Improvement action" }
            }
          }
        }
      },
      required: ["score", "hazards", "zoningIssues", "summary", "relevantStandards", "missingDocuments", "recommendedItems"]
    };

    let prompt = `
      Context: ${locContext}
      Task: Analyze ONLY for the following compliance scopes: ${labels}. 
      CRITICAL: STRICTLY IGNORE any issues, hazards, or non-compliance that falls outside of these selected scopes.
      
      1. JURISDICTION & SCOPE MAPPING: 
      Based on the location "${location}", apply specific Local Legislation and International Standards:
      ${standards}

      2. COMBINED ANALYSIS:
      - Focus ONLY on: ${focuses}. 
    `;

    if (isFacilityScope) {
        prompt += `
        SPECIFIC INSTRUCTIONS FOR ISO 41001 FACILITY INSPECTION:
        A. CLASSIFY the image into EXACTLY ONE of these 9 categories:
           1. Exterior Facility (Walls, façade, roof, boundary, parking)
           2. Interior Facility (Floors, ceilings, walls, doors, stairs)
           3. MEP Systems (Visual Only - Electrical, HVAC, Plumbing)
           4. Fire & Life Safety (Extinguishers, exits, sprinklers)
           5. Facility Security (CCTV, access, boundary)
           6. Environmental & Sustainability (Waste, chemicals, leaks)
           7. Asset Condition (Equipment, labels, racking)
           8. Cleanliness & Housekeeping (Clutter, spills, pest)
           9. Contractor Compliance (PPE, barricading, tools)

        B. IDENTIFY FINDINGS for 'detailedFindings':
           - For each observation, determine the Type: 'Good condition', 'Minor issue', 'Major defect', 'Safety hazard', or 'Compliance gap'.
           - Assign a Risk Level: 'Low', 'Medium', 'High', or 'None'.
           - Provide a Recommendation (Preventive, Corrective, or Improvement).
        
        C. SCORE:
           - Provide an overall score (0-100) for this image based on the findings.
        `;
    } else {
        prompt += `
        - Compare visual evidence against these SPECIFIC inferred local laws.
        - For OHS, prioritize trip hazards, guards, and markings.
        `;
    }

    prompt += `
      3. REMEDIATION ITEMS (BILL OF MATERIALS):
      - Identify physical items needed to fix these hazards.

      4. REPORTING (STANDARDS & DOCUMENTS):
      - In 'relevantStandards', list specific laws found.
      - In 'missingDocuments', infer required compliance documents from this reference list: [${expectedDocs}]. 
      - ONLY list documents that are likely missing or required based on the visual evidence detected (e.g. if a machine is unguarded, flag 'Risk Assessment' and 'Maintenance Logs'). Do not list all.
    `;

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] },
        config: { responseMimeType: 'application/json', responseSchema: responseSchema }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI model.");
      return JSON.parse(text);
    } catch (error: any) {
      console.error("Text Analysis Error:", error);
      throw error; 
    }
  };

  const performCustomAnalysis = async (images: string[], query: string, location: string): Promise<string> => {
     // ... (Existing custom analysis impl) ...
     const imageParts = images.map(img => ({
      inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] }
    }));
  
    const prompt = `
      Context: Inspection at ${location}.
      Task: Analyze the provided images of this room/area specifically against the following standard/requirement: "${query}".
      
      Provide a concise but professional assessment report including:
      1. Compliance Verdict (Compliant / Non-Compliant / Needs Review)
      2. Specific Observations related specifically to "${query}" based on visual evidence.
      3. Citation of likely applicable clauses of the requested standard (if known) or general best practices.
      4. Recommended Remediation steps if applicable.
      
      Format the output in clean Markdown.
    `;
  
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: prompt }] }
      });
      return response.text || "No response generated.";
    } catch (error) {
       console.error("Custom Analysis Error:", error);
       throw new Error("Failed to consult AI consultant.");
    }
  };

  const generateOverlay = async (base64Image: string, scopes: InspectionScope[]): Promise<string> => {
     // ... (Existing overlay impl) ...
    const selectedConfigs = scopes.map(s => SCOPE_CONFIG[s]);
    const labels = selectedConfigs.map(c => c.label).join(' and ');
    
    let examples = "'HAZARD'";
    if (scopes.includes('OHS')) examples += ", 'TRIP HAZARD', 'MISSING GUARD', 'SAFE WALKWAY'";
    if (scopes.includes('Fire')) examples += ", 'BLOCKED EXIT', 'FIRE RISK', 'EXTINGUISHER'";
    if (scopes.includes('Security')) examples += ", 'BLIND SPOT', 'WEAK ENTRY', 'NO CCTV'";
    if (scopes.includes('Facility')) examples += ", 'CRACK', 'LEAK', 'DAMAGED ASSET', 'CLUTTER'";
    
    const prompt = `
      Redraw the image with safety/inspection overlays ONLY for ${labels}.
      
      1. DETECT HAZARDS (RED Bounding Boxes & Text):
         - Identify hazards relevant to ${labels}.
         ${scopes.includes('OHS') ? `
         - CRITICAL OHS TASK: Detect TRIP HAZARDS. Label as 'TRIP HAZARD'.
         - CRITICAL OHS TASK: Detect UNGUARDED MACHINERY. Label as 'NO GUARD'.
         - CRITICAL OHS TASK: If industrial machines LACK yellow/black safety zoning, DRAW VIRTUAL YELLOW/BLACK DIAGONAL STRIPES on the floor surrounding the machine.` : ""}
         ${scopes.includes('Facility') ? `
         - Detect visual defects (cracks, stains, leaks, clutter). Label clearly (e.g., 'WALL CRACK', 'WATER LEAK').` : ""}
         - Label all hazards clearly (e.g., ${examples}).

      2. DETECT POSITIVE COMPLIANCE (GREEN Bounding Boxes & Text):
         - Label as 'COMPLIANT' or 'GOOD CONDITION'.

      3. VISUAL QUALITY:
         - Ensure text is UPPERCASE, LEGIBLE, and SPELLED CORRECTLY.
    `;
    
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    } catch (e) {
      console.warn("Overlay generation failed, returning original.", e);
    }
    return `data:image/jpeg;base64,${base64Image}`;
  };

  const generateEvacuationPlan = async (base64Image: string): Promise<string> => {
    // ... (Existing plan impl) ...
    const prompt = `
      Create a professional evacuation plan floor map based on this image.
      1. Draw a clear white floor plan with black walls.
      2. ADD FLOOR MARKINGS: Draw distinct Green pathways/arrows on the floor indicating the safe exit route.
      3. Mark 'EMERGENCY EXIT' locations with standard Green/White exit signs.
      4. Add Red icons for Fire Extinguishers if relevant to the location.
      5. Title the top 'EVACUATION PLAN'.
      6. CRITICAL: Ensure the title and 'EXIT' signs are SPELLED CORRECTLY and are crisp/legible.
    `;
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    } catch (e) {
      console.warn("Evacuation plan generation failed.", e);
    }
    return `data:image/jpeg;base64,${base64Image}`;
  };

  // ... (Views) ...

  if (state.loading) {
     // ...
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <style>{GlobalPrintStyles}</style>
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Processing Audit...</h2>
        <p className="text-slate-500 mt-2">{state.loadingMessage}</p>
      </div>
    );
  }

  // Setup View
  if (state.view === 'setup') {
     // ... (Setup view logic unchanged) ...
    const isReady = state.companyName && state.siteName && state.inspectorName && state.scope.length > 0;
    
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-6 font-sans">
        <style>{GlobalPrintStyles}</style>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
           {/* ... Branding Panel ... */}
           <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
             {/* ... */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="bg-white/10 backdrop-blur p-2 rounded-lg border border-white/20">
                      <Shield className="w-8 h-8 text-blue-300" />
                   </div>
                   <span className="font-bold tracking-widest text-sm text-blue-200 uppercase">ComplianceGuard AI</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
                  Intelligent <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">Audit & Safety</span> <br/>
                  Compliance.
                </h1>
                
                <p className="text-blue-200 text-lg leading-relaxed mb-8 max-w-md">
                   Transform your inspection workflow with real-time AI hazard detection, automated regulatory mapping, and instant reporting.
                </p>
             </div>
             
             <div className="mt-12 text-xs text-blue-400/60 font-mono">
                v2.6.0 • Powered by Gemini 2.5 Flash
             </div>
          </div>

          <div className="lg:col-span-7 p-8 md:p-12 bg-white flex flex-col justify-center">
             {/* ... Setup Form ... */}
             <div className="max-w-xl mx-auto w-full">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Start Inspection Session</h2>
                <p className="text-slate-500 mb-8">Enter session details to configure the AI context.</p>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                           <div className="relative">
                              <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <input 
                                type="text" 
                                className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. Acme Industries"
                                value={state.companyName}
                                onChange={(e) => setState(s => ({ ...s, companyName: e.target.value }))}
                              />
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-slate-500 uppercase">Facility / Site</label>
                           <div className="relative">
                              <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <input 
                                type="text" 
                                className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. Warehouse B"
                                value={state.siteName}
                                onChange={(e) => setState(s => ({ ...s, siteName: e.target.value }))}
                              />
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-slate-500 uppercase">Inspector</label>
                           <div className="relative">
                              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <input 
                                type="text" 
                                className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Full Name"
                                value={state.inspectorName}
                                onChange={(e) => setState(s => ({ ...s, inspectorName: e.target.value }))}
                              />
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-slate-500 uppercase">Geo-Location</label>
                           <div className="flex gap-2">
                              <input 
                                type="text" 
                                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="City/Region"
                                value={state.geoLocation}
                                onChange={(e) => setState(s => ({ ...s, geoLocation: e.target.value }))}
                              />
                              <button 
                                onClick={detectLocation}
                                className="px-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                              >
                                 <MapPin className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase">Company Logo (Optional)</label>
                       <div className="flex items-center gap-4">
                           <button 
                             onClick={() => logoInputRef.current?.click()}
                             className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium"
                           >
                              <ImageIcon className="w-4 h-4" /> Upload Logo
                           </button>
                           <input 
                              type="file" 
                              ref={logoInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleLogoSelect} 
                           />
                           {state.companyLogo && (
                              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-100 text-xs font-bold">
                                 <Check className="w-3 h-3" /> Logo Uploaded
                              </div>
                           )}
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                             <label className="text-xs font-bold text-slate-500 uppercase">Select Inspection Scopes</label>
                             <span className={`text-xs font-bold ${state.scope.length >= 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                                {state.scope.length}/2 Selected
                             </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(Object.keys(SCOPE_CONFIG) as InspectionScope[]).map((scopeKey) => {
                            const conf = SCOPE_CONFIG[scopeKey];
                            const Icon = conf.icon;
                            const isSelected = state.scope.includes(scopeKey);
                            const isDisabled = !isSelected && state.scope.length >= 2;
                            
                            return (
                              <button 
                                key={scopeKey} 
                                onClick={() => toggleScope(scopeKey)} 
                                disabled={isDisabled}
                                className={`
                                  relative p-3 rounded-xl border transition-all text-left flex items-start gap-3 group
                                  ${isSelected 
                                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm' 
                                    : isDisabled 
                                        ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                  }
                                `}
                              >
                                <div className={`
                                  p-2 rounded-lg transition-colors shrink-0
                                  ${isSelected ? conf.color + ' text-white' : isDisabled ? 'bg-slate-100 text-slate-300' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}
                                `}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className={`font-bold text-sm ${isSelected ? 'text-blue-900' : isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>{conf.label}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{conf.standards.split(',')[0]}</div>
                                </div>
                                {isSelected && (
                                  <div className="absolute top-3 right-3">
                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                    </div>

                    <button 
                      onClick={handleStartSession}
                      disabled={!isReady}
                      className={`
                        w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all mt-6
                        ${isReady 
                          ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-xl shadow-blue-900/20 hover:shadow-2xl transform hover:-translate-y-0.5' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }
                      `}
                    >
                      Initialize Inspection <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Staging View
  if (state.view === 'staging') {
     // ... (Staging logic logic unchanged) ...
    return (
      <div className="min-h-screen bg-slate-50 p-6">
         <style>{GlobalPrintStyles}</style>
         <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 p-4 mb-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <button onClick={() => setState(s => ({ ...s, view: 'dashboard', stagingImages: [] }))} className="flex items-center gap-2 text-slate-600 font-medium hover:text-blue-900">
                  <ChevronLeft className="w-5 h-5" /> Cancel Upload
              </button>
              <div className="text-sm font-bold text-blue-900">{state.siteName}</div>
            </div>
         </nav>
         
         <div className="max-w-3xl mx-auto">
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-blue-900">Add New Space</h2>
                    <p className="text-slate-500 text-sm">Upload images to analyze hazards</p>
                 </div>
                 <div className="flex gap-2">
                    {state.scope.map(s => (
                       <div key={s} className={`text-xs px-2 py-1 rounded font-bold border ${s === 'Fire' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-blue-50 text-blue-800 border-blue-100'}`}>
                          {SCOPE_CONFIG[s].label}
                       </div>
                    ))}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Department / Section
                    </label>
                    <input 
                      type="text" 
                      value={state.stagingDepartment}
                      onChange={(e) => setState(s => ({ ...s, stagingDepartment: e.target.value }))}
                      className="w-full p-3 border border-slate-300 rounded-lg"
                      placeholder="e.g. Production Floor, Warehouse..."
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Building className="w-4 h-4" /> Room / Area Name
                    </label>
                    <input 
                      type="text" 
                      value={state.stagingRoomName}
                      onChange={(e) => setState(s => ({ ...s, stagingRoomName: e.target.value }))}
                      className="w-full p-3 border border-slate-300 rounded-lg"
                      placeholder="e.g. Line 4, Mixing Area, Office 201..."
                    />
                 </div>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                 <input 
                   type="checkbox" 
                   id="genPlan"
                   checked={state.stagingGeneratePlan}
                   onChange={(e) => setState(s => ({ ...s, stagingGeneratePlan: e.target.checked }))}
                   className="mt-1 w-5 h-5 text-blue-600 rounded"
                 />
                 <label htmlFor="genPlan" className="cursor-pointer">
                   <div className="font-bold text-blue-900 flex items-center gap-2">
                      <MapIcon className="w-4 h-4" /> AI Evacuation Plan
                   </div>
                   <div className="text-sm text-blue-800">
                     Automatically generate a schematic evacuation plan based on the first image uploaded.
                   </div>
                 </label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {state.stagingImages.map((file, idx) => (
                  <div key={idx} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-80" />
                    <button 
                      onClick={() => setState(s => ({ ...s, stagingImages: s.stagingImages.filter((_, i) => i !== idx) }))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {idx === 0 && state.stagingGeneratePlan && (
                      <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        REF
                      </div>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="aspect-square bg-blue-50 rounded-lg border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-xs font-bold">Take Photo</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <Upload className="w-8 h-8 mb-1" />
                  <span className="text-xs">Upload</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="text-sm text-slate-500 italic">
                   Images will be queued for batch analysis.
                </div>
                <button 
                  onClick={handleSaveStaging}
                  disabled={state.stagingImages.length === 0 || !state.stagingRoomName}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                >
                  <CheckSquare className="w-5 h-5" /> Save to Queue
                </button>
              </div>
           </div>
           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageSelect} />
           <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageSelect} />
         </div>
      </div>
    );
  }

  // Room Detail View
  if (state.view === 'room-detail') {
    const room = state.rooms.find(r => r.id === state.activeRoomId);
    if (!room) return null;

    const isPending = room.status === 'pending';
    const hasErrors = room.captures.some(c => c.error);
    const primaryColor = SCOPE_CONFIG[state.scope[0]].hex;
    const isFacilityOrOHS = state.scope.includes('Facility') || state.scope.includes('OHS') || state.scope.includes('Fire');

    return (
      <div className="min-h-screen bg-slate-50 print:bg-white">
        <style>{GlobalPrintStyles}</style>
        <nav className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 print:hidden">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
             <button onClick={() => setState(s => ({ ...s, view: 'dashboard' }))} className="flex items-center gap-2 text-slate-600 font-medium hover:text-blue-900">
               <ChevronLeft className="w-5 h-5" /> Back to Dashboard
             </button>
             <div className="text-center">
                <h1 className="font-bold text-lg text-blue-900">{room.name}</h1>
                <p className="text-xs text-slate-500">{room.department}</p>
             </div>
             <div className="flex gap-2">
                {!isPending && !hasErrors && (
                  <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
                    <Printer className="w-4 h-4" /> Print Room Report
                  </button>
                )}
             </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto p-6 space-y-8 print:p-0 print:m-0 print:w-full print:max-w-none print:space-y-2">
          
          <div className="print:hidden bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
             <div>
               <h2 className="text-2xl font-bold text-blue-900">{room.name}</h2>
               <p className="text-slate-500 flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">{room.department}</span>
                  • {room.captures.length} Viewpoints 
               </p>
             </div>
             {(isPending || hasErrors) && (
                 <button 
                    onClick={() => {
                        setState(s => ({ ...s, loading: true, loadingMessage: `Analyzing ${room.name}...` }));
                        analyzeRoom(room).then(updatedRoom => {
                            setState(s => ({
                                ...s,
                                rooms: s.rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r),
                                loading: false
                            }));
                        });
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-md hover:bg-blue-700 transition-colors"
                 >
                    {hasErrors ? <RefreshCw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {hasErrors ? "Retry Failed Analysis" : "Run Analysis Now"}
                 </button>
             )}
          </div>

          <div className="hidden print:block print:mb-6 print-no-break">
             <QrHeader 
                title={room.name} 
                subTitle={`${room.department}`} 
                siteName={state.siteName} 
                companyName={state.companyName}
                inspectorName={state.inspectorName}
                date={state.inspectionDate}
                logo={state.companyLogo}
                themeColor={primaryColor}
              />
          </div>

          {(room.evacuationPlan || isFacilityOrOHS) && (
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print-no-break print-card-clean print-section-border">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2 print:text-black" style={{ color: primaryColor }}>
                    <MapIcon className="w-5 h-5"/> Evacuation Plan
                 </h3>
                 {room.evacuationPlan && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200 print:hidden">Generated</span>}
               </div>
               
               {room.evacuationPlan ? (
                   <div className="bg-slate-50 rounded border border-slate-100 p-2 print:border print:border-slate-300 print:bg-white">
                      <img src={room.evacuationPlan} className="w-full max-h-[600px] object-contain print:max-h-[8cm]" />
                   </div>
               ) : (
                   <div className="bg-blue-50 border border-blue-100 rounded-lg p-8 text-center print:hidden">
                       <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapIcon className="w-8 h-8" />
                       </div>
                       <h4 className="text-xl font-bold text-blue-900 mb-2">Evacuation Plan Missing</h4>
                       <p className="text-slate-600 mb-6 max-w-md mx-auto">
                          Generate a professional evacuation plan with floor markings and exit routes using AI based on the room layout.
                       </p>
                       <button 
                         onClick={() => handleGeneratePlanForRoom(room.id)}
                         disabled={state.loading}
                         className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                       >
                         {state.loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <MapIcon className="w-5 h-5" />}
                         Generate AI Evacuation Plan
                       </button>
                   </div>
               )}
            </div>
          )}
          
          {/* ... Captures List (Unchanged) ... */}
          <div className="space-y-12 print:space-y-8">
            {room.captures.map((capture, idx) => (
              <div key={capture.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print-no-break print-card-clean print-section-border">
                {/* ... Viewpoint Content ... */}
                <h3 className="font-bold text-blue-900 mb-4 border-b pb-2 flex justify-between print:text-black" style={{ color: primaryColor, borderColor: primaryColor }}>
                  <span>Viewpoint {idx + 1}</span>
                  <span className="text-sm font-normal text-slate-500">ID: {capture.id.split('-')[1]}</span>
                </h3>
                
                <div className="mb-6">
                   {capture.overlayImage ? (
                      <div className="space-y-2">
                        <div className="print:hidden">
                           <ImageCompareSlider 
                              original={capture.originalImage} 
                              overlay={capture.overlayImage} 
                           />
                        </div>
                        <div className="hidden print-grid-2">
                           <div>
                              <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Original Capture</p>
                              <img src={capture.originalImage} className="print-image-compact" />
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Analysis Overlay</p>
                              <img src={capture.overlayImage} className="print-image-compact" />
                           </div>
                        </div>
                      </div>
                   ) : (
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Original Capture</p>
                            <img src={capture.originalImage} className="w-full rounded bg-slate-100 border h-64 object-cover" />
                         </div>
                         <div className="w-full h-64 bg-slate-50 border rounded flex items-center justify-center text-slate-400 text-xs italic">
                              {capture.error ? "Analysis Failed" : "Analysis Pending"}
                         </div>
                      </div>
                   )}
                </div>

                {capture.error ? (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <h4 className="font-bold text-red-900">Analysis Failed</h4>
                    <p className="text-sm text-red-700 mt-1 mb-4">{capture.error}</p>
                  </div>
                ) : capture.analysis ? (
                   <AnalysisDisplay analysis={capture.analysis} />
                ) : (
                   <div className="p-8 bg-amber-50 border border-amber-100 rounded-lg text-center print-card-clean">
                       <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                       <h4 className="font-bold text-amber-900">Analysis Pending</h4>
                   </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // Report View (Full Site)
  if (state.view === 'report') {
    const analyzedRooms = state.rooms.filter(r => r.status === 'analyzed');
    const totalCaptures = analyzedRooms.reduce((acc, r) => acc + r.captures.length, 0);
    const avgScore = totalCaptures > 0 
      ? Math.round(analyzedRooms.reduce((acc, r) => acc + r.captures.reduce((cAcc, c) => cAcc + (c.analysis?.score || 0), 0) / totalCaptures)
      : 0;

    const allStandards = analyzedRooms.flatMap(r => r.captures.flatMap(c => c.analysis?.relevantStandards || [])) as Standard[];
    const uniqueStandards = Array.from(new Map(allStandards.map((s) => [s.standardId, s])).values()) as Standard[];

    const activeScopeLabel = state.scope.map(s => SCOPE_CONFIG[s].label).join(' + ');
    const activeScopeConfig = SCOPE_CONFIG[state.scope[0]];
    const themeColor = activeScopeConfig.hex;
    const isFacilityScope = state.scope.includes('Facility');

    // Aggregate findings for Facility Scope Summary Table
    const facilitySummary = isFacilityScope ? analyzedRooms.flatMap(r => r.captures).reduce((acc, c) => {
        const cat = c.analysis?.category || 'General';
        if (!acc[cat]) acc[cat] = { scoreSum: 0, count: 0, issues: 0 };
        acc[cat].scoreSum += c.analysis?.score || 0;
        acc[cat].count += 1;
        acc[cat].issues += (c.analysis?.detailedFindings?.filter(f => f.type !== 'Good condition').length || 0);
        return acc;
    }, {} as Record<string, { scoreSum: number, count: number, issues: number }>) : null;

    return (
      <div className="min-h-screen bg-slate-100 print:bg-white print:min-h-0">
        <style>{GlobalPrintStyles}</style>
        {/* Updated Sticky Header with Z-50 and Shadow */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-md print:hidden">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => setView('dashboard')} className="text-slate-600 flex items-center gap-2 hover:text-blue-900 font-bold">
              <ChevronLeft className="w-5 h-5" /> Back to Dashboard
            </button>
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-bold shadow-sm">
              <Printer className="w-4 h-4" /> Print Full Report
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-8 print:p-0 print:max-w-none">
          
          <div className="print-cover-page">
              <div>
                  <div className="print:mb-8">
                    <QrHeader 
                        title="Site Inspection Report" 
                        subTitle={activeScopeLabel} 
                        siteName={state.siteName}
                        companyName={state.companyName}
                        inspectorName={state.inspectorName}
                        date={state.inspectionDate}
                        logo={state.companyLogo}
                        themeColor={themeColor}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print-no-break">
                    <div className="grid grid-cols-3 gap-4 text-center print:grid print:gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 print-card-clean">
                            <div className="text-3xl font-bold text-blue-900 print:text-black" style={{ color: themeColor }}>{analyzedRooms.length}</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Areas Audited</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 print-card-clean">
                            <div className="text-3xl font-bold text-blue-900 print:text-black" style={{ color: themeColor }}>{totalCaptures}</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Total Viewpoints</div>
                        </div>
                        <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 print-card-clean`}>
                            <div className={`text-3xl font-bold ${getScoreColor(avgScore)} print:text-black`}>{avgScore}%</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Site Compliance</div>
                        </div>
                    </div>
                    {state.geoLocation && state.geoLocation !== 'Fetching...' && state.geoLocation !== 'Not Supported' && (
                        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-hidden h-40 relative print-card-clean print:border print:border-slate-300 print:h-32">
                        <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight={0}
                            marginWidth={0}
                            title="Site Location"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(state.geoLocation)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                            className="rounded-lg"
                        />
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm text-slate-700 flex items-center gap-1 print:border print:border-slate-400">
                            <MapPin className="w-3 h-3" /> {state.geoLocation}
                        </div>
                        </div>
                    )}
                  </div>
              </div>

              {isFacilityScope && facilitySummary && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 print-no-break print-card-clean">
                      <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 print:text-black print:border-slate-300" style={{ color: themeColor }}>
                         <LayoutDashboard className="w-5 h-5" /> Category Summary
                      </h3>
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 font-bold text-slate-700">
                             <tr>
                                <th className="p-2 border-b">Category</th>
                                <th className="p-2 border-b text-center">Images</th>
                                <th className="p-2 border-b text-center">Avg Score</th>
                                <th className="p-2 border-b text-center">Findings</th>
                             </tr>
                          </thead>
                          <tbody>
                             {Object.entries(facilitySummary).map(([cat, stats]: [string, { scoreSum: number, count: number, issues: number }]) => (
                                <tr key={cat} className="border-b last:border-0">
                                   <td className="p-2 font-medium">{cat}</td>
                                   <td className="p-2 text-center">{stats.count}</td>
                                   <td className="p-2 text-center">{Math.round(stats.scoreSum / stats.count)}%</td>
                                   <td className="p-2 text-center">
                                      {stats.issues > 0 ? (
                                         <span className="text-red-600 font-bold">{stats.issues} Issues</span>
                                      ) : (
                                         <span className="text-green-600 font-bold">Good</span>
                                      )}
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                      </table>
                  </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 print-no-break print-card-clean">
                  <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 print:text-black print:border-slate-300" style={{ color: themeColor }}>
                    <Gavel className="w-5 h-5" /> Applicable Regulatory Framework
                  </h3>
                  {uniqueStandards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {uniqueStandards.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 print-card-clean print:p-0 print:mb-2 print:block">
                          {s.standardId.toLowerCase().includes('local') ? (
                              <div className="bg-indigo-600 text-white p-1.5 rounded mt-0.5 print:hidden"><MapPin className="w-4 h-4" /></div>
                          ) : (
                              <div className="bg-blue-600 text-white p-1.5 rounded mt-0.5 print:hidden"><Globe className="w-4 h-4" /></div>
                          )}
                          <div>
                              <div className="font-bold text-slate-800 text-sm">{s.standardId.replace(/\[.*?\]/g, '').trim()}</div>
                              <div className="text-xs text-slate-600">{s.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-sm">No specific standards were cited in the analysis results.</div>
                  )}
              </div>
          </div>

          <div className="space-y-12 print:space-y-0">
             {analyzedRooms.map((room) => (
                <div key={room.id} className="print-break-before mb-16 last:mb-0 print:mb-0">
                    <div className="bg-blue-900 text-white p-4 rounded-t-lg mb-6 print:bg-white print:text-black print:border-b-2 print:border-black print:rounded-none print:px-0 print:mb-4 print-no-break" style={{ borderColor: themeColor }}>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-xs uppercase font-bold text-blue-200 print:text-slate-500 mb-1">{room.department}</div>
                                <h2 className="text-2xl font-bold" style={{ color: themeColor }}>{room.name}</h2>
                            </div>
                            <div className="text-right">
                                <p className="opacity-70 text-sm print:text-slate-600">Audited: {new Date(room.timestamp).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-12 print:gap-4">
                        {room.captures.map((capture, idx) => (
                        <div key={capture.id} className="print-no-break border-b border-slate-200 pb-8 last:border-0 print:border-none print:pb-0 print:mb-4 print-section-border">
                            <h4 className="font-bold text-blue-900 mb-4 text-lg print:text-black print:text-base" style={{ color: themeColor }}>Viewpoint {idx + 1}</h4>
                            
                            <div className="grid grid-cols-2 gap-6 mb-6 print-grid-2">
                                <div>
                                    <p className="text-xs text-center font-bold text-slate-500 mb-2 uppercase">Original Scene</p>
                                    <img src={capture.originalImage} className="w-full h-64 object-cover border rounded-lg shadow-sm print-image-compact" />
                                </div>
                                <div>
                                    <p className="text-xs text-center font-bold text-slate-500 mb-2 uppercase">AI Analysis Overlay</p>
                                    <img src={capture.overlayImage || capture.originalImage} className="w-full h-64 object-cover border rounded-lg shadow-sm print-image-compact" />
                                </div>
                            </div>
                            
                            {capture.analysis ? (
                                <AnalysisDisplay analysis={capture.analysis} compact={false} hideItems={true} />
                            ) : (
                                <div className="text-red-500 font-bold text-sm italic">Analysis Failed for this viewpoint.</div>
                            )}
                        </div>
                        ))}
                    </div>

                    {room.evacuationPlan && (
                        <div className="mt-8 p-4 print-no-break border border-slate-200 rounded-lg print-card-clean print:mt-4 print-section-border">
                        <h3 className="font-bold mb-4 text-blue-900 border-b pb-2 print:text-black print:border-slate-300" style={{ color: themeColor }}>Evacuation Plan</h3>
                        <img src={room.evacuationPlan} className="max-h-[600px] object-contain w-full print:max-h-[8cm]" />
                        </div>
                    )}
                </div>
             ))}
          </div>

          {isFacilityScope && (
              <div className="mt-12 bg-white rounded-xl border border-slate-200 shadow-sm p-8 print-no-break print-card-clean print:break-before-page">
                   <h3 className="font-bold text-xl text-blue-900 mb-6 flex items-center gap-2 border-b-2 border-slate-200 pb-4 print:text-black" style={{ borderColor: themeColor, color: themeColor }}>
                      <Activity className="w-6 h-6" /> Final Evaluation
                   </h3>
                   
                   <div className="flex items-center gap-8 mb-8">
                       <div className="text-center">
                          <div className="text-sm text-slate-500 uppercase font-bold mb-1">Overall Score</div>
                          <div className="text-5xl font-black text-slate-800">{avgScore}%</div>
                       </div>
                       <div className={`flex-1 p-6 rounded-xl border flex items-center gap-4 ${avgScore >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                           {avgScore >= 70 ? <ThumbsUp className="w-12 h-12 text-green-600" /> : <ThumbsDown className="w-12 h-12 text-red-600" />}
                           <div>
                              <div className={`text-2xl font-bold ${avgScore >= 70 ? 'text-green-800' : 'text-red-800'}`}>
                                  {avgScore >= 70 ? 'PASS' : 'FAIL'}
                              </div>
                              <div className="text-sm text-slate-600">
                                  {avgScore >= 70 
                                    ? "Facility meets the baseline visual inspection standards. Minor improvements recommended."
                                    : "Critical non-conformities detected. Immediate corrective action required."
                                  }
                              </div>
                           </div>
                       </div>
                   </div>

                   <div>
                       <h4 className="font-bold text-slate-700 uppercase text-sm mb-4">Priority Improvement Actions</h4>
                       <div className="space-y-3">
                           {analyzedRooms.flatMap(r => r.captures)
                               .flatMap(c => c.analysis?.detailedFindings || [])
                               .filter(f => f.risk === 'High' || f.type === 'Safety hazard')
                               .slice(0, 5)
                               .map((f, i) => (
                                   <div key={i} className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                       <div className="bg-red-200 text-red-800 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">{i+1}</div>
                                       <div>
                                           <div className="font-bold text-red-900 text-sm">{f.issue}</div>
                                           <div className="text-slate-600 text-xs italic">{f.recommendation}</div>
                                       </div>
                                   </div>
                               ))
                           }
                           {analyzedRooms.flatMap(r => r.captures).flatMap(c => c.analysis?.detailedFindings || []).filter(f => f.risk === 'High').length === 0 && (
                               <div className="text-slate-500 italic">No high-risk priority actions identified.</div>
                           )}
                       </div>
                   </div>
              </div>
          )}

          {!isFacilityScope && (
             analyzedRooms.map(room => {
                 const roomItems = room.captures.flatMap(c => c.analysis?.recommendedItems || []);
                 if (roomItems.length > 0) {
                     return (
                        <div key={room.id} className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6 print-no-break print-card-clean print:mt-6 remediation-manifest">
                             <div className="font-bold text-lg text-emerald-900 mb-4 flex items-center gap-2 border-b border-emerald-100 pb-2 print:hidden">
                                <ShoppingBag className="w-5 h-5" /> Remediation Bill of Materials ({room.name})
                             </div>
                             <table className="w-full text-sm text-left">
                                <thead className="bg-emerald-50 text-emerald-900 font-bold border-b border-emerald-200">
                                    <tr>
                                    <th className="p-3">Item / Equipment</th>
                                    <th className="p-3">Required Qty</th>
                                    <th className="p-3">Reason / Hazard</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {roomItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-800">{item.item}</td>
                                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">{item.quantity}</span></td>
                                        <td className="p-3 text-slate-500 text-xs italic">{item.reason}</td>
                                    </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                     )
                 }
                 return null;
             })
          )}

          {/* New Footer Back Button for Report View */}
          <div className="mt-12 text-center print:hidden pb-12">
            <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-blue-900 font-bold flex items-center justify-center gap-2 mx-auto">
                <ChevronLeft className="w-5 h-5" /> Return to Dashboard
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Dashboard ... (rest unchanged)
  const pendingRoomsCount = state.rooms.filter(r => r.status === 'pending').length;
  const errorRoomsCount = state.rooms.filter(r => r.captures.some(c => c.error)).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <style>{GlobalPrintStyles}</style>
      <ActivityLogModal 
        logs={state.logs} 
        isOpen={state.showLogs} 
        onClose={() => setState(s => ({ ...s, showLogs: false }))} 
      />
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${state.scope.length > 0 ? SCOPE_CONFIG[state.scope[0]].color : 'bg-slate-500'} flex items-center justify-center text-white`}>
              {state.scope.includes('Facility') ? <ClipboardCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div className="flex flex-col">
               <span className="font-bold text-blue-900 text-sm leading-tight">{state.companyName}</span>
               <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="truncate max-w-[200px]">{state.siteName}</span>
                  <span className="mx-1">•</span>
                  <span className="truncate max-w-[200px]">{state.scope.map(s => SCOPE_CONFIG[s].label).join(', ')}</span>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setState(s => ({ ...s, showLogs: true }))}
                className="text-slate-500 hover:text-blue-600 p-2 rounded-full hover:bg-slate-50 transition-colors"
                title="View Activity Log"
             >
                <History className="w-5 h-5" />
             </button>
             {state.rooms.some(r => r.status === 'analyzed' && !r.captures.some(c => c.error)) && (
                <button onClick={() => setView('report')} className="text-slate-600 hover:text-blue-900 font-medium text-sm flex items-center gap-2 transition-colors">
                  <FileText className="w-4 h-4" /> Site Report
                </button>
             )}
          </div>
        </div>
      </nav>

      <main className={`max-w-5xl mx-auto p-6 w-full ${state.rooms.length === 0 ? 'flex-1 flex flex-col' : ''}`}>
        
        {(pendingRoomsCount > 0 || errorRoomsCount > 0) && (
           <div className={`mb-8 p-6 rounded-xl text-white shadow-lg flex items-center justify-between ${errorRoomsCount > 0 ? 'bg-amber-700' : 'bg-indigo-900'}`}>
              <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                     {errorRoomsCount > 0 ? <AlertCircle className="w-5 h-5 text-amber-200" /> : <Sparkles className="w-5 h-5 text-indigo-300" />}
                     {errorRoomsCount > 0 ? "Failures Detected" : "Action Required"}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                     {errorRoomsCount > 0 
                        ? `${errorRoomsCount} area(s) failed analysis. Please check internet and retry.`
                        : `${pendingRoomsCount} area(s) are queued for analysis. Run batch processing.`
                     }
                  </p>
              </div>
              <button 
                onClick={handleBatchAnalyze}
                disabled={state.loading}
                className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"
              >
                 {state.loading ? <Loader2 className="w-5 h-5 animate-spin"/> : errorRoomsCount > 0 ? <RefreshCw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                 {errorRoomsCount > 0 ? "Retry All Failed" : "Analyze All Pending"}
              </button>
           </div>
        )}

        {state.rooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {state.rooms.map((room) => {
               const thumb = room.captures[0];
               const isPending = room.status === 'pending';
               const hasError = room.captures.some(c => c.error);
               const score = !isPending && !hasError && room.captures.length > 0 ? Math.round(room.captures.reduce((acc, c) => acc + (c.analysis?.score || 0), 0) / room.captures.length) : 0;
               
               return (
                <div key={room.id} onClick={() => { setState(s => ({ ...s, activeRoomId: room.id, view: 'room-detail' })) }} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md cursor-pointer transition-all group ${hasError ? 'border-red-300' : isPending ? 'border-amber-200' : 'border-slate-200 hover:border-blue-400'}`}>
                  <div className="relative h-48 bg-slate-100">
                     <img src={thumb.overlayImage || thumb.originalImage} className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${isPending || hasError ? 'opacity-80 grayscale-[0.5]' : ''}`} />
                     {isPending ? (
                        <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded text-xs font-bold shadow-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </div>
                     ) : hasError ? (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold shadow-sm flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Failed
                        </div>
                     ) : (
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm text-blue-900">
                          Score: {score}
                        </div>
                     )}
                     <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                       <Camera className="w-3 h-3" /> {room.captures.length}
                     </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-slate-200">
                            {room.department}
                        </span>
                    </div>
                    <h3 className="font-bold text-blue-900 truncate text-lg">{room.name}</h3>
                    <div className="text-xs text-slate-500 mt-1 flex gap-2">
                        <span>{new Date(room.timestamp).toLocaleDateString()}</span>
                        {room.evacuationPlan && <span className="text-blue-600 flex items-center gap-1 font-medium"><MapIcon className="w-3 h-3"/> Plan Ready</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div 
          className={`
            relative transition-all group
            ${state.rooms.length === 0 
              ? 'flex-1 border-4 border-dashed border-slate-300 bg-slate-100/50 rounded-3xl flex flex-col items-center justify-center min-h-[500px]' 
              : 'bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 shadow-sm'
            }
          `}
        >
          <div className="max-w-md mx-auto text-center">
            <div className={`
              rounded-full flex items-center justify-center mx-auto mb-4
              ${state.rooms.length === 0 ? 'w-24 h-24 bg-white shadow-xl text-blue-600' : 'w-16 h-16 bg-blue-50 text-blue-600'}
            `}>
              <Camera className={`${state.rooms.length === 0 ? 'w-10 h-10' : 'w-8 h-8'}`} />
            </div>
            <h2 className={`font-bold text-blue-900 mb-2 ${state.rooms.length === 0 ? 'text-3xl' : 'text-xl'}`}>
              {state.rooms.length === 0 ? 'Start Inspection' : 'Add New Area'}
            </h2>
            <p className="text-slate-500 mb-8 text-lg">
              {state.rooms.length === 0 
                ? `Capture or upload photos to begin your ${state.scope.length > 1 ? 'Combined' : SCOPE_CONFIG[state.scope[0] || 'OHS'].label} audit.` 
                : `Upload photos or capture images of the new area.`
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                   onClick={() => cameraInputRef.current?.click()}
                   className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                   <Camera className="w-5 h-5" /> Take Photo
                </button>
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="bg-white text-blue-700 border border-blue-200 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                   <Upload className="w-5 h-5" /> Upload Gallery
                </button>
            </div>
          </div>
        </div>
        
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageSelect} />
        <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageSelect} />
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<ComplianceInspectorApp />);