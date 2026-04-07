import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Save, Plus, Link2, CheckCircle2, Clock4, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import { getAllBatches } from '../api/batchApi';
import {
    assignSubjectBatches,
    createSubject,
    deleteSubject,
    getSubjects
} from '../api/subjectApi';

const fieldClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400';
const modalBackdropStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)'
};

const SubjectsPage = () => {
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const [newSubject, setNewSubject] = useState({
        classLevel: '',
        name: '',
        code: '',
        batchIds: [],
        chapters: []
    });
    const [draftBatchLinks, setDraftBatchLinks] = useState({});
    const [savingBatchLinksBySubjectId, setSavingBatchLinksBySubjectId] = useState({});
    const [deletingSubjectById, setDeletingSubjectById] = useState({});
    const [deleteDialog, setDeleteDialog] = useState({ open: false, subject: null });

    const [loading, setLoading] = useState({ page: true, create: false });
    const [flash, setFlash] = useState(null);

    const pushFlash = (type, text) => {
        setFlash({ type, text });
        window.clearTimeout(pushFlash.timer);
        pushFlash.timer = window.setTimeout(() => setFlash(null), 3500);
    };

    const loadData = async () => {
        try {
            setLoading(prev => ({ ...prev, page: true }));
            const [batchesRes, subjectsRes] = await Promise.all([
                getAllBatches(),
                getSubjects({ activeOnly: true })
            ]);
            setBatches(batchesRes.data.batches);

            const nextSubjects = subjectsRes.data.subjects || [];
            setSubjects(nextSubjects);

            const nextDraft = {};
            nextSubjects.forEach((subject) => {
                const ids = Array.isArray(subject.batchIds) && subject.batchIds.length > 0
                    ? subject.batchIds.map((batch) => String(batch?._id || batch))
                    : [];
                nextDraft[subject._id] = ids;
            });
            setDraftBatchLinks(nextDraft);
        } catch (error) {
            pushFlash('error', 'Failed to load data.');
        } finally {
            setLoading(prev => ({ ...prev, page: false }));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && deleteDialog.open) {
                closeDeleteDialog();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [deleteDialog.open]);

    const classLevelOptions = useMemo(() => {
        const fromBatches = batches
            .map((batch) => String(batch.course || '').trim())
            .filter(Boolean);
        return Array.from(new Set(fromBatches));
    }, [batches]);

    const toggleNewSubjectBatch = (batchId) => {
        setNewSubject((prev) => {
            const exists = prev.batchIds.includes(batchId);
            return {
                ...prev,
                batchIds: exists
                    ? prev.batchIds.filter((id) => id !== batchId)
                    : [...prev.batchIds, batchId]
            };
        });
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();

        if (!newSubject.name.trim()) {
            pushFlash('error', 'Please enter subject name.');
            return;
        }

        if (!newSubject.classLevel.trim()) {
            pushFlash('error', 'Please choose class level.');
            return;
        }

        if (!Array.isArray(newSubject.batchIds) || newSubject.batchIds.length === 0) {
            pushFlash('error', 'Please assign at least one batch.');
            return;
        }

        const normalizedChapters = (newSubject.chapters || [])
            .map((chapter) => ({
                name: String(chapter?.name || '').trim(),
                durationDays: Number(chapter?.durationDays)
            }))
            .filter((chapter) => chapter.name);

        const invalidChapter = normalizedChapters.find((chapter) => !Number.isFinite(chapter.durationDays) || chapter.durationDays < 1);
        if (invalidChapter) {
            pushFlash('error', 'Each chapter must have at least 1 day duration.');
            return;
        }

        try {
            setLoading(prev => ({ ...prev, create: true }));
            await createSubject({
                classLevel: newSubject.classLevel,
                name: newSubject.name,
                code: newSubject.code,
                batchIds: newSubject.batchIds,
                chapters: normalizedChapters
            });

            pushFlash('success', 'Subject created successfully.');
            setNewSubject({
                classLevel: '',
                name: '',
                code: '',
                batchIds: [],
                chapters: []
            });
            await loadData();
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to create subject.');
        } finally {
            setLoading(prev => ({ ...prev, create: false }));
        }
    };

    const handleSubjectBatchSelection = (subjectId, batchId) => {
        setDraftBatchLinks((prev) => {
            const current = prev[subjectId] || [];
            const exists = current.includes(batchId);
            return {
                ...prev,
                [subjectId]: exists ? current.filter((id) => id !== batchId) : [...current, batchId]
            };
        });
    };

    const saveSubjectBatchLinks = async (subjectId) => {
        const selectedBatchIds = draftBatchLinks[subjectId] || [];
        if (selectedBatchIds.length === 0) {
            pushFlash('error', 'A subject must be linked to at least one batch.');
            return;
        }

        try {
            setSavingBatchLinksBySubjectId((prev) => ({ ...prev, [subjectId]: true }));
            await assignSubjectBatches(subjectId, selectedBatchIds);
            pushFlash('success', 'Subject batch assignment updated.');
            await loadData();
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to update batch assignment.');
        } finally {
            setSavingBatchLinksBySubjectId((prev) => ({ ...prev, [subjectId]: false }));
        }
    };

    const openDeleteDialog = (subject) => {
        setDeleteDialog({ open: true, subject });
    };

    const closeDeleteDialog = () => {
        if (deleteDialog.subject && deletingSubjectById[deleteDialog.subject._id]) return;
        setDeleteDialog({ open: false, subject: null });
    };

    const handleDeleteSubject = async (subject) => {
        if (!subject?._id) return;

        try {
            setDeletingSubjectById((prev) => ({ ...prev, [subject._id]: true }));
            await deleteSubject(subject._id);
            pushFlash('success', 'Subject deleted successfully.');
            await loadData();
            setDeleteDialog({ open: false, subject: null });
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to delete subject.');
        } finally {
            setDeletingSubjectById((prev) => ({ ...prev, [subject._id]: false }));
        }
    };

    return (
        <ERPLayout title="Subjects Management">
            <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Curriculum Setup</p>
                        <h1 className="mt-2 text-3xl font-black text-slate-900">Manage Subjects</h1>
                        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
                            Create shared subjects by class level, assign them to multiple batches, and manage one syllabus state across all linked batches.
                        </p>
                    </div>
                </div>

                {flash && (
                    <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${flash.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}>
                        {flash.text}
                    </div>
                )}

                {loading.page ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* LEFT COLUMN: Existing Subjects */}
                        <div className="xl:col-span-2 space-y-6">
                            <section className="card border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-xl font-black text-slate-900 mb-4">Shared Subject Library</h2>

                                {subjects.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center">
                                        <BookOpen className="mx-auto text-slate-300 mb-3" size={32} />
                                        <p className="text-sm font-medium text-slate-500">No subjects found. Create your first shared subject from the form.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {subjects.map((subject) => {
                                            const linkedBatchIds = draftBatchLinks[subject._id] || [];
                                            const status = subject?.syllabus?.status || 'pending';
                                            const batchesBusy = Boolean(savingBatchLinksBySubjectId[subject._id]);
                                            const deleting = Boolean(deletingSubjectById[subject._id]);

                                            return (
                                                <article key={subject._id} className="rounded-lg border border-slate-200 p-4 bg-white">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <h3 className="text-base font-black text-slate-900">{subject.name}</h3>
                                                            <p className="text-xs font-semibold text-slate-500 mt-1">
                                                                Class Level: <span className="text-slate-700">{subject.classLevel || 'General'}</span>
                                                            </p>
                                                            <p className="text-xs font-semibold text-slate-500 mt-1">
                                                                Code: <span className="text-slate-700">{subject.code || 'N/A'}</span>
                                                            </p>
                                                        </div>

                                                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                            {status === 'completed' ? <CheckCircle2 size={14} /> : <Clock4 size={14} />}
                                                            Syllabus: {status}
                                                        </div>
                                                    </div>

                                                    <div className="mt-4">
                                                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Assigned Batches</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-slate-100 rounded-md p-2">
                                                            {batches.map((batch) => {
                                                                const checked = linkedBatchIds.includes(String(batch._id));
                                                                return (
                                                                    <label key={`${subject._id}-${batch._id}`} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={() => handleSubjectBatchSelection(subject._id, String(batch._id))}
                                                                        />
                                                                        {batch.name}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="mt-2 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60"
                                                            disabled={batchesBusy}
                                                            onClick={() => saveSubjectBatchLinks(subject._id)}
                                                        >
                                                            {batchesBusy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                                                            Save Batch Assignment
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="mt-2 ml-2 inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                                            disabled={deleting}
                                                            onClick={() => openDeleteDialog(subject)}
                                                        >
                                                            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                            Delete Subject
                                                        </button>
                                                    </div>

                                                    <p className="mt-4 text-[11px] font-semibold text-slate-500">
                                                        Upload syllabus from Subject Details to propagate it across all linked batches.
                                                    </p>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Create New Shared Subject */}
                        <div className="space-y-6">
                            <section className="card border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                    <Plus size={18} className="text-indigo-500" />
                                    Create Shared Subject
                                </h2>
                                <p className="text-sm font-medium text-slate-500 mb-5">
                                    Define class level, subject details, and assign one subject to multiple batches.
                                </p>

                                <form onSubmit={handleCreateSubject} className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Class Level <span className="text-rose-500">*</span></label>
                                        <select
                                            className={fieldClass}
                                            value={newSubject.classLevel}
                                            onChange={(e) => setNewSubject({ ...newSubject, classLevel: e.target.value })}
                                            required
                                        >
                                            <option value="">Select class level</option>
                                            {classLevelOptions.map((level) => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Subject Name <span className="text-rose-500">*</span></label>
                                        <input
                                            className={fieldClass}
                                            placeholder="e.g. Advanced Biology"
                                            value={newSubject.name}
                                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Subject Code</label>
                                        <input
                                            className={fieldClass}
                                            placeholder="e.g. BIO101"
                                            value={newSubject.code}
                                            onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                                        />
                                        <p className="mt-1 text-[11px] font-medium text-slate-400">Leave blank to auto-generate from name.</p>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Assign Batches <span className="text-rose-500">*</span></label>
                                        <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
                                            {batches.map((batch) => {
                                                const checked = newSubject.batchIds.includes(String(batch._id));
                                                return (
                                                    <label key={batch._id} className="inline-flex w-full items-center gap-2 text-xs font-semibold text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleNewSubjectBatch(String(batch._id))}
                                                        />
                                                        {batch.name} ({batch.course || 'No Course'})
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <p className="mt-1 text-[11px] font-medium text-slate-400">Select one or more batches for this subject.</p>
                                    </div>

                                    {/* Manual Chapters (Optional) section removed as per requirements */}

                                    <button
                                        type="submit"
                                        className="btn btn-emerald w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                        disabled={loading.create || !newSubject.name || !newSubject.classLevel || newSubject.batchIds.length === 0}
                                    >
                                        {loading.create ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Create Subject
                                    </button>
                                </form>
                            </section>
                        </div>

                    </div>
                )}
            </div>

            {deleteDialog.open && deleteDialog.subject && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    style={modalBackdropStyle}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDeleteDialog();
                        }
                    }}
                >
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
                        <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-orange-50 to-white px-6 py-5">
                            <div className="flex items-start gap-4">
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600">
                                    <AlertTriangle size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-500">Danger Zone</p>
                                    <h3 className="mt-1 text-xl font-black text-slate-900">Delete Subject</h3>
                                    <p className="mt-1 text-sm font-semibold text-slate-600">This action hides the subject from active lists.</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5">
                            <p className="text-sm font-semibold text-slate-700">You are about to delete:</p>
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-base font-black text-slate-900">{deleteDialog.subject.name}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Code: {deleteDialog.subject.code || 'N/A'} • Class: {deleteDialog.subject.classLevel || 'General'}</p>
                            </div>

                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
                                    <ShieldAlert size={14} /> Impact
                                </p>
                                <p className="mt-1 text-sm font-semibold">The subject will be marked inactive and no longer visible in active subject lists.</p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                onClick={closeDeleteDialog}
                                disabled={Boolean(deletingSubjectById[deleteDialog.subject._id])}
                            >
                                Keep Subject
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-60"
                                onClick={() => handleDeleteSubject(deleteDialog.subject)}
                                disabled={Boolean(deletingSubjectById[deleteDialog.subject._id])}
                            >
                                {deletingSubjectById[deleteDialog.subject._id]
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Trash2 size={14} />}
                                Yes, Delete Subject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ERPLayout>
    );
};

export default SubjectsPage;
