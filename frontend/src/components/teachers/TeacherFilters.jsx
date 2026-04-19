import React from 'react';
import { Search, X, RefreshCw } from 'lucide-react';

const TeacherFilters = ({
    search,
    setSearch,
    statusFilt,
    setStatusFilt,
    loading,
    onLoad,
    searchRef
}) => {
    return (
        <div className="card toolbar" style={{ marginBottom: 20 }}>
            <div className="tb-search-wrap">
                <Search size={15} />
                <input
                    ref={searchRef}
                    className="tb-search"
                    placeholder="Search teachers... (Ctrl+K)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoComplete="new-password"
                />
            </div>
            <select className="tb-select" value={statusFilt} onChange={(e) => setStatusFilt(e.target.value)}>
                <option value="">Status Filter</option>
                <option value="all">All Records</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
            {(statusFilt || search) && (
                <button className="btn btn-outline btn-sm" onClick={() => { setStatusFilt(''); setSearch(''); }}>
                    <X size={13} /> Clear
                </button>
            )}
            <div style={{ marginLeft: 'auto' }}>
                <button className="btn btn-outline btn-sm" onClick={onLoad} title="Refresh">
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                </button>
            </div>
        </div>
    );
};

export default TeacherFilters;
