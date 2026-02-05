import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useInspections } from '@/hooks/useInspections';
import {
    Plus,
    Search,
    Filter,
    Clock,
    MapPin,
    BarChart3,
    FileText,
    Trash2,
    Eye,
    LogOut,
    User,
    Shield,
    Building,
    Calendar,
    TrendingUp,
    ChevronRight,
    Settings,
} from 'lucide-react';

export function DashboardPage() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { inspections, loading, fetchInspections, deleteInspection } = useInspections();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        if (user) {
            fetchInspections(user.id);
        }
    }, [user, fetchInspections]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const handleNewInspection = () => {
        navigate('/inspection/new');
    };

    const handleViewInspection = (id: string) => {
        navigate(`/inspection/${id}`);
    };

    const handleDeleteInspection = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this inspection?')) {
            await deleteInspection(id);
        }
    };

    const filteredInspections = inspections.filter((inspection) => {
        const matchesSearch =
            inspection.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inspection.site_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || inspection.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: inspections.length,
        completed: inspections.filter((i) => i.status === 'completed').length,
        inProgress: inspections.filter((i) => i.status === 'in_progress').length,
        avgScore:
            inspections.filter((i) => i.overall_score !== null).length > 0
                ? Math.round(
                    inspections
                        .filter((i) => i.overall_score !== null)
                        .reduce((acc, i) => acc + (i.overall_score || 0), 0) /
                    inspections.filter((i) => i.overall_score !== null).length
                )
                : 0,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800">HSE Compliance</h1>
                                <p className="text-xs text-slate-500">Inspector Dashboard</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="btn-ghost btn-sm">
                                <Settings className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-sm font-medium text-slate-700">
                                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-slate-500">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="btn-ghost btn-sm text-slate-500 hover:text-red-500"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="card-glass p-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-sky-600" />
                            </div>
                            <span className="badge-info">Total</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Inspections</p>
                    </div>

                    <div className="card-glass p-6 animate-fade-in animation-delay-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <span className="badge-success">Completed</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats.completed}</p>
                        <p className="text-sm text-slate-500">Finished</p>
                    </div>

                    <div className="card-glass p-6 animate-fade-in animation-delay-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                            <span className="badge-warning">Active</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats.inProgress}</p>
                        <p className="text-sm text-slate-500">In Progress</p>
                    </div>

                    <div className="card-glass p-6 animate-fade-in animation-delay-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <span className="badge-info">Avg</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats.avgScore}%</p>
                        <p className="text-sm text-slate-500">Compliance Score</p>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search inspections..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="input pr-10 appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <button onClick={handleNewInspection} className="btn-primary btn-md gap-2">
                        <Plus className="w-5 h-5" />
                        New Inspection
                    </button>
                </div>

                {/* Inspections List */}
                <div className="card-glass overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="spinner w-8 h-8 text-sky-500 mx-auto mb-4" />
                            <p className="text-slate-500">Loading inspections...</p>
                        </div>
                    ) : filteredInspections.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">No inspections found</h3>
                            <p className="text-slate-500 mb-6">
                                {inspections.length === 0
                                    ? 'Get started by creating your first inspection'
                                    : 'Try adjusting your search or filter'}
                            </p>
                            {inspections.length === 0 && (
                                <button onClick={handleNewInspection} className="btn-primary btn-md gap-2">
                                    <Plus className="w-5 h-5" />
                                    Create First Inspection
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredInspections.map((inspection) => (
                                <div
                                    key={inspection.id}
                                    className="p-4 sm:p-6 hover:bg-slate-50/50 transition-colors group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Building className="w-6 h-6 text-sky-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-slate-800 truncate">
                                                    {inspection.company_name}
                                                </h3>
                                                <p className="text-sm text-slate-500 truncate">{inspection.site_name}</p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(inspection.inspection_date).toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                                        <User className="w-3.5 h-3.5" />
                                                        {inspection.inspector_name}
                                                    </span>
                                                    {inspection.geo_location && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {inspection.geo_location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {inspection.overall_score !== null && (
                                                <div className="text-right hidden sm:block">
                                                    <p
                                                        className={`text-2xl font-bold ${inspection.overall_score >= 80
                                                                ? 'text-emerald-500'
                                                                : inspection.overall_score >= 60
                                                                    ? 'text-amber-500'
                                                                    : 'text-red-500'
                                                            }`}
                                                    >
                                                        {inspection.overall_score}%
                                                    </p>
                                                    <p className="text-xs text-slate-500">Score</p>
                                                </div>
                                            )}

                                            <span
                                                className={`badge ${inspection.status === 'completed'
                                                        ? 'badge-success'
                                                        : inspection.status === 'in_progress'
                                                            ? 'badge-warning'
                                                            : 'badge-info'
                                                    }`}
                                            >
                                                {inspection.status.replace('_', ' ')}
                                            </span>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleViewInspection(inspection.id)}
                                                    className="btn-ghost btn-sm text-sky-600"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteInspection(inspection.id)}
                                                    className="btn-ghost btn-sm text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleViewInspection(inspection.id)}
                                                    className="btn-ghost btn-sm"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
