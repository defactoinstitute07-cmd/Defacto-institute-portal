import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Loader2, Save, Plus, X, AlertTriangle } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import { getAllBatches, updateBatchSubjects } from '../api/batchApi';
import { getSubjects, createSubject } from '../api/subjectApi';
import apiClient from '../api/apiConfig';

const fieldClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400';

const SubjectsPage = () => {
    const [batches, setBatches] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [classSuggestions, setClassSuggestions] = useState([]);

    // Assigned subjects for the currently selected batch
    const [assignedSubjectIds, setAssignedSubjectIds] = useState(new Set());

    // New Subject Form
    const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' });

    const [loading, setLoading] = useState({ page: true, save: false, create: false, remove: false });
    const [flash, setFlash] = useState(null);
    const [removePrompt, setRemovePrompt] = useState({ open: false, subjectId: '', subjectName: '' });

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
            setAllSubjects(subjectsRes.data.subjects);
        } catch (error) {
            pushFlash('error', 'Failed to load data.');
        } finally {
            setLoading(prev => ({ ...prev, page: false }));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedBatch = useMemo(() => batches.find(b => b._id === selectedBatchId) || null, [batches, selectedBatchId]);

    const mappingSubjects = useMemo(() => {
        const suggestionSet = new Set((classSuggestions || []).map(s => String(s).toLowerCase()));
        const selectedIds = new Set(Array.from(assignedSubjectIds));

        const suggestedSubjects = allSubjects.filter(subject => suggestionSet.has(String(subject.name || '').toLowerCase()));
        const selectedSubjects = allSubjects.filter(subject => selectedIds.has(String(subject._id)));

        const merged = [...suggestedSubjects];
        selectedSubjects.forEach((subject) => {
            if (!merged.some((item) => String(item._id) === String(subject._id))) {
                merged.push(subject);
            }
        });

        return merged;
    }, [allSubjects, classSuggestions, assignedSubjectIds]);

    // When a batch is selected, prepopulate its assigned subjects
    useEffect(() => {
        if (selectedBatch) {
            const initialIds = new Set(selectedBatch.subjectIds?.map(id => String(id)) || []);
            setAssignedSubjectIds(initialIds);

            if (selectedBatch.course) {
                apiClient.get(`/batches/courses/${encodeURIComponent(selectedBatch.course)}/subjects`)
                    .then(({ data }) => setClassSuggestions([...(data.subjects || [])]))
                    .catch(() => setClassSuggestions([]));
            } else {
                setClassSuggestions([]);
            }
        } else {
            setAssignedSubjectIds(new Set());
            setClassSuggestions([]);
        }
    }, [selectedBatch]);

    const handleToggleSubject = (subjectId) => {
        setAssignedSubjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subjectId)) {
                newSet.delete(subjectId);
            } else {
                newSet.add(subjectId);
            }
            return newSet;
        });
    };

    const computeSubjectNamesFromIds = (subjectIdsSet) => {
        const ids = Array.from(subjectIdsSet);
        return allSubjects
            .filter(s => ids.includes(String(s._id)))
            .map(s => s.name);
    };

    const syncBatchMappingInState = (batchId, nextIdsSet) => {
        const nextIds = Array.from(nextIdsSet);
        const nextNames = computeSubjectNamesFromIds(nextIdsSet);

        setBatches(prev => prev.map(batch => (
            batch._id === batchId
                ? { ...batch, subjectIds: nextIds, subjects: nextNames }
                : batch
        )));
    };

    const requestRemoveSubject = (subjectId, subjectName) => {
        setRemovePrompt({ open: true, subjectId, subjectName });
    };

    const closeRemovePrompt = () => {
        if (loading.remove) return;
        setRemovePrompt({ open: false, subjectId: '', subjectName: '' });
    };

    const handleRemoveSubject = async () => {
        if (!selectedBatchId || !removePrompt.subjectId) return;

        const subjectId = removePrompt.subjectId;
        const subjectName = removePrompt.subjectName;

        const previousSet = new Set(assignedSubjectIds);
        if (!previousSet.has(subjectId)) return;

        const nextSet = new Set(previousSet);
        nextSet.delete(subjectId);

        // Optimistic UI update for instant feedback.
        setLoading(prev => ({ ...prev, remove: true }));
        setAssignedSubjectIds(nextSet);
        syncBatchMappingInState(selectedBatchId, nextSet);

        try {
            const subjectIdsArray = Array.from(nextSet);
            const subjectsArray = computeSubjectNamesFromIds(nextSet);
            await updateBatchSubjects(selectedBatchId, subjectIdsArray, subjectsArray);
            pushFlash('success', `Removed ${subjectName} from batch mapping.`);
            closeRemovePrompt();
        } catch (error) {
            // Roll back optimistic update if persistence fails.
            setAssignedSubjectIds(previousSet);
            syncBatchMappingInState(selectedBatchId, previousSet);
            pushFlash('error', error.response?.data?.message || 'Failed to remove subject mapping.');
        } finally {
            setLoading(prev => ({ ...prev, remove: false }));
        }
    };

    const handleSaveAssignments = async () => {
        if (!selectedBatchId) return;

        try {
            setLoading(prev => ({ ...prev, save: true }));

            // The backend expects array of IDs and array of Names
            const subjectIdsArray = Array.from(assignedSubjectIds);
            const subjectsArray = allSubjects
                .filter(s => subjectIdsArray.includes(String(s._id)))
                .map(s => s.name);

            await updateBatchSubjects(selectedBatchId, subjectIdsArray, subjectsArray);

            pushFlash('success', 'Batch subjects mapped successfully.');
            // Refresh batch data to reflect changes
            const res = await getAllBatches();
            setBatches(res.data.batches);

        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to map subjects.');
        } finally {
            setLoading(prev => ({ ...prev, save: false }));
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();

        if (!selectedBatchId) {
            pushFlash('error', 'Please select a batch before creating a subject.');
            return;
        }

        try {
            setLoading(prev => ({ ...prev, create: true }));
            const res = await createSubject({
                ...newSubject,
                batchId: selectedBatchId
            });

            pushFlash('success', 'Subject created successfully.');

            // Add to list and select it automatically for the current batch
            const createdSubject = res.data.subject;
            setAllSubjects(prev => [...prev, createdSubject]);

            if (selectedBatchId) {
                setAssignedSubjectIds(prev => new Set([...prev, String(createdSubject._id)]));
            }

            setNewSubject({ name: '', code: '', description: '' });
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to create subject.');
        } finally {
            setLoading(prev => ({ ...prev, create: false }));
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
                            Create organizational subjects and map them to their corresponding specific classes/batches.
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

                        {/* LEFT COLUMN: Map Subjects to Batch */}
                        <div className="xl:col-span-2 space-y-6">
                            <section className="card border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-xl font-black text-slate-900 mb-4">Batch Subject Mapping</h2>

                                <div className="mb-6">
                                    <label className="mb-1.5 block text-sm font-bold text-slate-700">Select Batch To Configure</label>
                                    <select
                                        className={fieldClass}
                                        value={selectedBatchId}
                                        onChange={(e) => setSelectedBatchId(e.target.value)}
                                    >
                                        <option value="">-- Choose a Batch --</option>
                                        {batches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name} ({b.course || 'No Course'})</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedBatchId ? (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold text-slate-800">Class-Based Subject Suggestions</h3>
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                                {assignedSubjectIds.size} Selected
                                            </span>
                                        </div>

                                        <p className="mb-4 text-xs font-medium text-slate-500">
                                            Showing suggestions relevant to <span className="font-bold">{selectedBatch?.course || 'selected class'}</span>. Subjects are not auto-added; click to choose.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 max-h-[400px] overflow-y-auto p-1">
                                            {mappingSubjects.map(subject => {
                                                const isSelected = assignedSubjectIds.has(String(subject._id));
                                                return (
                                                    <div
                                                        key={subject._id}
                                                        onClick={() => {
                                                            if (!isSelected) {
                                                                handleToggleSubject(String(subject._id));
                                                            }
                                                        }}
                                                        className={`cursor-pointer border rounded-lg p-3 transition-all duration-200 ${isSelected
                                                                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div className="font-bold text-slate-800 text-sm">{subject.name}</div>
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                                                {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                                            Code: <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">{subject.code || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {mappingSubjects.length === 0 && (
                                                <div className="col-span-full py-8 text-center text-sm font-medium text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                                                    No class-based suggestions available for this batch course.
                                                </div>
                                            )}
                                        </div>

                                        {assignedSubjectIds.size > 0 && (
                                            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Selected Subjects</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {allSubjects
                                                        .filter(subject => assignedSubjectIds.has(String(subject._id)))
                                                        .map(subject => (
                                                            <div
                                                                key={`selected-${subject._id}`}
                                                                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                                                            >
                                                                <span>{subject.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        requestRemoveSubject(String(subject._id), subject.name);
                                                                    }}
                                                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                                    title={`Remove ${subject.name} from this batch`}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-5 border-t border-slate-100 flex justify-end">
                                            <button
                                                className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 px-8"
                                                onClick={handleSaveAssignments}
                                                disabled={loading.save}
                                            >
                                                {loading.save ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Save Mappings For Batch
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center">
                                        <BookOpen className="mx-auto text-slate-300 mb-3" size={32} />
                                        <p className="text-sm font-medium text-slate-500">Please select a batch above to manage its subjects.</p>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Create New Subject */}
                        <div className="space-y-6">
                            <section className="card border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                    <Plus size={18} className="text-indigo-500" />
                                    Create New Subject
                                </h2>
                                <p className="text-sm font-medium text-slate-500 mb-5">
                                    Add a new subject to the global list. If a batch is currently selected, it will be automatically assigned to it.
                                </p>

                                <form onSubmit={handleCreateSubject} className="space-y-4">
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
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Description</label>
                                        <textarea
                                            className={`${fieldClass} min-h-[80px] text-sm`}
                                            placeholder="Optional description..."
                                            value={newSubject.description}
                                            onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-emerald w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                        disabled={loading.create || !newSubject.name}
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

            {removePrompt.open && (
                <div
                    className="fixed inset-0 z-[1100] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeRemovePrompt();
                    }}
                >
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Remove Subject Mapping</h3>
                                    <p className="text-xs text-slate-500">This action updates only the selected batch mapping.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                                onClick={closeRemovePrompt}
                                disabled={loading.remove}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="px-5 py-4 text-sm text-slate-700">
                            Are you sure you want to remove
                            <span className="font-black text-slate-900"> {removePrompt.subjectName} </span>
                            from this batch?
                        </div>

                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-3 py-2 text-xs font-bold rounded-md border border-slate-200 text-slate-600 hover:bg-white"
                                onClick={closeRemovePrompt}
                                disabled={loading.remove}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="px-3 py-2 text-xs font-black rounded-md border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 inline-flex items-center gap-2"
                                onClick={handleRemoveSubject}
                                disabled={loading.remove}
                            >
                                {loading.remove ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ERPLayout>
    );
};

export default SubjectsPage;
