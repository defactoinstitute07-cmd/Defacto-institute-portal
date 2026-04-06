import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ChevronLeft,
    BookOpen,
    CheckCircle2,
    CircleDashed,
    Plus,
    Loader2,
    Timer,
    Target,
    Lock,
    Pencil,
    Save,
    X,
    User
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import apiClient, { API_BASE_URL } from '../api/apiConfig';
import { addSubjectChapter, assignSubjectTeacher, getSubjectById, updateSubjectChapter, updateSubjectChapterStatus } from '../api/subjectApi';

const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400';

const getTeacherImage = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    return `${API_BASE_URL}${profileImage}`;
};

const resolveTeacherId = (teacherValue) => {
    if (!teacherValue) return '';
    if (typeof teacherValue === 'string') return teacherValue;
    if (typeof teacherValue === 'object' && teacherValue._id) return String(teacherValue._id);

    // Handles raw ObjectId-like objects returned from non-populated payloads.
    const fallback = String(teacherValue);
    return fallback && fallback !== '[object Object]' ? fallback : '';
};

export default function SubjectDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusUpdatingId, setStatusUpdatingId] = useState('');
    const [error, setError] = useState('');
    const [flash, setFlash] = useState(null);
    const [chapterForm, setChapterForm] = useState({ name: '', durationDays: 1 });
    const [editingChapterId, setEditingChapterId] = useState('');
    const [editForm, setEditForm] = useState({ name: '', durationDays: 1, status: 'ongoing' });
    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [assigningTeacher, setAssigningTeacher] = useState(false);

    const primaryBatchId = Array.isArray(subject?.batchIds) && subject.batchIds.length > 0
        ? (subject.batchIds[0]?._id || subject.batchIds[0])
        : '';
    const batchId = searchParams.get('batchId') || primaryBatchId || '';

    const pushFlash = (type, text) => {
        setFlash({ type, text });
        window.clearTimeout(pushFlash.timer);
        pushFlash.timer = window.setTimeout(() => setFlash(null), 3500);
    };

    const loadSubject = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const { data } = await getSubjectById(id);
            setSubject(data.subject);
        } catch (requestError) {
            const message = requestError?.response?.data?.message || 'Failed to load subject details.';
            setError(message);
            if (requestError?.response?.status === 404) {
                navigate('/subjects');
            }
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadSubject();
    }, [loadSubject]);

    useEffect(() => {
        let active = true;

        const loadTeachers = async () => {
            setLoadingTeachers(true);
            try {
                const { data } = await apiClient.get('/teachers', {
                    params: { page: 1, limit: 500, status: 'active' }
                });
                if (active) setTeachers(data?.teachers || []);
            } catch (_error) {
                if (active) setTeachers([]);
            } finally {
                if (active) setLoadingTeachers(false);
            }
        };

        loadTeachers();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!subject) return;
        const currentTeacherId = resolveTeacherId(subject.teacherId);
        if (currentTeacherId) {
            setSelectedTeacherId(currentTeacherId);
        }
    }, [subject]);

    const chapters = subject?.chapters || [];
    const progress = subject?.progress || {
        totalChapters: chapters.length,
        completedChapters: 0,
        remainingChapters: chapters.length,
        progressPercentage: 0,
        nextChapter: null
    };

    const handleAddChapter = async (event) => {
        event.preventDefault();

        if (!chapterForm.name.trim()) {
            pushFlash('error', 'Chapter name is required.');
            return;
        }

        const duration = Number(chapterForm.durationDays);
        if (!Number.isFinite(duration) || duration < 1) {
            pushFlash('error', 'Duration must be at least 1 day.');
            return;
        }

        setSaving(true);
        try {
            await addSubjectChapter(id, {
                name: chapterForm.name,
                durationDays: duration
            });
            await loadSubject();
            setChapterForm({ name: '', durationDays: 1 });
            pushFlash('success', 'Chapter added successfully.');
        } catch (requestError) {
            pushFlash('error', requestError?.response?.data?.message || 'Failed to add chapter.');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusUpdate = async (chapterId, status) => {
        setStatusUpdatingId(chapterId);
        try {
            await updateSubjectChapterStatus(id, chapterId, status);
            await loadSubject();
            pushFlash('success', 'Chapter status updated.');
        } catch (requestError) {
            pushFlash('error', requestError?.response?.data?.message || 'Failed to update chapter status.');
        } finally {
            setStatusUpdatingId('');
        }
    };

    const handleStartEdit = (chapter) => {
        setEditingChapterId(chapter._id);
        setEditForm({
            name: chapter.name,
            durationDays: chapter.durationDays,
            status: 'ongoing'
        });
    };

    const handleCancelEdit = () => {
        setEditingChapterId('');
        setEditForm({ name: '', durationDays: 1, status: 'ongoing' });
    };

    const handleSaveEdit = async (chapterId) => {
        const duration = Number(editForm.durationDays);
        if (!editForm.name.trim()) {
            pushFlash('error', 'Chapter name cannot be empty.');
            return;
        }
        if (!Number.isFinite(duration) || duration < 1) {
            pushFlash('error', 'Duration must be at least 1 day.');
            return;
        }

        setStatusUpdatingId(chapterId);
        try {
            await updateSubjectChapter(id, chapterId, {
                name: editForm.name,
                durationDays: duration,
                status: editForm.status
            });
            await loadSubject();
            handleCancelEdit();
            pushFlash('success', 'Chapter updated successfully.');
        } catch (requestError) {
            pushFlash('error', requestError?.response?.data?.message || 'Failed to update chapter.');
        } finally {
            setStatusUpdatingId('');
        }
    };

    const formatDate = (value) => {
        if (!value) return 'Not scheduled yet';
        return new Date(value).toLocaleDateString();
    };

    const teacherId = resolveTeacherId(subject?.teacherId);
    const currentTeacher = (subject?.teacherId && typeof subject.teacherId === 'object' && subject.teacherId.name)
        ? subject.teacherId
        : teachers.find((teacher) => String(teacher._id) === String(teacherId)) || null;

    const handleAssignTeacher = async () => {
        setAssigningTeacher(true);
        try {
            const payloadTeacherId = selectedTeacherId || null;
            const { data } = await assignSubjectTeacher(id, payloadTeacherId);
            setSubject(data.subject);
            pushFlash('success', data?.message || 'Teacher assignment updated.');
        } catch (requestError) {
            pushFlash('error', requestError?.response?.data?.message || 'Failed to update teacher assignment.');
        } finally {
            setAssigningTeacher(false);
        }
    };

    if (loading) {
        return (
            <ERPLayout title="Subject Details">
                <div className="bg-white rounded-md border border-slate-100 p-10 text-center shadow-sm">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
                    <p className="mt-4 text-sm font-semibold text-slate-500">Loading subject details...</p>
                </div>
            </ERPLayout>
        );
    }

    if (!subject) {
        return (
            <ERPLayout title="Subject Details">
                <div className="bg-white rounded-md border border-rose-100 p-10 text-center shadow-sm">
                    <p className="text-sm font-semibold text-rose-600">{error || 'Subject not found.'}</p>
                    <Link to="/subjects" className="mt-4 inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                        Back To Subjects
                    </Link>
                </div>
            </ERPLayout>
        );
    }

    return (
        <ERPLayout title={`Subject: ${subject.name}`}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <Link
                    to={batchId ? `/batches/${batchId}` : '/subjects'}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                >
                    <ChevronLeft size={16} /> Back
                </Link>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    <BookOpen size={14} /> {subject.code || subject.name}
                </div>
            </div>

            {flash && (
                <div className={`mb-5 rounded-md border px-4 py-3 text-sm font-semibold ${flash.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
                    {flash.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <div className="rounded-md border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Chapters</p>
                    <p className="mt-2 text-3xl font-black text-slate-800">{progress.totalChapters}</p>
                </div>
                <div className="rounded-md border border-emerald-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Completed</p>
                    <p className="mt-2 text-3xl font-black text-emerald-700">{progress.completedChapters}</p>
                </div>
                <div className="rounded-md border border-amber-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Remaining</p>
                    <p className="mt-2 text-3xl font-black text-amber-700">{progress.remainingChapters}</p>
                </div>
                <div className="rounded-md border border-indigo-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Progress</p>
                    <p className="mt-2 text-3xl font-black text-indigo-700">{progress.progressPercentage}%</p>
                </div>
            </div>

            <div className="mt-5 rounded-md border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Course Progress</p>
                    <p className="text-sm font-bold text-slate-600">{progress.completedChapters}/{progress.totalChapters} chapters</p>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all" style={{ width: `${progress.progressPercentage}%` }} />
                </div>
            </div>

            <div className="mt-5 rounded-md border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Chapter Prediction</p>
                {progress.nextChapter ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-cyan-700">
                            <Target size={14} /> {progress.nextChapter.name}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-slate-600">
                            <Timer size={14} /> Complete in {progress.nextChapter.dueInDays} day{progress.nextChapter.dueInDays > 1 ? 's' : ''}
                        </span>
                    </div>
                ) : (
                    <p className="mt-3 text-sm font-semibold text-emerald-700">All chapters are completed.</p>
                )}
            </div>

            <section className="mt-8 rounded-md border border-indigo-100 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-indigo-100 bg-indigo-50/60 px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Teacher Assignment</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">Assign a teacher to this subject and view their profile details.</p>
                </div>

                <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
                    <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
                        <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Assigned Teacher</p>
                        {currentTeacher ? (
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-white">
                                    {getTeacherImage(currentTeacher.profileImage) ? (
                                        <img
                                            src={getTeacherImage(currentTeacher.profileImage)}
                                            alt={currentTeacher.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                                            <User size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-black text-slate-800">{currentTeacher.name}</div>
                                    <div className="text-xs font-semibold text-slate-500">{currentTeacher.regNo || 'No Employee ID'}</div>
                                    <div className="text-xs font-semibold text-slate-600">{currentTeacher.email || 'No email provided'}</div>
                                    <div className="text-xs font-semibold text-slate-600">{currentTeacher.phone || 'No phone provided'}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                                No teacher assigned yet.
                            </div>
                        )}
                    </div>

                    <div className="rounded-md border border-slate-100 bg-white p-4">
                        <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Update Assignment</p>
                        <div className="flex flex-col gap-3">
                            <select
                                className={inputClass}
                                value={selectedTeacherId}
                                onChange={(event) => setSelectedTeacherId(event.target.value)}
                                disabled={loadingTeachers || assigningTeacher}
                            >
                                <option value="">{loadingTeachers ? 'Loading teachers...' : 'Unassigned'}</option>
                                {teachers.map((teacher) => (
                                    <option key={teacher._id} value={teacher._id}>
                                        {teacher.name} {teacher.regNo ? `(${teacher.regNo})` : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                disabled={assigningTeacher || loadingTeachers}
                                onClick={handleAssignTeacher}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {assigningTeacher ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Assignment
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="rounded-md border border-slate-100 bg-white p-6 shadow-sm lg:col-span-1">
                    <h2 className="text-base font-black uppercase tracking-wide text-slate-800">Add Chapter</h2>
                    <form className="mt-4 space-y-4" onSubmit={handleAddChapter}>
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Chapter Name</label>
                            <input
                                className={inputClass}
                                value={chapterForm.name}
                                onChange={(event) => setChapterForm((prev) => ({ ...prev, name: event.target.value }))}
                                placeholder="e.g. Quadratic Equations"
                                maxLength={120}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Duration (Days)</label>
                            <input
                                className={inputClass}
                                type="number"
                                min={1}
                                value={chapterForm.durationDays}
                                onChange={(event) => setChapterForm((prev) => ({ ...prev, durationDays: event.target.value }))}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Add Chapter
                        </button>
                    </form>
                </div>

                <div className="rounded-md border border-slate-100 bg-white shadow-sm lg:col-span-2">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-base font-black uppercase tracking-wide text-slate-800">Chapter List</h2>
                    </div>

                    {chapters.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                            No chapters added yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {chapters.map((chapter, index) => {
                                const isCompleted = chapter.status === 'completed';
                                const isUpdating = statusUpdatingId === chapter._id;
                                const isEditing = editingChapterId === chapter._id;

                                return (
                                    <div key={chapter._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                                        <div>
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input
                                                        className={inputClass}
                                                        value={editForm.name}
                                                        onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                                                        placeholder="Chapter name"
                                                    />
                                                    <div className="flex gap-2">
                                                        <input
                                                            className={inputClass}
                                                            type="number"
                                                            min={1}
                                                            value={editForm.durationDays}
                                                            onChange={(event) => setEditForm((prev) => ({ ...prev, durationDays: event.target.value }))}
                                                        />
                                                        <select
                                                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400"
                                                            value={editForm.status}
                                                            onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                                                        >
                                                            <option value="ongoing">Ongoing</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-bold text-slate-800">{index + 1}. {chapter.name}</p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                                        Duration: {chapter.durationDays} day{chapter.durationDays > 1 ? 's' : ''}
                                                    </p>
                                                </>
                                            )}
                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                {isCompleted
                                                    ? `Completed on: ${formatDate(chapter.completedAt)}`
                                                    : `Expected completion: ${formatDate(chapter.projectedCompletionDate)}`}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${isCompleted ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                                                {isCompleted ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}
                                                {chapter.status}
                                            </span>

                                            {isCompleted ? (
                                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                                                    <Lock size={12} /> Locked
                                                </span>
                                            ) : isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleSaveEdit(chapter._id)}
                                                        className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-70"
                                                    >
                                                        <Save size={12} /> Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={handleCancelEdit}
                                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <X size={12} /> Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEdit(chapter)}
                                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Pencil size={12} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleStatusUpdate(chapter._id, 'completed')}
                                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
                                                    >
                                                        <CheckCircle2 size={12} /> Mark Completed
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </ERPLayout>
    );
}
