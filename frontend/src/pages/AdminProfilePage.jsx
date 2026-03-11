import React, { useState, useEffect, useRef } from 'react';
import ERPLayout from '../components/ERPLayout';
import { getAdminProfile, updateAdminProfile } from '../api/adminApi';
import {
    User, School, Mail, Phone, FileDigit, Home, Palette, BookOpen,
    Loader2, ShieldCheck, Pencil, X, Save, Camera, BadgeCheck, MapPin
} from 'lucide-react';
import ActionModal from '../components/common/ActionModal';
import AlertMessage from '../components/common/AlertMessage';

const AdminProfilePage = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({
        adminName: '', coachingName: '', email: '', phone: '', bio: '',
        registrationNumber: '', roomsAvailable: '',
        themeColor1: '#1b3a7a', themeColor2: '#c53030', classesOffered: '',
        instituteAddress: '', instituteEmail: '', institutePhone: ''
    });
    const [logoPreview, setLogoPreview] = useState('');
    const [logoFile, setLogoFile] = useState(null);

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await getAdminProfile();
            setProfile(data);
            setForm({
                adminName: data.adminName || '',
                coachingName: data.coachingName || '',
                email: data.email || '',
                phone: data.phone || '',
                bio: data.bio || '',
                registrationNumber: data.registrationNumber || '',
                roomsAvailable: data.roomsAvailable || '',
                themeColor1: data.themeColors?.[0] || '#1b3a7a',
                themeColor2: data.themeColors?.[1] || '#c53030',
                classesOffered: (data.classesOffered || []).join(', '),
                instituteAddress: data.instituteAddress || '',
                instituteEmail: data.instituteEmail || '',
                institutePhone: data.institutePhone || ''
            });
            setLogoPreview(data.instituteLogo || '');
        } catch (err) {
            setAlert({ type: 'error', text: 'Failed to load profile details.' });
        } finally {
            setLoading(false);
        }
    };

    const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        fetchProfile();
    };

    const handleSaveRequest = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const confirmUpdate = async (password) => {
        setShowConfirm(false);
        setSubmitting(true);
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (key !== 'themeColor1' && key !== 'themeColor2') {
                    formData.append(key, form[key]);
                }
            });
            formData.append('adminPassword', password);
            formData.append('themeColors', JSON.stringify([form.themeColor1, form.themeColor2]));
            if (logoFile) formData.append('instituteLogo', logoFile);

            const { data } = await updateAdminProfile(formData);
            document.documentElement.style.setProperty('--erp-primary', form.themeColor1);
            document.documentElement.style.setProperty('--erp-secondary', form.themeColor2);
            localStorage.setItem('admin', JSON.stringify(data.admin));

            setProfile(data.admin);
            setEditMode(false);
            setAlert({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setAlert({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <ERPLayout title="Admin Profile">
            <div className="flex flex-col justify-center items-center h-64 gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initialising...</p>
            </div>
        </ERPLayout>
    );

    return (
        <ERPLayout title="Admin Profile">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {alert && <AlertMessage type={alert.type} message={alert.text} onClose={() => setAlert(null)} />}

                <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">

                    {/* Header Banner */}
                    <div className="bg-slate-900 px-6 py-10 sm:px-10 sm:py-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent" />
                        <ShieldCheck className="absolute -right-8 -bottom-8 text-white/5 w-48 h-48" />

                        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="text-white">
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">
                                    {editMode ? 'Edit Configuration' : 'Admin Profile'}
                                </h2>
                                <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
                                    System ID: {profile?._id?.slice(-8).toUpperCase() || 'ROOT_ADMIN'}
                                </p>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                {!editMode ? (
                                    <button onClick={() => setEditMode(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors">
                                        <Pencil size={14} /> Edit
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleCancel} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors">
                                            <X size={14} /> Cancel
                                        </button>
                                        <button type="submit" form="profile-form" className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-emerald-900/20">
                                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            Save
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Profile Section Overlay */}
                    <div className="px-6 sm:px-10 -mt-8 relative z-20">
                        <div className="flex flex-col sm:flex-row items-end gap-5">
                            <div className="relative inline-block">
                                <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-1 rounded-md border border-slate-200 shadow-md">
                                    <div className="w-full h-full bg-slate-50 rounded-md flex items-center justify-center overflow-hidden">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" onError={() => setLogoPreview('')} />
                                        ) : (
                                            <span className="text-4xl font-bold text-slate-300">{(profile?.adminName || 'A')[0]}</span>
                                        )}
                                    </div>
                                </div>
                                {editMode && (
                                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-blue-600 p-2 text-white rounded-md border-2 border-white shadow-lg hover:bg-blue-700 transition-colors">
                                        <Camera size={14} />
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleLogoChange} />
                            </div>
                            <div className="pb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{profile?.adminName}</h3>
                                    <BadgeCheck size={18} className="text-blue-500" />
                                </div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{profile?.coachingName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 sm:p-10 pt-10">
                        {!editMode ? (
                            <div className="space-y-8">
                                <section className="rounded-md border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Contact Management</p>
                                            <h4 className="text-sm font-bold text-slate-900">Admin and institute phone lines</h4>
                                            <p className="text-sm text-slate-500 mt-1">Keep the admin direct number and the institute public number separate so both can be updated cleanly.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditMode(true)}
                                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors"
                                        >
                                            <Pencil size={14} />
                                            Update Numbers
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                                        <ContactPanel
                                            icon={<Phone />}
                                            label="Admin Phone Number"
                                            value={profile?.phone}
                                            emptyText="No admin phone number added yet"
                                        />
                                        <ContactPanel
                                            icon={<Phone />}
                                            label="Institute Phone Number"
                                            value={profile?.institutePhone}
                                            emptyText="No institute phone number added yet"
                                        />
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InfoBlock icon={<Mail />} label="Admin Email" value={profile?.email} />
                                    <InfoBlock icon={<Mail />} label="Institute Email" value={profile?.instituteEmail} />
                                    <InfoBlock icon={<FileDigit />} label="License ID" value={profile?.registrationNumber} />
                                    <InfoBlock icon={<Home />} label="Terminal Rooms" value={profile?.roomsAvailable} />
                                    <InfoBlock icon={<MapPin />} label="Institute Address" value={profile?.instituteAddress} full />

                                    <div className="md:col-span-2 lg:col-span-3 pt-6 border-t border-slate-100 mt-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Brand Palette</p>
                                        <div className="flex flex-wrap gap-4">
                                            <ColorChip label="Primary" color={form.themeColor1} />
                                            <ColorChip label="Secondary" color={form.themeColor2} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form id="profile-form" onSubmit={handleSaveRequest} className="space-y-6">
                                <section className="rounded-md border border-slate-200 p-5 sm:p-6">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Identity</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormInput label="Admin Name" name="adminName" value={form.adminName} onChange={handle} />
                                        <FormInput label="Institute Name" name="coachingName" value={form.coachingName} onChange={handle} />
                                    </div>
                                </section>

                                <section className="rounded-md border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                                    <div className="mb-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Contact Numbers</p>
                                        <h4 className="text-sm font-bold text-slate-900">Add or update phone numbers</h4>
                                        <p className="text-sm text-slate-500 mt-1">Use the admin number for direct account contact and the institute number for public-facing communication.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormInput label="Admin Phone Number" name="phone" value={form.phone} onChange={handle} type="tel" placeholder="+91 98765 43210" />
                                        <FormInput label="Institute Phone Number" name="institutePhone" value={form.institutePhone} onChange={handle} type="tel" placeholder="+91 98765 43210" />
                                        <FormInput label="Admin Email" name="email" value={form.email} onChange={handle} type="email" placeholder="admin@institute.com" />
                                        <FormInput label="Institute Email" name="instituteEmail" value={form.instituteEmail} onChange={handle} type="email" placeholder="info@institute.com" />
                                    </div>
                                </section>

                                <section className="rounded-md border border-slate-200 p-5 sm:p-6">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Operations</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormInput label="Rooms Available" name="roomsAvailable" value={form.roomsAvailable} onChange={handle} type="number" />
                                        <FormInput label="Registry ID" name="registrationNumber" value={form.registrationNumber} onChange={handle} />
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Institute Address</label>
                                            <textarea className="w-full bg-slate-50 border border-slate-200 p-3 text-sm font-medium rounded-md focus:border-blue-500 outline-none transition-all min-h-[88px]" name="instituteAddress" value={form.instituteAddress} onChange={handle} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Short Biography</label>
                                            <textarea className="w-full bg-slate-50 border border-slate-200 p-3 text-sm font-medium rounded-md focus:border-blue-500 outline-none transition-all min-h-[100px]" name="bio" value={form.bio} onChange={handle} />
                                        </div>
                                    </div>
                                </section>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <ActionModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmUpdate}
                title="Verify Changes"
                description="Enter admin password to confirm these system-wide updates."
                actionType="verify"
                loading={submitting}
            />
        </ERPLayout>
    );
};

// UI Components
const InfoBlock = ({ icon, label, value, full }) => (
    <div className={`${full ? 'md:col-span-2 lg:col-span-3' : ''} space-y-1`}>
        <div className="flex items-center gap-1.5 text-slate-400">
            {React.cloneElement(icon, { size: 13 })}
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-sm font-bold text-slate-800 break-words">{value || 'N/A'}</p>
    </div>
);

const ContactPanel = ({ icon, label, value, emptyText }) => (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
            {React.cloneElement(icon, { size: 14 })}
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-sm font-bold text-slate-800 break-words">{value || emptyText}</p>
    </div>
);

const FormInput = ({ label, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{label}</label>
        <input {...props} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm font-bold text-slate-800 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all" />
    </div>
);

const ColorChip = ({ label, color }) => (
    <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-md min-w-[140px]">
        <div className="w-5 h-5 rounded-sm shadow-sm border border-black/5" style={{ backgroundColor: color }} />
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">{label}</p>
            <p className="text-[11px] font-mono font-bold text-slate-700 leading-none">{color}</p>
        </div>
    </div>
);

export default AdminProfilePage;
