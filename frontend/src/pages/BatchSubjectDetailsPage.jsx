import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, User, Mail, Phone, CheckCircle2, Loader2, Save, BarChart3 } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import { API_BASE_URL } from '../api/apiConfig';
import { getBatchSubjectDetails, updateBatchSubjectTotalChapters } from '../api/batchApi';
import apiClient from '../api/apiConfig';
import { SkeletonLine } from '../components/common/SkeletonLoaders';

const toAbsoluteMediaUrl = (value) => {
    if (!value) return null;
    if (String(value).startsWith('http')) return value;
    const normalized = String(value).replace(/\\/g, '/');
    return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

const BatchSubjectDetailsPage = () => {
    const navigate = useNavigate();
    const { id, subjectName } = useParams();
    const [batch, setBatch] = useState(null);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [totalChaptersInput, setTotalChaptersInput] = useState('');
    const [savingTotal, setSavingTotal] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const decodedSubjectName = decodeURIComponent(subjectName || '');

    const loadSubjectDetails = useCallback(async () => {
        if (!id || !decodedSubjectName) return;

        setLoading(true);
        try {
            const [batchResponse, detailsResponse] = await Promise.all([
                apiClient.get(`/batches/${id}`),
                getBatchSubjectDetails(id, decodedSubjectName)
            ]);
            setBatch(batchResponse.data?.batch || null);
            setDetails(detailsResponse.data || null);
            setTotalChaptersInput(
                Number.isFinite(Number(detailsResponse.data?.totalChapters))
                    ? String(detailsResponse.data.totalChapters)
                    : ''
            );
        } catch (error) {
            navigate(`/batches/${id}`);
        } finally {
            setLoading(false);
        }
    }, [decodedSubjectName, id, navigate]);

    useEffect(() => {
        loadSubjectDetails();
    }, [loadSubjectDetails]);

    const saveTotalChapters = async () => {
        const parsed = Number(totalChaptersInput);
        if (!Number.isFinite(parsed) || parsed < 0) {
            setSaveMessage('Please enter a valid non-negative number.');
            return;
        }

        setSavingTotal(true);
        setSaveMessage('');
        try {
            await updateBatchSubjectTotalChapters(id, decodedSubjectName, parsed);
            await loadSubjectDetails();
            setSaveMessage('Total chapters updated successfully.');
        } catch (error) {
            setSaveMessage(error.response?.data?.message || 'Failed to update total chapters.');
        } finally {
            setSavingTotal(false);
        }
    };

    const completionPercent = Number(details?.completionPercent) || 0;
    const progressColor = details?.progressColor === 'green'
        ? 'bg-emerald-500'
        : details?.progressColor === 'yellow'
            ? 'bg-amber-400'
            : 'bg-rose-500';

    return (
        <ERPLayout title={`Subject Details: ${decodedSubjectName}`}>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <Link
                    to={`/batches/${id}`}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold"
                >
                    <ArrowLeft size={18} /> Back to Batch
                </Link>
                <button
                    type="button"
                    onClick={() => navigate(`/batches/${id}`)}
                    className="px-3 py-2 text-xs font-bold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                    Close
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                            <h2 className="text-xl font-black text-slate-900">
                                {loading ? 'Loading...' : (details?.subjectName || decodedSubjectName)}
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batch</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{loading ? '...' : (batch?.name || details?.batchName || 'N/A')}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Chapters</p>
                            <p className="mt-1 text-2xl font-black text-slate-900">{loading ? '...' : (details?.totalChapters ?? 'Not set')}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed</p>
                            <p className="mt-1 text-2xl font-black text-emerald-700">{loading ? '...' : (details?.completedChapters || 0)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining</p>
                            <p className="mt-1 text-2xl font-black text-slate-900">{loading ? '...' : (details?.remainingChapters ?? 'N/A')}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 md:p-5 mb-6">
                        <div className="flex items-center justify-between mb-3 gap-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <BarChart3 size={14} className="text-indigo-500" /> Completion Analytics
                            </p>
                            <span className="text-sm font-black text-slate-800">{loading ? '...' : `${completionPercent}%`}</span>
                        </div>

                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${progressColor} transition-all duration-500`}
                                style={{ width: `${Math.max(0, Math.min(100, completionPercent))}%` }}
                            />
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                            {loading
                                ? 'Loading analytics...'
                                : `Completed ${details?.completedChapters || 0} of ${details?.totalChapters ?? 0} chapters.`}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 md:p-5 mb-6 bg-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Chapter Planning</p>
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-600">Set / Update Total Chapters</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={totalChaptersInput}
                                    onChange={(e) => setTotalChaptersInput(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
                                    placeholder="Enter total chapters"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={saveTotalChapters}
                                disabled={savingTotal}
                                className="px-4 py-2.5 rounded-md bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                            >
                                {savingTotal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Save
                            </button>
                        </div>
                        {saveMessage && <p className="mt-2 text-xs font-semibold text-slate-600">{saveMessage}</p>}
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 md:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Completed Chapter List</p>
                        {loading ? (
                            <div className="space-y-2">
                                <SkeletonLine h={12} w="70%" />
                                <SkeletonLine h={12} w="50%" />
                                <SkeletonLine h={12} w="65%" />
                            </div>
                        ) : (details?.chapterNames || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {details.chapterNames.map((chapter) => (
                                    <span
                                        key={chapter}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold"
                                    >
                                        <CheckCircle2 size={12} /> {chapter}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No completed chapters found for this subject yet.</p>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Assigned Teacher</p>
                    {loading ? (
                        <div className="space-y-3">
                            <SkeletonLine h={16} w="80%" />
                            <SkeletonLine h={12} w="65%" />
                            <SkeletonLine h={12} w="50%" />
                        </div>
                    ) : details?.teacher ? (
                        <div>
                            <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center mb-4">
                                {details.teacher.profileImage ? (
                                    <img
                                        src={toAbsoluteMediaUrl(details.teacher.profileImage)}
                                        alt={details.teacher.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User size={28} className="text-slate-400" />
                                )}
                            </div>
                            <h3 className="text-lg font-black text-slate-900">{details.teacher.name}</h3>
                            <p className="text-sm text-slate-500">{details.teacher.designation || 'Faculty'}</p>

                            <div className="mt-4 space-y-2 text-sm text-slate-700">
                                <div className="inline-flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" />
                                    <span>{details.teacher.email || 'Email not available'}</span>
                                </div>
                                <div className="inline-flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    <span>{details.teacher.phone || 'Phone not available'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-amber-700 font-semibold">No teacher assigned to this subject.</p>
                    )}
                </div>
            </div>
        </ERPLayout>
    );
};

export default BatchSubjectDetailsPage;
