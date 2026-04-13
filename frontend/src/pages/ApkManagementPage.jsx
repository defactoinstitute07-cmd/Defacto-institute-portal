import React, { useState, useEffect, useMemo } from 'react';
import ERPLayout from '../components/ERPLayout';
import { 
    Download, 
    Plus, 
    Trash2, 
    Edit, 
    LayoutGrid, 
    FileIcon, 
    UploadCloud, 
    CheckCircle2,
    Search,
    RefreshCw,
    Package,
    FileText,
    ExternalLink,
    X
} from 'lucide-react';
import apkApi from '../api/apkApi';
import pdfApi from '../api/pdfApi';
import { getAllBatches } from '../api/batchApi';
import { getSubjects } from '../api/subjectApi';
import { toast } from 'react-hot-toast';

const AppManagementPage = () => {
    const [activeTab, setActiveTab] = useState('apks');
    
    // APK States
    const [apks, setApks] = useState([]);
    const [apkLoading, setApkLoading] = useState(true);
    const [apkSearch, setApkSearch] = useState('');
    
    // PDF States
    const [pdfs, setPdfs] = useState([]);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfSearch, setPdfSearch] = useState('');
    const [batches, setBatches] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);

    // Common States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        appName: '',
        version: '',
        pdfName: '',
        classLevel: '',
        subjectName: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [apkFile, setApkFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [screenshotFiles, setScreenshotFiles] = useState([]); // Multiple screenshots
    const [screenshotPreviews, setScreenshotPreviews] = useState([]);
    const [screenshotCaptions, setScreenshotCaptions] = useState([]); // Array of strings

    const fetchApks = async () => {
        try {
            setApkLoading(true);
            const res = await apkApi.getAllApks();
            setApks(res.data);
        } catch (error) {
            toast.error('Failed to load APKs');
        } finally {
            setApkLoading(false);
        }
    };

    const fetchPdfs = async () => {
        try {
            setPdfLoading(true);
            const res = await pdfApi.getAllPdfs();
            setPdfs(res.data);
        } catch (error) {
            toast.error('Failed to load PDFs');
        } finally {
            setPdfLoading(false);
        }
    };

    const fetchBatches = async () => {
        try {
            const res = await getAllBatches();
            setBatches(res.data.batches || []);
        } catch (error) {
            console.error('Failed to load batches');
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await getSubjects({ activeOnly: true });
            setAllSubjects(res.data.subjects || []);
        } catch (error) {
            console.error('Failed to load subjects');
        }
    };

    useEffect(() => {
        fetchApks();
        fetchPdfs();
        fetchBatches();
        fetchSubjects();
    }, []);

    const classLevelOptions = useMemo(() => {
        const fromBatches = batches
            .map((batch) => String(batch.course || '').trim())
            .filter(Boolean);
        return Array.from(new Set(fromBatches));
    }, [batches]);

    const filteredSubjectsForForm = useMemo(() => {
        if (!formData.classLevel) return [];
        return allSubjects.filter(sub => sub.classLevel === formData.classLevel);
    }, [formData.classLevel, allSubjects]);

    const resetForm = () => {
        setFormData({ appName: '', version: '', pdfName: '', classLevel: '', subjectName: '' });
        setLogoFile(null);
        setApkFile(null);
        setPdfFile(null);
        setScreenshotFiles([]);
        setScreenshotPreviews([]);
        setScreenshotCaptions([]);
        setIsEditing(false);
        setSelectedItem(null);
    };

    const handleScreenshotChange = (e) => {
        const newFiles = Array.from(e.target.files);
        // During editing, some previews are URLs, some are local blobs
        // screenshotFiles stores the actual File objects for NEW uploads
        // For simplicity with the current backend, we'll treat all as "to be uploaded" if any are changed
        
        if (screenshotPreviews.length + newFiles.length > 12) {
            toast.error('Maximum 12 screenshots allowed');
            return;
        }
        
        setScreenshotFiles(prev => [...prev, ...newFiles]);
        
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setScreenshotPreviews(prev => [...prev, ...newPreviews]);
        
        const newCaptions = new Array(newFiles.length).fill('');
        setScreenshotCaptions(prev => [...prev, ...newCaptions]);
    };

    const removeScreenshot = (index) => {
        setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
        setScreenshotCaptions(prev => prev.filter((_, i) => i !== index));
        // Also remove from files if it was a new file
        // This is tricky because Files and Previews are synced by index
        // Since handleOpenModal doesn't populate screenshotFiles for existing ones,
        // we need to be careful. 
        // If it was an existing screenshot, it won't be in screenshotFiles (which might be shorter).
        // But the indices must match.
        
        setScreenshotFiles(prev => {
            // This assumes screenshotFiles was populated in a way that matches the end of screenshotPreviews
            // OR we just reset everything when editing starts.
            // Let's look at how screenshotFiles is used.
            return prev.filter((_, i) => i !== (index - (screenshotPreviews.length - prev.length)));
        });
    };

    const handleCaptionChange = (index, value) => {
        const newCaptions = [...screenshotCaptions];
        newCaptions[index] = value;
        setScreenshotCaptions(newCaptions);
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            if (activeTab === 'apks') {
                setFormData({ ...formData, appName: item.appName, version: item.version });
                if (item.screenshots) {
                    setScreenshotPreviews(item.screenshots.map(s => s.url));
                    setScreenshotCaptions(item.screenshots.map(s => s.caption || ''));
                }
            } else {
                setFormData({ ...formData, pdfName: item.name, classLevel: item.classLevel, subjectName: item.subject || '' });
            }
            setSelectedItem(item);
            setIsEditing(true);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            if (activeTab === 'apks') {
                const data = new FormData();
                data.append('appName', formData.appName);
                data.append('version', formData.version);
                if (logoFile) data.append('logo', logoFile);
                if (apkFile) data.append('apkFile', apkFile);
                
                // Add screenshots and captions
                if (screenshotFiles.length > 0) {
                    screenshotFiles.forEach((file, idx) => {
                        data.append('screenshots', file);
                        // We need to find the correct caption for this file.
                        // New files are appended to the end of previews.
                        const captionIdx = screenshotPreviews.length - screenshotFiles.length + idx;
                        data.append('captions', screenshotCaptions[captionIdx] || '');
                    });
                }

                if (isEditing) {
                    await apkApi.updateApk(selectedItem._id, data);
                    toast.success('App updated successfully');
                } else {
                    if (!logoFile || !apkFile) {
                        toast.error('Logo and APK file are required');
                        setSubmitting(false);
                        return;
                    }
                    await apkApi.createApk(data);
                    toast.success('App uploaded successfully');
                }
                fetchApks();
            } else {
                // PDF Logic
                if (isEditing) {
                    toast.error('PDF editing not implemented yet (delete and re-upload)');
                } else {
                    if (!pdfFile || !formData.pdfName || !formData.classLevel) {
                        toast.error('Name, Class Level and PDF file are required');
                        setSubmitting(false);
                        return;
                    }
                    const data = new FormData();
                    data.append('name', formData.pdfName);
                    data.append('classLevel', formData.classLevel);
                    data.append('subject', formData.subjectName);
                    data.append('pdfFile', pdfFile);
                    
                    await pdfApi.createPdf(data);
                    toast.success('PDF uploaded successfully');
                    fetchPdfs();
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, type) => {
        if (!window.confirm(`Are you sure you want to delete this ${type === 'apk' ? 'app' : 'PDF'}?`)) return;
        try {
            if (type === 'apk') {
                await apkApi.deleteApk(id);
                fetchApks();
            } else {
                await pdfApi.deletePdf(id);
                fetchPdfs();
            }
            toast.success('Deleted successfully');
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const filteredApks = apks.filter(apk => 
        apk.appName.toLowerCase().includes(apkSearch.toLowerCase())
    );

    const filteredPdfs = pdfs.filter(pdf => 
        pdf.name.toLowerCase().includes(pdfSearch.toLowerCase()) ||
        pdf.classLevel.toLowerCase().includes(pdfSearch.toLowerCase()) ||
        (pdf.subject && pdf.subject.toLowerCase().includes(pdfSearch.toLowerCase()))
    );

    return (
        <ERPLayout title="App & Resource Management">
            {/* Tabs Header */}
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100">
                <button 
                    className={`pb-3 px-2 text-sm font-bold transition-all relative ${activeTab === 'apks' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTab('apks')}
                >
                    <div className="flex items-center gap-2">
                        <Package size={18} />
                        Application Versions
                    </div>
                    {activeTab === 'apks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1" />}
                </button>
                <button 
                    className={`pb-3 px-2 text-sm font-bold transition-all relative ${activeTab === 'pdfs' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTab('pdfs')}
                >
                    <div className="flex items-center gap-2">
                        <FileText size={18} />
                        Study Materials (PDFs)
                    </div>
                    {activeTab === 'pdfs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1" />}
                </button>
            </div>

            <div className="erp-card p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {activeTab === 'apks' ? <Package className="text-primary" /> : <FileText className="text-primary" />}
                            {activeTab === 'apks' ? 'Hosted Applications' : 'Student Study Materials'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {activeTab === 'apks' ? 'Manage and host APK files for students' : 'Upload and organize PDF notes by class level and subject'}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder={activeTab === 'apks' ? "Search apps..." : "Search name, class or subject..."}
                                className="erp-input pl-10 w-64"
                                value={activeTab === 'apks' ? apkSearch : pdfSearch}
                                onChange={(e) => activeTab === 'apks' ? setApkSearch(e.target.value) : setPdfSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            className="erp-btn-primary flex items-center gap-2"
                            onClick={() => handleOpenModal()}
                        >
                            <Plus size={18} />
                            {activeTab === 'apks' ? 'Upload New App' : 'Add New PDF'}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {(activeTab === 'apks' ? apkLoading : pdfLoading) ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw className="animate-spin text-primary" size={32} />
                        <p className="text-gray-500">Loading resources...</p>
                    </div>
                ) : (activeTab === 'apks' ? filteredApks.length === 0 : filteredPdfs.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <UploadCloud size={48} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700">No {activeTab === 'apks' ? 'applications' : 'PDFs'} found</h3>
                        <p className="text-gray-500 max-w-xs mb-6">
                            {activeTab === 'apks' ? 'Upload your first APK to start hosting downloads for your students.' : 'Upload study materials to help your students learn better.'}
                        </p>
                        <button className="erp-btn-secondary" onClick={() => handleOpenModal()}>
                            Add {activeTab === 'apks' ? 'App Entry' : 'PDF Document'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeTab === 'apks' ? (
                            filteredApks.map((apk) => (
                                <div key={apk._id} className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0">
                                            <img src={apk.logoUrl} alt={apk.appName} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 truncate pr-16">{apk.appName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20">
                                                    v{apk.version}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(apk.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            onClick={() => handleOpenModal(apk)}
                                            title="Edit entry"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            onClick={() => handleDelete(apk._id, 'apk')}
                                            title="Delete entry"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {apk.screenshots && apk.screenshots.length > 0 && (
                                        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                            {apk.screenshots.map((s, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={s.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="group/screen w-10 h-16 rounded-md overflow-hidden flex-shrink-0 border border-gray-100 hover:border-primary/50 transition-all shadow-sm relative"
                                                    title={s.caption || `Screenshot ${idx + 1}`}
                                                >
                                                    <img src={s.url} alt="Screenshot" className="w-full h-full object-cover" />
                                                    {s.caption && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/screen:opacity-100 transition-opacity p-0.5">
                                                            <span className="text-[8px] text-white text-center leading-tight line-clamp-3">{s.caption}</span>
                                                        </div>
                                                    )}
                                                </a>
                                            ))}
                                            <span className="text-[10px] text-gray-400 font-bold ml-1 bg-gray-50 px-2 py-1 rounded-md">
                                                {apk.screenshots.length} Screens
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <CheckCircle2 size={14} className="text-green-500" />
                                            Hosted
                                        </div>
                                        <a 
                                            href={apk.apkUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                                        >
                                            <Download size={16} />
                                            Download APK
                                        </a>
                                    </div>
                                </div>
                            ))
                        ) : (
                            filteredPdfs.map((pdf) => (
                                <div key={pdf._id} className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                                            <FileText size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 truncate pr-16">{pdf.name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-100">
                                                    {pdf.classLevel}
                                                </span>
                                                {pdf.subject && (
                                                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-100">
                                                        {pdf.subject}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(pdf.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            onClick={() => handleDelete(pdf._id, 'pdf')}
                                            title="Delete PDF"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <CheckCircle2 size={14} className="text-green-500" />
                                            Cloudinary Secure
                                        </div>
                                        <a 
                                            href={pdf.pdfUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                                        >
                                            <ExternalLink size={16} />
                                            View PDF
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Upload/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {activeTab === 'apks' ? 
                                            (isEditing ? 'Update Application' : 'Upload New App') : 
                                            (isEditing ? 'Update PDF' : 'Upload New PDF')
                                        }
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">
                                        Enter details and select file for student access
                                    </p>
                                </div>
                                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                                    <UploadCloud size={24} />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {activeTab === 'apks' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700">App Name</label>
                                                <input 
                                                    type="text"
                                                    required
                                                    className="erp-input"
                                                    placeholder="e.g. Student Portal"
                                                    value={formData.appName}
                                                    onChange={(e) => setFormData({...formData, appName: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700">Version</label>
                                                <input 
                                                    type="text"
                                                    required
                                                    className="erp-input"
                                                    placeholder="e.g. 1.0.4"
                                                    value={formData.version}
                                                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700">App Logo</label>
                                                <div className="relative group border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-primary/50 transition-all cursor-pointer">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => setLogoFile(e.target.files[0])}
                                                    />
                                                    <div className="flex flex-col items-center gap-1">
                                                        {logoFile ? (
                                                            <div className="flex items-center gap-2 text-primary font-medium truncate w-full px-2">
                                                                <CheckCircle2 size={16} />
                                                                <span className="truncate">{logoFile.name}</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <LayoutGrid className="text-gray-400" size={20} />
                                                                <span className="text-xs text-gray-500">Pick Logo</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700">APK File</label>
                                                <div className="relative group border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-primary/50 transition-all cursor-pointer">
                                                    <input 
                                                        type="file" 
                                                        accept=".apk"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => setApkFile(e.target.files[0])}
                                                    />
                                                    <div className="flex flex-col items-center gap-1">
                                                        {apkFile ? (
                                                            <div className="flex items-center gap-2 text-primary font-medium truncate w-full px-2">
                                                                <CheckCircle2 size={16} />
                                                                <span className="truncate">{apkFile.name}</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <FileIcon className="text-gray-400" size={20} />
                                                                <span className="text-xs text-gray-500">Select APK</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 block">App Screenshots ({screenshotPreviews.length}/12)</label>
                                                {screenshotPreviews.length > 0 && (
                                                    <button 
                                                        type="button" 
                                                        className="text-[10px] text-red-500 hover:underline font-bold"
                                                        onClick={() => {
                                                            setScreenshotFiles([]);
                                                            setScreenshotPreviews([]);
                                                            setScreenshotCaptions([]);
                                                        }}
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                {screenshotPreviews.map((url, idx) => (
                                                    <div key={idx} className="space-y-1 group relative">
                                                        <div className="aspect-[9/16] relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                                                            <img src={url} alt="Screenshot" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                onClick={() => removeScreenshot(idx)}
                                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white text-center py-0.5">
                                                                #{idx + 1}
                                                            </div>
                                                        </div>
                                                        <input 
                                                            type="text"
                                                            placeholder="Caption..."
                                                            className="w-full text-[8px] p-1 border border-gray-200 rounded focus:border-primary outline-none"
                                                            value={screenshotCaptions[idx] || ''}
                                                            onChange={(e) => handleCaptionChange(idx, e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                                {screenshotPreviews.length < 12 && (
                                                    <div className="aspect-[9/16] relative group border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-all cursor-pointer bg-gray-50/50">
                                                        <input 
                                                            type="file" 
                                                            multiple 
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={handleScreenshotChange}
                                                        />
                                                        <Plus size={16} className="text-gray-400 group-hover:text-primary" />
                                                        <span className="text-[10px] text-gray-500">Add</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400">Portrait screenshots work best. You can upload up to 12 images.</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">PDF Name</label>
                                            <input 
                                                type="text"
                                                required
                                                className="erp-input"
                                                placeholder="e.g. Physics Chapter 1 Notes"
                                                value={formData.pdfName}
                                                onChange={(e) => setFormData({...formData, pdfName: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Class Level</label>
                                            <select 
                                                className="erp-input"
                                                required
                                                value={formData.classLevel}
                                                onChange={(e) => setFormData({...formData, classLevel: e.target.value, subjectName: ''})}
                                            >
                                                <option value="">Select Class / Level</option>
                                                {classLevelOptions.map(level => (
                                                    <option key={level} value={level}>{level}</option>
                                                ))}
                                                <option value="General">General</option>
                                            </select>
                                        </div>

                                        {formData.classLevel && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className="text-sm font-bold text-gray-700">Subject (Optional)</label>
                                                <select 
                                                    className="erp-input"
                                                    value={formData.subjectName}
                                                    onChange={(e) => setFormData({...formData, subjectName: e.target.value})}
                                                >
                                                    <option value="">All Subjects / General</option>
                                                    {filteredSubjectsForForm.map(sub => (
                                                        <option key={sub._id} value={sub.name}>{sub.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-gray-400">Showing subjects assigned to {formData.classLevel}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">PDF File</label>
                                            <div className="relative group border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-primary/50 transition-all cursor-pointer">
                                                <input 
                                                    type="file" 
                                                    accept=".pdf"
                                                    required={!isEditing}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => setPdfFile(e.target.files[0])}
                                                />
                                                <div className="flex flex-col items-center gap-2">
                                                    {pdfFile ? (
                                                        <div className="flex flex-col items-center gap-2 text-primary">
                                                            <CheckCircle2 size={32} />
                                                            <span className="font-bold">{pdfFile.name}</span>
                                                            <span className="text-xs">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <FileText className="text-gray-300" size={48} />
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-bold text-gray-700">Click to select PDF</p>
                                                                <p className="text-xs text-gray-500">Max size 20MB</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex items-center gap-3">
                                    <button 
                                        type="button"
                                        className="flex-1 erp-btn-secondary"
                                        onClick={() => setIsModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-[2] erp-btn-primary flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={18} />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                {isEditing ? 'Save Changes' : 'Start Upload'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </ERPLayout>
    );
};

export default AppManagementPage;
