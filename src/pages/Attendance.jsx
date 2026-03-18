import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, Users, Check, X } from '@phosphor-icons/react';
import { collection, doc, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useActivity } from '../hooks/useActivity';

export default function Attendance() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { activity, loading } = useActivity(activityId);

  const [presentStudents, setPresentStudents] = useState(new Set());
  const [saving, setSaving] = useState(false);
  
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [checkName, setCheckName] = useState('');
  const [hidePresent, setHidePresent] = useState(false);
  
  const isArchived = activity?.status === 'archived';

  const groupedStudents = React.useMemo(() => {
    if (!activity?.participants) return [];
    
    let map = {};
    activity.participants.forEach(s => {
      if (!map[s.groupName]) map[s.groupName] = [];
      map[s.groupName].push(s);
    });

    return Object.keys(map).sort((a,b) => a.localeCompare(b, 'he')).map(gName => ({
      groupName: gName,
      students: map[gName].sort((a,b) => a.name.localeCompare(b.name, 'he'))
    }));
  }, [activity]);

  const toggleStudent = (studentId) => {
    if (isArchived) return;
    const newPresent = new Set(presentStudents);
    if (newPresent.has(studentId)) {
      newPresent.delete(studentId);
    } else {
      newPresent.add(studentId);
    }
    setPresentStudents(newPresent);
  };

  const handleValidationAndSummary = () => {
    if (!checkName.trim()) {
      alert('נא להזין את שם הבדיקה (לדוגמה: עלייה לאוטובוס).');
      return;
    }
    setShowSummaryModal(true);
  };

  const handleSaveCheck = async (shouldArchive) => {
    if (!currentUser || !activity) return;
    setSaving(true);
    
    const presentList = activity.participants.filter(s => presentStudents.has(s.id));
    const absentList = activity.participants.filter(s => !presentStudents.has(s.id));

    try {
      const batch = writeBatch(db);
      const checksRef = doc(collection(db, "activities", activityId, "checks"));
      
      batch.set(checksRef, { 
        name: checkName.trim() || 'ללא שם', 
        checkedAt: serverTimestamp(), 
        checkedBy: currentUser.uid, 
        present: presentList, 
        absent: absentList 
      });

      if (shouldArchive) {
        batch.update(doc(db, "activities", activityId), { 
          status: "archived", 
          archivedAt: serverTimestamp() 
        });
      }

      await batch.commit();
      setShowSummaryModal(false);
      navigate('/');
    } catch (err) {
      console.error('Failed to save attendance', err);
      alert('שגיאה בשמירה.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveActivity = async () => {
    if (!window.confirm('לסגור את הפעילות ולהעביר לארכיון?')) return;
    try {
      await updateDoc(doc(db, "activities", activity.id), { status: "archived", archivedAt: serverTimestamp() });
      navigate('/');
    } catch (err) {
        console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">טוען...</div>;
  if (!activity) return <div className="p-8 text-center text-red-500">הפעילות לא נמצאה.</div>;

  const totalStudents = activity.participants?.length || 0;
  const presentCount = presentStudents.size;
  const missingCount = totalStudents - presentCount;

  return (
    <div className="min-h-screen flex flex-col relative pb-40 bg-[#f3f4f6]">
      <header className="sticky top-0 bg-[#f3f4f6]/95 backdrop-blur-sm z-10 pt-4 pb-2 px-4 flex flex-col items-center justify-center relative">
        <button 
          onClick={() => navigate(isArchived ? '/archive' : '/')} 
          className="absolute left-4 top-4 bg-gray-200 text-gray-700 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-300 transition-colors"
        >
          <CaretLeft weight="bold" className="text-xl" />
        </button>
        
        <h1 className="text-2xl font-bold text-gray-800 leading-tight mb-4">{activity.name}</h1>
        
        <div className="text-center font-medium text-gray-500 text-sm mb-1">נוכחים</div>
        <div className="text-5xl font-bold flex items-center justify-center gap-2">
            <span className="text-red-600">{missingCount}</span>
            <span className="text-gray-300">/</span>
            <span className="text-red-600">{presentCount}</span>
        </div>
      </header>

      <main className="flex-grow px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            {/* Check Name Input */}
            <div className="mb-5">
                <label className="block text-gray-800 font-semibold mb-2">שם הבדיקה</label>
                <input 
                    type="text" 
                    value={checkName}
                    onChange={(e) => setCheckName(e.target.value)}
                    placeholder="לדוגמה: עלייה לאוטובוס" 
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 bg-white shadow-inner focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isArchived}
                />
            </div>

            {/* Actions Bar */}
            {!isArchived && (
              <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                      <input 
                          type="checkbox" 
                          checked={hidePresent}
                          onChange={(e) => setHidePresent(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>הסתר נוכחים</span>
                  </label>
                  
                  <button 
                      onClick={() => navigate(`/edit-participants/${activity.id}`)}
                      className="text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-100 transition-colors"
                  >
                      <span>ערוך משתתפים</span>
                      <Users weight="bold" />
                  </button>
              </div>
            )}

            {/* Students List */}
            <div className="mt-2 text-gray-800">
                {groupedStudents.map((group, groupIndex) => {
                    const visibleStudents = group.students.filter(s => !hidePresent || !presentStudents.has(s.id));
                    
                    if (visibleStudents.length === 0) return null;

                    return (
                        <div key={group.groupName} className="mb-4">
                            <div className="bg-gray-50 px-4 py-2 font-bold flex justify-between rounded-md mb-2 items-center">
                                <span>{group.groupName}</span>
                                <div className="text-gray-400">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                                </div>
                            </div>
                            <div className="space-y-1 pr-6 border-r-4 border-gray-400 rounded-r-sm">
                                {visibleStudents.map(student => {
                                    const isPresent = presentStudents.has(student.id);
                                    return (
                                        <label key={student.id} className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 relative overflow-hidden">
                                            <div className="flex items-center gap-4 flex-row-reverse w-full text-right">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isPresent ? 'bg-green-500 border-green-500 shadow-sm' : 'border-gray-300 bg-white shadow-sm'}`}>
                                                    {isPresent && <Check weight="bold" className="text-white text-lg" />}
                                                </div>
                                                <span className={`text-lg font-medium select-none ${isPresent ? 'text-gray-400' : 'text-gray-800'}`}>{student.name}</span>
                                            </div>
                                            <input type="checkbox" className="hidden" checked={isPresent} onChange={() => toggleStudent(student.id)} disabled={isArchived} />
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                
                {groupedStudents.every(group => {
                    const visible = group.students.filter(s => !hidePresent || !presentStudents.has(s.id));
                    return visible.length === 0;
                }) && (
                    <p className="text-center text-gray-500 py-8 italic border-t border-gray-100 mt-4">
                        {hidePresent ? 'כל הנוכחים סומנו הוסתרו.' : 'אין תלמידים בפעילות.'}
                    </p>
                )}
            </div>
        </div>
      </main>

      {/* Bottom Sticky Action Area */}
      {!isArchived && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f3f4f6] pb-safe pointer-events-auto">
          <div className="max-w-lg mx-auto flex flex-col gap-3">
            <button 
              onClick={handleValidationAndSummary}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-colors text-lg"
            >
              סיום בדיקה וסיכום נוכחות
            </button>
            <button 
              onClick={handleArchiveActivity}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-colors text-lg"
            >
              סיום פעילות/טיול
            </button>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in pb-safe pt-safe">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <header className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">סיכום בדיקה: {checkName}</h2>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full"><X weight="bold" className="text-xl" /></button>
            </header>
            
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <span className="block text-2xl font-bold text-green-700">{presentCount}</span>
                  <span className="text-sm text-green-600 font-medium">נוכחים</span>
                </div>
                <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <span className="block text-2xl font-bold text-red-700">{missingCount}</span>
                  <span className="text-sm text-red-600 font-medium">חסרים</span>
                </div>
              </div>

              {missingCount > 0 && (
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 mb-4">
                  <h4 className="font-bold text-red-800 mb-2 px-1 text-sm border-b border-red-200 pb-1">תלמידים חסרים:</h4>
                  <ul className="list-none space-y-1">
                    {activity.participants.filter(s => !presentStudents.has(s.id)).map(s => (
                       <li key={s.id} className="text-sm text-red-700 bg-red-100/50 px-2 py-1.5 rounded">{s.name} <span className="opacity-70 text-xs text-red-600">({s.groupName})</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <footer className="p-4 border-t bg-gray-50 space-y-3">
              <button onClick={() => handleSaveCheck(false)} disabled={saving} className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 flex justify-center items-center gap-2">
                <Check weight="bold" className="text-xl" /> {saving ? 'שומר...' : 'שמור בדיקה בארכיון וחזור למסך ראשי'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
