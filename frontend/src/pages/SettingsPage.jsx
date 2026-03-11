import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import AlertMessage from '../components/common/AlertMessage';
import DatabaseUsage from '../components/settings/DatabaseUsage';
import '../index.css';

const SettingsPage = () => {
    const [alert, setAlert] = useState(null);

    return (
        <ERPLayout title="System Settings">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {alert && <AlertMessage type={alert.type} message={alert.text} onClose={() => setAlert(null)} />}

                <div className="card" style={{ padding: 32, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                            <ShieldCheck size={24} color="#3b82f6" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Global Configurations</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Email delivery has been removed from this deployment. Remaining settings stay operational.</p>
                        </div>
                    </div>

                    <div style={{ padding: 20, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>Notification delivery</p>
                        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                            Automated and manual email sending, template editing, and SMTP-backed background processing have been removed.
                            Operational events now fall back to internal server logs instead of outbound email.
                        </p>
                    </div>
                </div>

                <DatabaseUsage setAlert={setAlert} />
            </div>
        </ERPLayout>
    );
};

export default SettingsPage;

