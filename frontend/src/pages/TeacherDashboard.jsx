import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import authApi from '../api/authApi';
import { clearClientSession } from '../utils/authSession';
import { Bell, LayoutDashboard, LogOut, Menu, Search, X, CheckCircle2 } from 'lucide-react';
import { TEACHER_API_BASE_URL, attachAuthToken } from '../api/apiConfig';

const teacherApiClient = attachAuthToken(axios.create({
    baseURL: `${TEACHER_API_BASE_URL}/api`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
}));

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [teacher] = useState(JSON.parse(localStorage.getItem('teacher') || '{}'));
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mini, setMini] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profileRes = await teacherApiClient.get('/teacher/profile');
                setProfileData(profileRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleLogout = async () => {
        try {
            await authApi.teacherLogout();
        } catch (_error) {
            // Clear client session even if the network request fails.
        }
        clearClientSession();
        navigate('/portal');
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside
                className={`bg-white border-r border-gray-200 transition-all duration-300 ${mini ? 'w-16' : 'w-60'} ${mobileOpen ? 'block' : 'hidden md:block'}`}
            >
                <div className="p-5 flex items-center gap-3 border-b">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">T</div>
                    {!mini && <span className="font-bold text-gray-800">Teacher Portal</span>}
                </div>

                <div className="p-4 space-y-1">
                    <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm bg-indigo-50 text-indigo-600">
                        <LayoutDashboard size={18} />
                        {!mini && 'Overview'}
                    </button>
                </div>

                <div className="absolute bottom-5 w-full px-4">
                    <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 text-sm">
                        <LogOut size={18} />
                        {!mini && 'Log Out'}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col">
                <header className="bg-white border-b px-6 py-3 flex justify-between items-center">
                    <button
                        onClick={() => {
                            if (window.innerWidth < 768) setMobileOpen(!mobileOpen);
                            else setMini(!mini);
                        }}
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <h1 className="font-semibold text-gray-800">Teacher Dashboard</h1>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-gray-100 px-3 py-1 rounded-lg">
                            <Search size={16} className="text-gray-500" />
                            <input className="bg-transparent outline-none ml-2 text-sm" placeholder="Search" />
                        </div>

                        <Bell size={20} className="text-gray-600" />

                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">T</div>
                            <div className="hidden md:flex flex-col text-xs">
                                <span>{teacher.name}</span>
                                <span className="text-gray-500">{teacher.regNo}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-6">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold">Hi, {teacher.name}</h2>
                                <p className="text-gray-500">Welcome to your dashboard</p>
                            </div>
                            <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded">ID: {teacher.regNo}</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white border rounded-xl shadow-sm p-6">
                                <div className="flex items-center gap-2 font-semibold text-slate-800">
                                    <CheckCircle2 size={18} className="text-green-500" />
                                    Profile Status
                                </div>
                                <p className="mt-4 text-3xl font-black text-slate-900">
                                    {profileData?.teacher?.status === 'active' ? 'Active' : 'Inactive'}
                                </p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Faculty profile access is currently limited to core account information.
                                </p>
                            </div>

                            <div className="bg-white border rounded-xl shadow-sm p-6">
                                <div className="font-semibold text-slate-800">Contact Details</div>
                                <div className="mt-4 space-y-2 text-sm text-slate-600">
                                    <div>Email: {profileData?.teacher?.email || 'Not added'}</div>
                                    <div>Phone: {profileData?.teacher?.phone || 'Not added'}</div>
                                </div>
                                {loading && <p className="mt-3 text-xs text-slate-400">Loading profile...</p>}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default TeacherDashboard;
