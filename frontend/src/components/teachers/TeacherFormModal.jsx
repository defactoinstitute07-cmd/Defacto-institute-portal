import React, { useRef, useState } from 'react';
import { BookOpen, Check, Loader2, Upload, User, X } from 'lucide-react';
import ActionModal from '../common/ActionModal';
import apiClient from '../../api/apiConfig';

const TeacherFormModal = ({ mode, teacher, toast, onSave, onClose, imgSrc }) => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const formContainerRef = useRef(null);
    const [pwdModal, setPwdModal] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    const [name, setName] = useState(teacher?.name || '');
    const [dob, setDob] = useState(teacher?.dob?.slice(0, 10) || '');
    const [gender, setGender] = useState(teacher?.gender || 'Male');
    const [phone, setPhone] = useState(teacher?.phone || '');
    const [email, setEmail] = useState(teacher?.email || '');
    const [joiningDate, setJoiningDate] = useState(teacher?.joiningDate?.slice(0, 10) || '');
    const [password, setPassword] = useState('');
    const [imgFile, setImgFile] = useState(null);
    const [imgPreview, setImgPreview] = useState(teacher?.profileImage ? imgSrc(teacher.profileImage) : null);

    const fileRef = useRef(null);

    const pickImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImgFile(file);
        const reader = new FileReader();
        reader.onload = (loadEvent) => setImgPreview(loadEvent.target?.result || null);
        reader.readAsDataURL(file);
    };

    const buildFormData = () => {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('dob', dob);
        formData.append('gender', gender);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('joiningDate', joiningDate);
        if (password) formData.append('password', password);

        if (imgFile) formData.append('profileImage', imgFile);
        return formData;
    };

    const createTeacher = async () => {
        setSaving(true);
        setError('');
        try {
            await apiClient.post('/teachers', buildFormData(), { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Teacher "${name}" registered successfully`);
            onSave();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const updateTeacher = async (adminPassword) => {
        setPwdLoading(true);
        setPwdError('');
        try {
            const formData = buildFormData();
            formData.append('adminPassword', adminPassword);
            await apiClient.put(`/teachers/${teacher._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Records updated for ${name}`);
            setPwdModal(false);
            onSave();
        } catch (requestError) {
            setPwdError(requestError.response?.data?.message || 'Update failed');
        } finally {
            setPwdLoading(false);
        }
    };

    const showError = (msg) => {
        setError(msg);
        formContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!name.trim()) {
            showError('Full name is required');
            return;
        }

        setError('');
        if (mode === 'create') createTeacher();
        else {
            setPwdModal(true);
            setPwdError('');
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-900/70 backdrop-blur-sm p-4 md:p-6">
            <div className="mx-auto h-full max-w-4xl rounded-xl bg-slate-50 shadow-2xl flex flex-col overflow-hidden">
                <header className="bg-slate-900 text-white px-4 md:px-8 py-4 md:py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                            <BookOpen size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-extrabold truncate">
                                {mode === 'edit' ? 'Update Teacher' : 'New Faculty'}
                            </h2>
                            <p className="text-xs md:text-sm text-white/80 truncate">
                                {mode === 'edit' ? `ID: ${teacher?.regNo || '--'}` : 'Teacher onboarding'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-xs font-bold"
                    >
                        <X size={14} /> Close
                    </button>
                </header>

                <div ref={formContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8">
                    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 md:p-6 space-y-6">
                        {error && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-sm font-semibold px-4 py-3">
                                {error}
                            </div>
                        )}

                        <section className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                    {imgPreview ? (
                                        <img src={imgPreview} alt="Teacher" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={42} className="text-slate-300" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-md bg-[var(--erp-primary)] text-white flex items-center justify-center"
                                    >
                                        <Upload size={14} />
                                    </button>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Faculty Portrait</h4>
                                    <p className="text-sm text-slate-500">Upload a clear profile image.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="space-y-1">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Full Name *</span>
                                    <input className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm" value={name} onChange={(event) => setName(event.target.value)} required />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Gender</span>
                                    <select className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm" value={gender} onChange={(event) => setGender(event.target.value)}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </label>
                                <label className="space-y-1">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Date Of Birth</span>
                                    <input type="date" className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm" value={dob} onChange={(event) => setDob(event.target.value)} />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Official Email</span>
                                    <input type="email" className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm" value={email} onChange={(event) => setEmail(event.target.value)} />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Phone Number *</span>
                                    <input className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Joining Date</span>
                                    <input type="date" className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm" value={joiningDate} onChange={(event) => setJoiningDate(event.target.value)} />
                                </label>
                                {mode === 'edit' && (
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold text-slate-600 uppercase">New Password</span>
                                        <input type="password" placeholder="Leave empty to keep current" className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
                                    </label>
                                )}
                            </div>
                        </section>

                        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:justify-between">
                            <button type="button" onClick={onClose} className="h-11 px-5 rounded-lg border border-slate-300 text-slate-600 text-sm font-bold">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="h-11 px-6 rounded-lg bg-[var(--erp-primary)] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2">
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                {mode === 'edit' ? 'Update Teacher' : 'Create Teacher'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <ActionModal
                isOpen={pwdModal}
                onClose={() => setPwdModal(false)}
                onConfirm={updateTeacher}
                title="Authorization Required"
                description={`You are updating records for "${name}". Enter admin password to continue.`}
                actionType="verify"
                loading={pwdLoading}
                error={pwdError}
            />
        </div>
    );
};

export default TeacherFormModal;
