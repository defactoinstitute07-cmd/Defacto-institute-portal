import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import { clearClientSession } from '../utils/authSession';
import {
    BarChart3,
    Bell,
    BookOpen,
    Building2,
    ClipboardCheck,
    Download,
    GraduationCap,
    LogOut,
    Menu,
    Settings,
    Trophy,
    UserCircle,
    Users2,
    Wallet,
    X
} from 'lucide-react';

const NAV_ITEMS = [
    {
        section: 'Overview',
        items: [
            { to: '/dashboard', icon: BarChart3, label: 'Dashboard' }
        ]
    },
    {
        section: 'Academics',
        items: [
            { to: '/students', icon: GraduationCap, label: 'Students' },
            { to: '/batches', icon: BookOpen, label: 'Batches' },
            { to: '/subjects', icon: BookOpen, label: 'Subjects' },
            { to: '/teachers', icon: Users2, label: 'Teachers' },
            { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
            { to: '/exams', icon: Trophy, label: 'Exams & Results' }
        ]
    },
    {
        section: 'Finance',
        items: [
            { to: '/fees', icon: Wallet, label: 'Fee Management' }
        ]
    },
    {
        section: 'Admin',
        items: [
            { to: '/profile', icon: UserCircle, label: 'Institute Profile' },
            // { to: '/templates', icon: Mail, label: 'Email Templates' },
            { to: '/notifications', icon: Bell, label: 'Notifications' },
            { to: '/apk-management', icon: Download, label: 'App Management' },
            { to: '/settings', icon: Settings, label: 'Settings' }
        ]
    }
];

const getGreeting = (date) => {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
};

const ERPLayout = ({ children, title }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mini, setMini] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const adminRaw = localStorage.getItem('admin') || '{}';
    const admin = JSON.parse(adminRaw);
    const adminName = admin.adminName || 'John';
    const instituteName = admin.coachingName || 'Hi Tech.';
    const profileInitial = adminName.charAt(0).toUpperCase();

    const logout = async () => {
        try {
            await authApi.adminLogout();
        } catch (_error) {
            // Clear client session even if the network request fails.
        }
        clearClientSession();
        navigate('/login');
    };

    useEffect(() => {
        if (admin.themeColors && admin.themeColors.length >= 2) {
            document.documentElement.style.setProperty('--erp-primary', admin.themeColors[0]);
            document.documentElement.style.setProperty('--erp-secondary', admin.themeColors[1]);
        }
    }, [adminRaw]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, []);

    const greeting = getGreeting(now);
    const formattedDate = now.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="erp-shell">
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} style={{ display: 'block' }} />
            )}

            <nav className={`sidebar ${mini ? 'mini' : ''} ${mobileOpen ? 'open' : ''}`}>
                <div className="flex items-center gap-3 px-2 py-3 overflow-hidden">
                    {/* Logo Icon Container */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl overflow-hidden border-[1.5px] border-yellow-500/60 shadow-lg bg-[#0a1120] flex items-center justify-center">
                        {admin?.instituteLogo ? (
                            <img
                                src={admin.instituteLogo}
                                alt="Defacto Institute Logo"
                                className="w-full h-full object-cover"
                                onError={(event) => {
                                    event.target.style.display = 'none';
                                    // Reverts to the default 'DF' fallback if image fails to load
                                    event.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}

                        {/* Fallback Icon (Shows if no logo or if logo fails to load) */}
                        <div
                            className="w-full h-full flex flex-col items-center justify-center"
                            style={{ display: admin?.instituteLogo ? 'none' : 'flex' }}
                        >
                            <span className="text-white font-black text-xl tracking-tighter leading-none relative z-10">DF</span>
                            {/* Subtle gold triangle accent mimicking your logo */}
                            <div className="absolute w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-yellow-500/20 -mb-4"></div>
                        </div>
                    </div>

                    {/* Brand Text Container (Hidden when sidebar is collapsed/mini) */}
                    {!mini && (
                        <div className="flex flex-col justify-center whitespace-nowrap">
                            {/* Main "Defacto" Text */}
                            <span
                                className="text-3xl font-black tracking-tight leading-none"
                                style={{
                                    color: '#FACC15', // Tailwind's yellow-400
                                    WebkitTextStroke: '1px #0f172a', // Dark outline to match the image
                                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                Defacto
                            </span>

                            {/* Subtitle Text */}
                            <span className="text-[11px] font-black text-slate-900 tracking-wider mt-0.5 uppercase">
                                Institute <span className="text-slate-400 mx-1">|</span> BHANIYAWALA
                            </span>
                        </div>
                    )}
                </div>

                <div className="sb-nav">
                    {NAV_ITEMS.map((group) => (
                        <div key={group.section}>
                            {!mini && <div className="sb-section-label">{group.section}</div>}
                            {group.items.map(({ to, icon: Icon, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`sb-item ${location.pathname === to ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                    title={mini ? label : undefined}
                                >
                                    <span className="sb-item-icon"><Icon size={18} /></span>
                                    {!mini && <span className="sb-item-label">{label}</span>}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="sb-footer">


                    <div className="sb-item" onClick={logout} style={{ cursor: 'pointer' }} title={mini ? 'Sign out' : undefined}>
                        <span className="sb-item-icon"><LogOut size={18} /></span>
                        {!mini && <span className="sb-item-label sing-out">Sign out</span>}
                    </div>


                </div>
            </nav>

            <div className="erp-body">
                <header className="topbar">
                    <div className="topbar-start">
                        <button
                            className="tb-hamburger"
                            onClick={() => {
                                if (window.innerWidth <= 768) {
                                    setMobileOpen((open) => !open);
                                } else {
                                    setMini((value) => !value);
                                }
                            }}
                        >
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>

                        <div className="topbar-route">
                            <span className="topbar-route-label">{title}</span>
                            <div className="tb-title">{greeting}, {adminName}</div>
                            <div className="topbar-route-subtitle">
                                {formattedDate} - here's what's happening today
                            </div>
                        </div>
                    </div>



                    <div className="tb-right">




                        <div className="shell-profile" title={adminName}>
                            <div className="tb-avatar">{profileInitial}</div>
                            <div className="shell-profile-copy hide-mobile">
                                <span className="shell-profile-name">{adminName}</span>
                                <span className="shell-profile-role">Admin</span>
                            </div>

                        </div>
                    </div>
                </header>

                <main className="erp-main">
                    <div className="page-content">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ERPLayout;
