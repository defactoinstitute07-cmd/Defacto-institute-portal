import React from 'react';
import { CheckCircle2, X, ChevronRight } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] w-full max-w-[400px] overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center">
                    <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce duration-1000">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{title || 'Success!'}</h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">{message}</p>
                    
                    <button onClick={onClose} className="w-full group flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">
                        <span>Dismiss</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
                
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default SuccessModal;
