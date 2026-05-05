import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Users, GraduationCap, ChevronRight, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../../api/apiConfig';

const GenerateFeesModal = ({ batches, monthOptions, onClose, onSave }) => {
    const defaultMonth = monthOptions[new Date().getMonth()];
    const defaultYear = String(new Date().getFullYear());
    
    const monthIdx = monthOptions.indexOf(defaultMonth);
    const nextMonth = new Date(Number(defaultYear), monthIdx + 1, 10);
    const defaultDueDate = nextMonth.toISOString().split('T')[0];

    const [scope, setScope] = useState('all'); 
    const [selectedClassId, setSelectedClassId] = useState('');
    const [month, setMonth] = useState(defaultMonth);
    const [year, setYear] = useState(defaultYear);
    const [dueDate, setDueDate] = useState(defaultDueDate);
    
    const [generatedIds, setGeneratedIds] = useState([]);
    const [loadingStatus, setLoadingStatus] = useState(false);

    const fetchStatus = useCallback(async (m, y) => {
        setLoadingStatus(true);
        try {
            const { data } = await apiClient.get(`/fees/generation-status?month=${m}&year=${y}`);
            setGeneratedIds(data.generatedBatchIds || []);
        } catch (err) {
            console.error('Failed to fetch generation status:', err);
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus(month, year);
        
        // Auto-set due date to the 10th of the NEXT month relative to the selected month
        const mIdx = monthOptions.indexOf(month);
        if (mIdx !== -1) {
            // Setting month to mIdx + 1 automatically handles year rollover in JS Date
            const date = new Date(Number(year), mIdx + 1, 10);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            setDueDate(`${y}-${m}-10`);
        }
    }, [month, year, fetchStatus, monthOptions]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let className = 'All Students';
        if (scope === 'class' && selectedClassId) {
            const batch = batches.find(b => String(b._id) === String(selectedClassId));
            if (batch) className = batch.name;
        }

        onSave({
            month,
            year,
            dueDate,
            batchId: scope === 'all' ? 'all' : selectedClassId,
            batchName: className
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] w-full max-w-[540px] overflow-hidden border border-slate-100 flex flex-col transform transition-all animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="relative p-8 bg-[#0f172a] text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                                <Calendar className="w-7 h-7 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight leading-none">Bulk Fee Generation</h2>
                                <p className="text-slate-400 text-sm font-medium mt-1.5">Configure and issue student fee records</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <form id="generateFeeForm" onSubmit={handleSubmit} className="space-y-8">
                        
                        <div className="grid grid-cols-2 gap-6">
                            {/* Billing Period */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Billing Period</label>
                                <div className="flex gap-2.5">
                                    <div className="relative flex-1 group">
                                        <select value={month} onChange={(e) => setMonth(e.target.value)} 
                                            className="w-full pl-4 pr-10 py-4 rounded-[20px] border-2 border-slate-100 bg-slate-50/50 font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer">
                                            {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                                    </div>
                                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)} min="2020" max="2050" required 
                                        className="w-24 px-4 py-4 rounded-[20px] border-2 border-slate-100 bg-slate-50/50 font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all text-center" />
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Due Date</label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required 
                                        className="w-full pl-14 pr-6 py-4 rounded-[20px] border-2 border-slate-100 bg-slate-50/50 font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Scope Selection */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Issuance Range</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setScope('all')} 
                                    className={`relative p-6 rounded-3xl border-2 text-left transition-all duration-300 ${scope === 'all' ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                    <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all ${scope === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div className="font-extrabold text-slate-900 text-lg">All Students</div>
                                    <div className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Issue to every active student</div>
                                    {scope === 'all' && <div className="absolute top-6 right-6 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 border-2 border-white animate-in zoom-in duration-300"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                                </button>

                                <button type="button" onClick={() => setScope('class')} 
                                    className={`relative p-6 rounded-3xl border-2 text-left transition-all duration-300 ${scope === 'class' ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                    <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all ${scope === 'class' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                                        <GraduationCap className="w-6 h-6" />
                                    </div>
                                    <div className="font-extrabold text-slate-900 text-lg">Specific Class</div>
                                    <div className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Issue only to a selected class</div>
                                    {scope === 'class' && <div className="absolute top-6 right-6 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 border-2 border-white animate-in zoom-in duration-300"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                                </button>
                            </div>
                        </div>

                        {/* Class Dropdown - Now showing status */}
                        {scope === 'class' && (
                            <div className="space-y-3 animate-in slide-in-from-top-4 fade-in duration-400">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Target Class *</label>
                                    {loadingStatus && <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</div>}
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <select required value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} 
                                        className="w-full pl-14 pr-12 py-4.5 rounded-[20px] border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all appearance-none font-bold text-slate-800 outline-none cursor-pointer">
                                        <option value="">-- Choose Class --</option>
                                        {batches.map(b => {
                                            const isGenerated = generatedIds.includes(b._id);
                                            return (
                                                <option key={b._id} value={b._id} style={{ color: isGenerated ? '#059669' : 'inherit', fontWeight: isGenerated ? 'bold' : 'normal' }}>
                                                    {b.name} {isGenerated ? '(✓ Generated)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90" />
                                </div>
                                
                                {selectedClassId && generatedIds.includes(selectedClassId) && (
                                    <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-[11px] font-bold animate-in zoom-in duration-300">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>Fee records already exist for this class. Re-generating will skip existing records.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer Section */}
                <div className="p-8 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 flex items-center justify-between">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all uppercase tracking-widest">
                        Cancel
                    </button>
                    <button type="submit" form="generateFeeForm" 
                        className="group flex items-center gap-3 px-10 py-4.5 bg-[#0f172a] text-white rounded-[20px] font-black shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                        <span className="text-base tracking-tight">Generate Records</span>
                        <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenerateFeesModal;
