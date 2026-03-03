import React, { useState, useEffect } from 'react';
import { X, Receipt, UploadCloud, AlertCircle, Tag, Calendar, IndianRupee, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../Toast';
import axios from 'axios';
import { API_BASE_URL } from '../../api/apiConfig';

const ExpenseFormModal = ({ isOpen, onClose, onSuccess, expense = null }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        amount: '',
        category: 'Other',
        paymentMode: 'Cash',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receiptUrl: '',
        status: 'Paid'
    });
    const [fetchingSalary, setFetchingSalary] = useState(false);

    useEffect(() => {
        if (isOpen && expense) {
            setForm({
                title: expense.title || '',
                amount: expense.amount || '',
                category: expense.category || 'Other',
                paymentMode: expense.paymentMode || 'Cash',
                date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: expense.description || '',
                receiptUrl: expense.receiptUrl || '',
                status: expense.status || 'Paid'
            });
        } else if (isOpen && !expense) {
            setForm({
                title: '',
                amount: '',
                category: 'Other',
                paymentMode: 'Cash',
                date: new Date().toISOString().split('T')[0],
                description: '',
                receiptUrl: '',
                status: 'Paid'
            });
        }
    }, [isOpen, expense]);

    if (!isOpen) return null;

    const categories = ['Rent', 'Salary', 'Electricity', 'Maintenance', 'Marketing', 'Supplies', 'Other'];
    const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

    const handleCategoryChange = async (e) => {
        const selectedCategory = e.target.value;
        setForm(prev => ({ ...prev, category: selectedCategory }));

        if (selectedCategory === 'Salary') {
            setFetchingSalary(true);
            try {
                const api = axios.create({
                    baseURL: `${API_BASE_URL}/api`,
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                const { data } = await api.get('/teachers/summary');
                if (data && data.monthlyPayroll) {
                    setForm(prev => ({
                        ...prev,
                        amount: data.monthlyPayroll,
                        title: prev.title || 'Monthly Faculty Payroll'
                    }));
                    toast.success('Auto-populated total faculty salary');
                }
            } catch (error) {
                console.error('Failed to fetch salary data:', error);
                toast.error('Could not auto-calculate total salary');
            } finally {
                setFetchingSalary(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.title || !form.amount) {
            toast.error('Please fill in the required fields (Title, Amount)');
            return;
        }

        setLoading(true);
        try {
            const api = axios.create({
                baseURL: `${API_BASE_URL}/api`,
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (!expense) {
                await api.post('/expenses', form);
                toast.success('Expense recorded successfully');
            } else {
                await api.put(`/expenses/${expense._id}`, form);
                toast.success('Expense updated successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving expense:', error);
            toast.error(error.response?.data?.message || 'Failed to save expense');
        } finally {
            setLoading(true);
            setLoading(false);
        }
    };

    const handle = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 550 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="modal-icon-container">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h2 className="modal-title">{expense ? 'Edit Expense' : 'Record New Expense'}</h2>
                            <p className="modal-subtitle">Track your institutional operational costs</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label className="form-label">Expense Title*</label>
                                <input
                                    type="text"
                                    name="title"
                                    className="form-input"
                                    placeholder="e.g. Monthly Rent, Electricity Bill"
                                    value={form.title}
                                    onChange={handle}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    name="category"
                                    className="form-input"
                                    value={form.category}
                                    onChange={handleCategoryChange}
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Amount (₹)*</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        name="amount"
                                        className="form-input input-with-icon-left"
                                        placeholder="0.00"
                                        value={form.amount}
                                        onChange={handle}
                                        required
                                        disabled={fetchingSalary}
                                    />
                                    <IndianRupee size={14} className="input-icon-left" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Expense Date</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        name="date"
                                        className="form-input input-with-icon-left"
                                        value={form.date}
                                        onChange={handle}
                                    />
                                    <Calendar size={14} className="input-icon-left" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Mode</label>
                                <select
                                    name="paymentMode"
                                    className="form-input"
                                    value={form.paymentMode}
                                    onChange={handle}
                                >
                                    {paymentModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label">Description (Optional)</label>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        name="description"
                                        className="form-input input-with-icon-left"
                                        placeholder="Add details about the transaction..."
                                        value={form.description}
                                        onChange={handle}
                                        rows={2}
                                        style={{ height: 'auto', paddingTop: 10 }}
                                    />
                                    <FileText size={14} className="input-icon-left" style={{ top: 15 }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} />
                                    <span>{expense ? 'Update Expense' : 'Save Expense'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseFormModal;
