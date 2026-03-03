import React from "react";
import { X, Loader2, AlertCircle, ShieldAlert, Plus, GraduationCap, Camera } from "lucide-react";

const StudentFormModal = ({
  isOpen,
  onClose,
  step,
  setStep,
  form,
  handleForm,
  batches,
  selectedStudent,
  saving,
  onSubmit,
  err,
}) => {
  if (!isOpen) return null;

  const currentBatch = batches.find((b) => b._id === form.batchId);

  const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
  const classesList = settings.classesOffered && settings.classesOffered.length > 0
    ? settings.classesOffered
    : ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const isBatchFull =
    currentBatch &&
    currentBatch.capacity > 0 &&
    currentBatch.enrolled >= currentBatch.capacity;

  const handleSubmit = (e) => {
    if (step === 2 && isBatchFull) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      handleForm({ target: { name: 'profileImage', value: file } });
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px'
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{
        width: '100%', maxWidth: '900px', maxHeight: '92vh',
        background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>

        {/* --- TOP BAR (Inside Modal Box) --- */}
        <header style={{
          width: '100%',
          padding: '24px 32px',
          background: '#0f172a',
          position: 'relative',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          <GraduationCap size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, color: '#fff' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <GraduationCap size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                {selectedStudent ? 'Update Student Record' : 'Fresh Admission'}
              </h2>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>
                {selectedStudent ? `Updating details for ${selectedStudent?.name}` : 'Register a new student'}
              </div>
            </div>
          </div>

          <button type="button" onClick={onClose} style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', color: '#fff', padding: '8px 16px',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 8, fontSize: '0.75rem', fontWeight: 700
          }}>
            <X size={16} /> CLOSE
          </button>
        </header>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '0 10px', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex' }}>
            <TabButton active={step === 1} onClick={() => setStep(1)} label="Basic Details" />
            <TabButton active={step === 2} onClick={() => setStep(2)} label="Enrollment Info" />
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            {err && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={14} />{err}</div>}

            {step === 1 && (
              <>
                <div style={{ display: 'flex', gap: 16 }}>
                  {/* Photo Upload Area */}
                  <div style={{ flexShrink: 0, width: 100, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      width: 90, height: 90, borderRadius: '4px', border: '1px dashed var(--erp-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--erp-bg2)',
                      overflow: 'hidden', position: 'relative', cursor: 'pointer'
                    }} onClick={() => document.getElementById('studentPhotoInput').click()}>
                      {form.profileImage ? (
                        <img src={URL.createObjectURL(form.profileImage)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (selectedStudent?.profileImage) ? (
                        <img src={`${API_BASE_URL}${selectedStudent.profileImage}`} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={24} color="var(--erp-muted)" />
                      )}
                      <input type="file" id="studentPhotoInput" hidden accept="image/*" onChange={handleImageChange} />
                    </div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--erp-muted2)', textAlign: 'center', cursor: 'pointer' }} htmlFor="studentPhotoInput">
                      Upload Image
                    </label>
                  </div>

                  {/* Right side form fields */}
                  <div style={{ flex: 1 }}>
                    <div className="mf">
                      <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>FULL NAME *</label>
                      <input name="name" value={form.name} onChange={handleForm} placeholder="Enter full name" required style={{ borderRadius: '4px' }} />
                    </div>
                    <div className="mf-row" style={{ marginTop: 16 }}>
                      <div className="mf">
                        <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>DATE OF BIRTH</label>
                        <input type="date" name="dob" value={form.dob} onChange={handleForm} style={{ borderRadius: '4px' }} />
                      </div>
                      <div className="mf">
                        <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>GENDER</label>
                        <select name="gender" value={form.gender} onChange={handleForm} style={{ borderRadius: '4px' }}>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mf-row" style={{ marginTop: 8 }}>
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>MOBILE NUMBER</label>
                    <input name="phone" value={form.phone} onChange={handleForm} placeholder="Enter number" style={{ borderRadius: '4px' }} />
                  </div>
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>EMAIL ADDRESS</label>
                    <input type="email" name="email" value={form.email} onChange={handleForm} placeholder="student@example.com" style={{ borderRadius: '4px' }} />
                  </div>
                </div>

                <div className="mf-row">
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>FATHER'S NAME</label>
                    <input type="text" name="fatherName" value={form.fatherName} onChange={handleForm} placeholder="Full Name" style={{ borderRadius: '4px' }} />
                  </div>
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>MOTHER'S NAME</label>
                    <input type="text" name="motherName" value={form.motherName} onChange={handleForm} placeholder="Full Name" style={{ borderRadius: '4px' }} />
                  </div>
                </div>

                <div className="mf">
                  <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>FULL ADDRESS</label>
                  <textarea name="address" value={form.address} onChange={handleForm} placeholder="Street, City, Zip Code..." style={{ height: 60, width: '100%', padding: '10px 14px', border: '1px solid var(--erp-border)', borderRadius: '4px', background: 'var(--erp-input-bg)', fontSize: '0.9rem', color: 'var(--erp-text)', outline: 'none', resize: 'vertical' }} />
                </div>

                {!selectedStudent ? (
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>SET PASSWORD (DEFAULT: STUDENT@123)</label>
                    <input type="password" name="password" value={form.password || ''} onChange={handleForm} placeholder="Leave blank for student@123" style={{ borderRadius: '4px' }} />
                  </div>
                ) : (
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>UPDATE PASSWORD (OPTIONAL)</label>
                    <input type="password" name="password" value={form.password || ''} onChange={handleForm} placeholder="Leave blank to keep current password" style={{ borderRadius: '4px' }} />
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className="mf-row">
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>STANDARD / COURSE</label>
                    <select name="className" value={form.className} onChange={handleForm} style={{ borderRadius: '4px' }}>
                      <option value="">Select Class</option>
                      {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="mf" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>ASSIGNED BATCH *</label>
                    {!form.className ? (
                      <div style={{ padding: '12px', border: '1px dashed var(--erp-border)', borderRadius: '4px', color: 'var(--erp-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Please select a class first
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginTop: 4 }}>
                        {batches
                          .filter(b => {
                            if (!form.className) return false;
                            const bc = String(b.course || "").trim().toLowerCase();
                            const fc = String(form.className).trim().toLowerCase();
                            return bc === fc;
                          })
                          .map((b) => {
                            const isFull = b.capacity > 0 && b.enrolled >= b.capacity;
                            const isSelected = form.batchId === b._id;
                            return (
                              <div
                                key={b._id}
                                onClick={() => !isFull && handleForm({ target: { name: 'batchId', value: b._id } })}
                                style={{
                                  padding: '10px',
                                  borderRadius: '4px',
                                  border: isSelected ? '2px solid var(--erp-primary)' : '1px solid var(--erp-border)',
                                  background: isSelected ? 'var(--erp-bg2)' : isFull ? '#f1f5f9' : '#fff',
                                  cursor: isFull ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  position: 'relative',
                                  opacity: isFull ? 0.6 : 1
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--erp-primary)' : 'var(--erp-text)' }}>{b.name}</div>
                                <div style={{ fontSize: '0.7rem', color: isFull ? 'var(--erp-danger)' : 'var(--erp-muted2)', marginTop: 4 }}>
                                  {b.enrolled}/{b.capacity || "∞"} Seats
                                </div>
                                {isSelected && (
                                  <div style={{ position: 'absolute', top: -8, right: -8, background: 'var(--erp-primary)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                    ✓
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {batches.filter(b => b.course === form.className).length === 0 && (
                          <div style={{ padding: '12px', border: '1px dashed var(--erp-border)', borderRadius: '4px', color: 'var(--erp-muted)', fontSize: '0.85rem', textAlign: 'center', gridColumn: '1/-1' }}>
                            No batches available for this class
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mf-row">
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>ADMISSION DATE</label>
                    <input type="date" name="admissionDate" value={form.admissionDate} onChange={handleForm} style={{ borderRadius: '4px' }} />
                  </div>
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>ACADEMIC SESSION</label>
                    <input type="text" name="session" value={form.session} onChange={handleForm} placeholder="e.g. 2026-2027" style={{ borderRadius: '4px' }} />
                  </div>
                </div>

                <div className="mf-row">
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>MONTHLY FEE (₹) {form.batchId && <span style={{ fontSize: '0.65rem', color: '#059669' }}>(FROM BATCH)</span>}</label>
                    <input
                      type="number"
                      name="fees"
                      value={form.fees}
                      onChange={handleForm}
                      placeholder="0"
                      readOnly={!!form.batchId}
                      style={form.batchId ? { backgroundColor: 'var(--erp-bg2)', cursor: 'not-allowed', borderRadius: '4px' } : { borderRadius: '4px' }}
                    />
                  </div>
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>REGISTRATION FEE (₹)</label>
                    <input type="number" name="registrationFee" value={form.registrationFee} onChange={handleForm} placeholder="0" style={{ borderRadius: '4px' }} />
                  </div>
                </div>

                <div className="mf-row">
                  <div className="mf">
                    <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>ENROLLMENT STATUS</label>
                    <select name="status" value={form.status} onChange={handleForm} style={{ borderRadius: '4px' }}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="mf">
                  <label style={{ fontWeight: 800, fontSize: '0.7rem' }}>INTERNAL ENROLLMENT NOTES</label>
                  <textarea name="notes" value={form.notes} onChange={handleForm} rows={2} placeholder="Any specific requirements or notes?" style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--erp-border)', borderRadius: '4px', background: 'var(--erp-input-bg)', fontSize: '0.9rem', color: 'var(--erp-text)', outline: 'none', resize: 'vertical' }} />
                </div>

                {form.batchId && currentBatch && (
                  <div style={{ background: 'var(--erp-bg2)', border: '1px dashed var(--erp-border)', borderRadius: '4px', padding: 16, marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.7rem', color: '#059669', textTransform: 'uppercase' }}>Batch Capacity</div>
                        <div className="td-sm">Seats filled vs total</div>
                      </div>
                      <div style={{ fontWeight: 800, color: isBatchFull ? 'var(--erp-danger)' : '#059669' }}>
                        {currentBatch.enrolled} / {currentBatch.capacity}
                      </div>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: isBatchFull ? 'var(--erp-danger)' : '#059669', width: `${Math.min((currentBatch.enrolled / currentBatch.capacity) * 100, 100)}%` }} />
                    </div>
                    {isBatchFull && <div style={{ color: 'var(--erp-danger)', fontSize: '0.8rem', fontWeight: 600, marginTop: 8 }}>This batch is currently full.</div>}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '20px 32px', display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button type="button" className="btn" style={{ padding: '0 24px', height: 44, borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => step === 2 ? setStep(1) : onClose()}>
                {step === 2 ? "BACK" : "CANCEL"}
              </button>
              <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                {step === 1 && (
                  <button type="button" className="btn" style={{ flex: 1, height: 44, background: '#059669', color: '#fff', borderRadius: '4px', padding: '0 20px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.7rem' }} onClick={() => setStep(2)}>
                    CONTINUE <Plus size={16} />
                  </button>
                )}
                {step === 2 && (
                  <button type="submit" className="btn" style={{ flex: 1, height: 44, background: '#059669', color: '#fff', borderRadius: '4px', padding: '0 20px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.7rem' }} disabled={saving || isBatchFull}>
                    {saving
                      ? <><Loader2 size={16} className="spin" /> SAVING…</>
                      : selectedStudent ? <><ShieldAlert size={16} /> UPDATE PROFILE</> : <><Plus size={16} /> COMPLETE ADMISSION</>
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div >
  );
};

export default StudentFormModal;

// --- Redesigned UI Helpers ---
const TabButton = ({ active, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '16px 24px', border: 'none', background: 'none', cursor: 'pointer',
      fontSize: '0.7rem', fontWeight: 800, color: active ? '#059669' : '#94a3b8',
      borderBottom: `3px solid ${active ? '#059669' : 'transparent'}`,
      transition: '0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}
  >
    {label}
  </button>
);
