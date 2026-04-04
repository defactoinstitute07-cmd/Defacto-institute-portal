import React, { useEffect, useState } from 'react';
import { Activity, Database, HardDrive, Layers, Loader2, RefreshCw } from 'lucide-react';
import { getDatabaseStorageStats } from '../../api/adminApi';

const DatabaseStorageCard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadStats = async () => {
        setLoading(true);
        setError('');

        try {
            const { data } = await getDatabaseStorageStats();
            setStats(data);
        } catch (loadError) {
            setError(loadError.response?.data?.message || 'Failed to load database storage details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const usagePercentage = Number(stats?.usagePercentage) || 0;
    const isHighUsage = usagePercentage >= 80;

    return (
        <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    marginBottom: 24,
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: 16
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8 }}>
                        <Database size={24} color="#2563eb" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>MongoDB Atlas Storage</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            Track storage usage and stored data directly from your Atlas database.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={loadStats}
                    disabled={loading}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        color: '#334155',
                        borderRadius: 8,
                        padding: '8px 12px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 600
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    Refresh
                </button>
            </div>

            {loading && !stats ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Loader2 size={24} className="spin" color="#64748b" />
                </div>
            ) : error ? (
                <div
                    style={{
                        padding: 16,
                        borderRadius: 10,
                        border: '1px solid #fecaca',
                        background: '#fff1f2',
                        color: '#b91c1c',
                        fontSize: '0.9rem',
                        fontWeight: 600
                    }}
                >
                    {error}
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 16,
                            marginBottom: 24
                        }}
                    >
                        <StatCard
                            icon={Activity}
                            label="Data Stored"
                            value={`${stats?.dataSizeMB || 0} MB`}
                            tone="#2563eb"
                        />
                        <StatCard
                            icon={HardDrive}
                            label="Storage Used"
                            value={`${stats?.storageSizeMB || 0} MB`}
                            tone="#7c3aed"
                        />
                        <StatCard
                            icon={Layers}
                            label="Collections"
                            value={String(stats?.collections || 0)}
                            tone="#0f766e"
                        />
                    </div>

                    <div
                        style={{
                            padding: 20,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 16,
                                marginBottom: 12,
                                flexWrap: 'wrap'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Storage Usage
                                </div>
                                <div style={{ marginTop: 4, fontSize: '0.9rem', color: '#475569' }}>
                                    {stats?.storageSizeMB || 0} MB of {stats?.atlasLimitMB || 512} MB
                                </div>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isHighUsage ? '#dc2626' : '#0f172a' }}>
                                {usagePercentage}%
                            </div>
                        </div>

                        <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${usagePercentage}%`,
                                    height: '100%',
                                    background: isHighUsage
                                        ? 'linear-gradient(90deg, #ef4444, #fb7185)'
                                        : 'linear-gradient(90deg, #2563eb, #60a5fa)',
                                    borderRadius: 999,
                                    transition: 'width 300ms ease'
                                }}
                            />
                        </div>

                        <p style={{ margin: '12px 0 0', fontSize: '0.82rem', color: isHighUsage ? '#b91c1c' : '#64748b', lineHeight: 1.6 }}>
                            {isHighUsage
                                ? 'Storage usage is getting high. Consider pruning old data or upgrading your Atlas tier soon.'
                                : 'Storage usage is within a comfortable range right now.'}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, tone }) => (
    <div
        style={{
            padding: 18,
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            background: '#fff'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: tone }}>
            <Icon size={16} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{label}</span>
        </div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>{value}</div>
    </div>
);

export default DatabaseStorageCard;
