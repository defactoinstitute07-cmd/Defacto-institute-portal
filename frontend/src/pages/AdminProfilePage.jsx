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
        adminName: '',
        coachingName: '',
        email: '',
        phone: '',
        bio: '',
        registrationNumber: '',
        roomsAvailable: '',
        themeColor1: '#1b3a7a',
        themeColor2: '#c53030',
        classesOffered: '',
        instituteAddress: '',
        instituteEmail: '',
        institutePhone: ''
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

        } catch {
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

            setProfile(data.admin);
            setEditMode(false);

            setAlert({
                type: 'success',
                text: 'Profile updated successfully!'
            });

        } catch (err) {

            setAlert({
                type: 'error',
                text: err.response?.data?.message || 'Update failed.'
            });

        } finally {
            setSubmitting(false);
        }
    };

    if (loading)
        return (
            <ERPLayout title="Admin Profile">
                <div className="flex flex-col justify-center items-center h-64 gap-3">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading profile...</p>
                </div>
            </ERPLayout>
        );

    return (
        <ERPLayout title="Admin Profile">

            <div className="max-w-6xl mx-auto px-4 py-6">

                {alert &&
                    <AlertMessage
                        type={alert.type}
                        message={alert.text}
                        onClose={() => setAlert(null)}
                    />
                }

                <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">

                    {/* HEADER */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-12">

                        <div className="flex justify-between items-center">

                            <div className="text-white">
                                <h2 className="text-2xl font-bold uppercase tracking-wide">
                                    {editMode ? "Edit Profile" : "Admin Profile"}
                                </h2>

                                <p className="text-xs text-slate-400 mt-1">
                                    System ID: {profile?._id?.slice(-8)}
                                </p>
                            </div>

                            {!editMode ? (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg text-white text-xs font-semibold shadow"
                                >
                                    <Pencil size={14} />
                                    Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">

                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-5 py-2 rounded-lg text-white text-xs font-semibold"
                                    >
                                        <X size={14} />
                                        Cancel
                                    </button>

                                    <button
                                        form="profile-form"
                                        type="submit"
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-lg text-white text-xs font-semibold shadow"
                                    >
                                        {submitting ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Save size={14} />
                                        )}
                                        Save
                                    </button>

                                </div>
                            )}

                        </div>

                    </div>

                    {/* PROFILE */}
                    <div className="px-8 -mt-10 relative z-10 flex items-end gap-4">

                        <div className="relative">

                            <div className="w-28 h-28 bg-white rounded-lg border shadow flex items-center justify-center overflow-hidden">

                                {logoPreview ? (
                                    <img src={logoPreview} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-slate-400">
                                        {(profile?.adminName || "A")[0]}
                                    </span>
                                )}

                            </div>

                            {editMode && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-blue-600 p-2 text-white rounded-lg shadow"
                                >
                                    <Camera size={14} />
                                </button>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleLogoChange}
                            />

                        </div>

                        <div className="pb-3">

                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                {profile?.adminName}
                                <BadgeCheck size={18} className="text-blue-500" />
                            </h3>

                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
                                {profile?.coachingName}
                            </p>

                        </div>

                    </div>

                    {/* BODY */}
                    <div className="p-8">

                        {!editMode ? (

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                                <InfoBlock icon={<Mail />} label="Admin Email" value={profile?.email} />
                                <InfoBlock icon={<Mail />} label="Institute Email" value={profile?.instituteEmail} />
                                <InfoBlock icon={<Phone />} label="Admin Phone" value={profile?.phone} />
                                <InfoBlock icon={<Phone />} label="Institute Phone" value={profile?.institutePhone} />
                                <InfoBlock icon={<FileDigit />} label="Registration ID" value={profile?.registrationNumber} />
                                <InfoBlock icon={<Home />} label="Rooms Available" value={profile?.roomsAvailable} />

                                <InfoBlock
                                    icon={<MapPin />}
                                    label="Institute Address"
                                    value={profile?.instituteAddress}
                                    full
                                />

                            </div>

                        ) : (

                            <form
                                id="profile-form"
                                onSubmit={handleSaveRequest}
                                className="grid md:grid-cols-2 gap-6"
                            >

                                <FormInput
                                    label="Admin Name"
                                    name="adminName"
                                    value={form.adminName}
                                    onChange={handle}
                                />

                                <FormInput
                                    label="Institute Name"
                                    name="coachingName"
                                    value={form.coachingName}
                                    onChange={handle}
                                />

                                <FormInput
                                    label="Admin Email"
                                    name="email"
                                    value={form.email}
                                    onChange={handle}
                                />

                                <FormInput
                                    label="Institute Email"
                                    name="instituteEmail"
                                    value={form.instituteEmail}
                                    onChange={handle}
                                />

                                <FormInput
                                    label="Admin Phone"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handle}
                                />

                                <FormInput
                                    label="Institute Phone"
                                    name="institutePhone"
                                    value={form.institutePhone}
                                    onChange={handle}
                                />

                                <FormInput
                                    label="Rooms Available"
                                    name="roomsAvailable"
                                    value={form.roomsAvailable}
                                    onChange={handle}
                                />

                                <FormInput
                                    label="Registration Number"
                                    name="registrationNumber"
                                    value={form.registrationNumber}
                                    onChange={handle}
                                />

                                <div className="md:col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">
                                        Institute Address
                                    </label>

                                    <textarea
                                        name="instituteAddress"
                                        value={form.instituteAddress}
                                        onChange={handle}
                                        className="w-full border border-slate-200 rounded-md p-3 text-sm"
                                    />
                                </div>

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
                description="Enter admin password to confirm these updates."
                actionType="verify"
                loading={submitting}
            />

        </ERPLayout>
    );
};

// COMPONENTS

const InfoBlock = ({ icon, label, value, full }) => (
    <div className={`${full ? "md:col-span-2 lg:col-span-3" : ""} space-y-1`}>
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold tracking-widest">
            {React.cloneElement(icon, { size: 14 })}
            {label}
        </div>
        <p className="text-sm font-semibold text-slate-800">{value || "N/A"}</p>
    </div>
);

const FormInput = ({ label, ...props }) => (
    <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">
            {label}
        </label>

        <input
            {...props}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
        />
    </div>
);

export default AdminProfilePage;