import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useInspections } from '@/hooks/useInspections';
import { ImageCompareSlider } from '@/components/ImageCompareSlider';
import type { InspectionScope, Room } from '@/types';
import {
    ArrowLeft,
    Camera,
    Upload,
    Plus,
    ChevronRight,
    Shield,
    Flame,
    Leaf,
    Utensils,
    Lock,
    Wrench,
    Building,
    MapPin,
    Calendar,
    User,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Image as ImageIcon,
    Trash2,
    FileText,
    Printer,
} from 'lucide-react';

// Scope configuration
const SCOPE_CONFIG: Record<InspectionScope, {
    label: string;
    icon: typeof Shield;
    color: string;
    bgColor: string;
}> = {
    OHS: {
        label: 'Occupational Health & Safety',
        icon: Shield,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
    },
    FireSafety: {
        label: 'Fire Safety',
        icon: Flame,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
    },
    Environmental: {
        label: 'Environmental',
        icon: Leaf,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    FoodSafety: {
        label: 'Food Safety',
        icon: Utensils,
        color: 'text-teal-600',
        bgColor: 'bg-teal-100',
    },
    Security: {
        label: 'Security & Surveillance',
        icon: Lock,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
    },
    FacilitiesManagement: {
        label: 'Facilities Management',
        icon: Wrench,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
    },
};

export function InspectionPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const { analyze, loading: analyzing } = useAnalysis();
    const { createInspection, getInspection } = useInspections();

    // Form state
    const [view, setView] = useState<'setup' | 'dashboard' | 'staging' | 'room-detail' | 'report'>('setup');
    const [scope, setScope] = useState<InspectionScope[]>(['OHS', 'FireSafety']);
    const [companyName, setCompanyName] = useState('');
    const [siteName, setSiteName] = useState('');
    const [inspectorName, setInspectorName] = useState('');
    const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
    const [geoLocation, setGeoLocation] = useState('');
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);

    // Room state
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [stagingImages, setStagingImages] = useState<string[]>([]);
    const [stagingRoomName, setStagingRoomName] = useState('');
    const [stagingDepartment, setStagingDepartment] = useState('');

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Load existing inspection
    useEffect(() => {
        if (id && id !== 'new') {
            loadInspection(id);
        }
    }, [id]);

    const loadInspection = async (inspectionId: string) => {
        const inspection = await getInspection(inspectionId);
        if (inspection) {
            setCompanyName(inspection.company_name);
            setSiteName(inspection.site_name);
            setInspectorName(inspection.inspector_name);
            setInspectionDate(inspection.inspection_date);
            setGeoLocation(inspection.geo_location || '');
            setScope(inspection.scope as InspectionScope[]);
            setCompanyLogo(inspection.company_logo);
            setView('dashboard');
        }
    };

    // Toggle scope selection
    const toggleScope = (s: InspectionScope) => {
        setScope(prev =>
            prev.includes(s)
                ? prev.filter(item => item !== s)
                : [...prev, s]
        );
    };

    // Start inspection
    const handleStartInspection = async () => {
        if (!companyName || !siteName || !inspectorName || scope.length === 0) {
            alert('Please fill in all required fields and select at least one scope.');
            return;
        }

        if (user) {
            const inspection = await createInspection({
                user_id: user.id,
                company_name: companyName,
                site_name: siteName,
                inspector_name: inspectorName,
                inspection_date: inspectionDate,
                geo_location: geoLocation || null,
                company_logo: companyLogo,
                scope: scope,
                status: 'in_progress',
            });

            if (inspection) {
                navigate(`/inspection/${inspection.id}`, { replace: true });
            }
        }

        setView('dashboard');
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setStagingImages(prev => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    };

    // Add room with images
    const handleAddRoom = async () => {
        if (!stagingRoomName || stagingImages.length === 0) {
            alert('Please provide a room name and at least one image.');
            return;
        }

        const newRoom: Room = {
            id: crypto.randomUUID(),
            name: stagingRoomName,
            department: stagingDepartment || 'General',
            captures: stagingImages.map(img => ({
                id: crypto.randomUUID(),
                originalImage: img,
            })),
            customChecks: [],
            timestamp: Date.now(),
            status: 'pending',
        };

        setRooms(prev => [...prev, newRoom]);
        setStagingImages([]);
        setStagingRoomName('');
        setStagingDepartment('');
        setView('dashboard');

        // Auto-analyze images
        for (const capture of newRoom.captures) {
            const result = await analyze({
                image: capture.originalImage,
                scope,
                roomName: newRoom.name,
                department: newRoom.department,
            });

            if (result) {
                setRooms(prevRooms =>
                    prevRooms.map(room => {
                        if (room.id !== newRoom.id) return room;
                        return {
                            ...room,
                            status: 'analyzed',
                            captures: room.captures.map(cap => {
                                if (cap.id !== capture.id) return cap;
                                return {
                                    ...cap,
                                    analysis: result.analysis,
                                    overlayImage: result.overlayImage || cap.originalImage,
                                };
                            }),
                        };
                    })
                );
            }
        }
    };

    // Get active room
    const activeRoom = rooms.find(r => r.id === activeRoomId);

    // Calculate overall score
    const calculateOverallScore = useCallback(() => {
        const allCaptures = rooms.flatMap(r => r.captures).filter(c => c.analysis);
        if (allCaptures.length === 0) return 0;
        return Math.round(
            allCaptures.reduce((acc, c) => acc + (c.analysis?.score || 0), 0) / allCaptures.length
        );
    }, [rooms]);

    // Render based on view
    if (view === 'setup') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 p-4 sm:p-8">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Dashboard
                    </button>

                    <div className="card-glass p-6 sm:p-8 animate-fade-in">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">New Inspection</h1>
                                <p className="text-slate-500">Configure your safety audit</p>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <Building className="w-4 h-4 inline mr-1" />
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Acme Corporation"
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <MapPin className="w-4 h-4 inline mr-1" />
                                        Site Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={siteName}
                                        onChange={(e) => setSiteName(e.target.value)}
                                        placeholder="Main Warehouse"
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <User className="w-4 h-4 inline mr-1" />
                                        Inspector Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={inspectorName}
                                        onChange={(e) => setInspectorName(e.target.value)}
                                        placeholder="John Smith"
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Inspection Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={inspectionDate}
                                        onChange={(e) => setInspectionDate(e.target.value)}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    Location (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={geoLocation}
                                    onChange={(e) => setGeoLocation(e.target.value)}
                                    placeholder="123 Main St, City, Country"
                                    className="input"
                                />
                            </div>

                            {/* Scope Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">
                                    Inspection Scope *
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {(Object.entries(SCOPE_CONFIG) as [InspectionScope, typeof SCOPE_CONFIG[InspectionScope]][]).map(
                                        ([key, config]) => {
                                            const Icon = config.icon;
                                            const isSelected = scope.includes(key);
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => toggleScope(key)}
                                                    className={`p-3 rounded-xl border-2 transition-all duration-200 ${isSelected
                                                        ? 'border-sky-500 bg-sky-50 shadow-md'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                                                        <Icon className={`w-5 h-5 ${config.color}`} />
                                                    </div>
                                                    <p className={`text-xs font-medium ${isSelected ? 'text-sky-700' : 'text-slate-600'}`}>
                                                        {config.label.split(' ').slice(0, 2).join(' ')}
                                                    </p>
                                                    {isSelected && (
                                                        <CheckCircle className="w-4 h-4 text-sky-500 mx-auto mt-1" />
                                                    )}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleStartInspection}
                                disabled={!companyName || !siteName || !inspectorName || scope.length === 0}
                                className="w-full btn-primary btn-lg"
                            >
                                Start Inspection
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'staging') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 p-4 sm:p-8">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={() => setView('dashboard')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Inspection
                    </button>

                    <div className="card-glass p-6 sm:p-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Add New Area</h2>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Area/Room Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={stagingRoomName}
                                        onChange={(e) => setStagingRoomName(e.target.value)}
                                        placeholder="e.g., Main Office, Warehouse A"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={stagingDepartment}
                                        onChange={(e) => setStagingDepartment(e.target.value)}
                                        placeholder="e.g., Operations, Admin"
                                        className="input"
                                    />
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">
                                    Capture Images *
                                </label>
                                <div className="flex gap-3 mb-4">
                                    <button
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="btn-secondary btn-md gap-2 flex-1"
                                    >
                                        <Camera className="w-5 h-5" />
                                        Camera
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn-secondary btn-md gap-2 flex-1"
                                    >
                                        <Upload className="w-5 h-5" />
                                        Upload
                                    </button>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />

                                {/* Image Preview Grid */}
                                {stagingImages.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {stagingImages.map((img, index) => (
                                            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                                                <img src={img} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setStagingImages(prev => prev.filter((_, i) => i !== index))}
                                                    className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-sky-400 flex flex-col items-center justify-center text-slate-400 hover:text-sky-500 transition-colors"
                                        >
                                            <Plus className="w-8 h-8 mb-1" />
                                            <span className="text-xs">Add More</span>
                                        </button>
                                    </div>
                                )}

                                {stagingImages.length === 0 && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-all"
                                    >
                                        <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500">Click to upload images or use camera</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleAddRoom}
                                disabled={!stagingRoomName || stagingImages.length === 0 || analyzing}
                                className="w-full btn-primary btn-lg"
                            >
                                {analyzing ? (
                                    <>
                                        <div className="spinner w-5 h-5 mr-2" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        Add & Analyze Area
                                        <ChevronRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'room-detail' && activeRoom) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => {
                            setActiveRoomId(null);
                            setView('dashboard');
                        }}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Areas
                    </button>

                    <div className="card-glass p-6 sm:p-8 animate-fade-in">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{activeRoom.name}</h2>
                                <p className="text-slate-500">{activeRoom.department} Department</p>
                            </div>
                            <span className={`badge ${activeRoom.status === 'analyzed' ? 'badge-success' : 'badge-warning'}`}>
                                {activeRoom.status}
                            </span>
                        </div>

                        {/* Captures */}
                        <div className="space-y-6">
                            {activeRoom.captures.map((capture, index) => (
                                <div key={capture.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                                        <h3 className="font-medium text-slate-700">Capture {index + 1}</h3>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 p-4">
                                        <div>
                                            {capture.overlayImage && capture.overlayImage !== capture.originalImage ? (
                                                <ImageCompareSlider
                                                    original={capture.originalImage}
                                                    overlay={capture.overlayImage}
                                                    labelOriginal="Original"
                                                    labelOverlay="Analysis"
                                                />
                                            ) : (
                                                <img
                                                    src={capture.originalImage}
                                                    alt={`Capture ${index + 1}`}
                                                    className="w-full rounded-lg"
                                                />
                                            )}
                                        </div>

                                        {capture.analysis ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`text-3xl font-bold ${capture.analysis.score >= 80 ? 'text-emerald-500' :
                                                        capture.analysis.score >= 60 ? 'text-amber-500' : 'text-red-500'
                                                        }`}>
                                                        {capture.analysis.score}%
                                                    </div>
                                                    <span className={`badge ${capture.analysis.riskLevel === 'Low' ? 'badge-success' :
                                                        capture.analysis.riskLevel === 'Medium' ? 'badge-warning' : 'badge-danger'
                                                        }`}>
                                                        {capture.analysis.riskLevel} Risk
                                                    </span>
                                                </div>

                                                <p className="text-slate-600">{capture.analysis.summary}</p>

                                                {capture.analysis.hazards.length > 0 && (
                                                    <div>
                                                        <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                            Hazards Identified
                                                        </h4>
                                                        <ul className="space-y-1">
                                                            {capture.analysis.hazards.map((hazard, i) => (
                                                                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                                                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                                    {hazard}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {capture.analysis.detailedFindings && capture.analysis.detailedFindings.length > 0 && (
                                                    <div>
                                                        <h4 className="font-medium text-slate-700 mb-2">Detailed Findings</h4>
                                                        <div className="space-y-2">
                                                            {capture.analysis.detailedFindings.map((finding, i) => (
                                                                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className={`badge ${finding.type === 'Good condition' ? 'badge-success' :
                                                                            finding.type === 'Minor issue' ? 'badge-info' :
                                                                                finding.type === 'Major defect' ? 'badge-warning' : 'badge-danger'
                                                                            }`}>
                                                                            {finding.type}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-700 font-medium">{finding.issue}</p>
                                                                    <p className="text-sm text-slate-500 mt-1">{finding.recommendation}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : capture.error ? (
                                            <div className="flex items-center justify-center">
                                                <div className="text-center">
                                                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                                                    <p className="text-red-600">{capture.error}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="spinner w-8 h-8 text-sky-500 mx-auto mb-2" />
                                                    <p className="text-slate-500">Analyzing...</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard view (default after setup)
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Dashboard
                    </button>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setView('report')} className="btn-secondary btn-sm gap-2">
                            <FileText className="w-4 h-4" />
                            Report
                        </button>
                        <button onClick={() => window.print()} className="btn-secondary btn-sm gap-2">
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                    </div>
                </div>

                {/* Inspection Header Card */}
                <div className="card-glass p-6 mb-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {companyLogo ? (
                                <img src={companyLogo} alt="Company Logo" className="w-16 h-16 rounded-xl object-cover" />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                                    <Building className="w-8 h-8 text-white" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">{companyName}</h1>
                                <p className="text-slate-500">{siteName}</p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        {inspectorName}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(inspectionDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className={`text-3xl font-bold ${calculateOverallScore() >= 80 ? 'text-emerald-500' :
                                    calculateOverallScore() >= 60 ? 'text-amber-500' : 'text-red-500'
                                    }`}>
                                    {calculateOverallScore()}%
                                </p>
                                <p className="text-sm text-slate-500">Overall Score</p>
                            </div>
                        </div>
                    </div>

                    {/* Scope badges */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                        {scope.map(s => {
                            const config = SCOPE_CONFIG[s];
                            const Icon = config.icon;
                            return (
                                <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${config.bgColor} ${config.color} rounded-full text-sm font-medium`}>
                                    <Icon className="w-4 h-4" />
                                    {config.label.split(' ').slice(0, 2).join(' ')}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Areas Grid */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Inspected Areas ({rooms.length})</h2>
                    <button onClick={() => setView('staging')} className="btn-primary btn-sm gap-2">
                        <Plus className="w-4 h-4" />
                        Add Area
                    </button>
                </div>

                {rooms.length === 0 ? (
                    <div className="card-glass p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No areas inspected yet</h3>
                        <p className="text-slate-500 mb-6">Add your first area to start the inspection</p>
                        <button onClick={() => setView('staging')} className="btn-primary btn-md gap-2">
                            <Plus className="w-5 h-5" />
                            Add First Area
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {rooms.map((room) => {
                            const avgScore = room.captures.filter(c => c.analysis).length > 0
                                ? Math.round(
                                    room.captures
                                        .filter(c => c.analysis)
                                        .reduce((acc, c) => acc + (c.analysis?.score || 0), 0) /
                                    room.captures.filter(c => c.analysis).length
                                )
                                : null;

                            return (
                                <button
                                    key={room.id}
                                    onClick={() => {
                                        setActiveRoomId(room.id);
                                        setView('room-detail');
                                    }}
                                    className="card-glass p-4 text-left hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {room.captures[0]?.originalImage ? (
                                                <img
                                                    src={room.captures[0].originalImage}
                                                    alt={room.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <Camera className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">
                                                    {room.name}
                                                </h3>
                                                <p className="text-sm text-slate-500">{room.department}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">
                                            {room.captures.length} capture{room.captures.length !== 1 ? 's' : ''}
                                        </span>
                                        {avgScore !== null ? (
                                            <span className={`text-lg font-bold ${avgScore >= 80 ? 'text-emerald-500' :
                                                avgScore >= 60 ? 'text-amber-500' : 'text-red-500'
                                                }`}>
                                                {avgScore}%
                                            </span>
                                        ) : (
                                            <span className={`badge ${room.status === 'analyzed' ? 'badge-success' : 'badge-warning'}`}>
                                                {room.status}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        {/* Add more card */}
                        <button
                            onClick={() => setView('staging')}
                            className="card-glass p-4 border-2 border-dashed border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all flex flex-col items-center justify-center min-h-[120px]"
                        >
                            <Plus className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="text-slate-500 font-medium">Add Area</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
