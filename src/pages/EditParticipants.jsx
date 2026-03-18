import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useActivity } from '../hooks/useActivity';
import { useGroups } from '../hooks/useGroups';
import { useAllStudents } from '../hooks/useAllStudents';
import { X, CaretDown, FloppyDisk, Check } from '@phosphor-icons/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function EditParticipants() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { activity, loading: activityLoading } = useActivity(activityId);
  const { groups } = useGroups();
  const { allStudents, loading: studentsLoading } = useAllStudents(groups);

  const [saving, setSaving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize selected students based on current participants
  React.useEffect(() => {
    if (activity?.participants && !initialized) {
        const initialSelected = new Set(activity.participants.map(p => p.id));
        setSelectedStudents(initialSelected);
        setInitialized(true);
    }
  }, [activity, initialized]);

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) newExpanded.delete(groupId);
    else newExpanded.add(groupId);
    setExpandedGroups(newExpanded);
  };

  const handleGroupCheckbox = (groupId, groupStudents) => {
    const newSelected = new Set(selectedStudents);
    const allGroupSelected = groupStudents.every(s => newSelected.has(s.id));
    
    if (allGroupSelected) {
        // Deselect all
        groupStudents.forEach(s => newSelected.delete(s.id));
    } else {
        // Select all
        groupStudents.forEach(s => newSelected.add(s.id));
    }
    setSelectedStudents(newSelected);
  };

  const handleStudentCheckbox = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
        newSelected.delete(studentId);
    } else {
        newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSave = async () => {
    if (!activityId || selectedStudents.size === 0) {
        alert('יש לבחור לפחות תלמיד אחד.');
        return;
    }
    
    setSaving(true);
    try {
        const participantList = allStudents.filter(s => selectedStudents.has(s.id));
        
        const groupRefs = new Set(participantList.map(p => p.groupName));
        const groupNames = Array.from(groupRefs);

        await updateDoc(doc(db, "activities", activityId), {
            participants: participantList,
            groups: groupNames.length > 0 ? groupNames : ['מותאם אישית']
        });
        
        navigate(`/attendance/${activityId}`);
    } catch (err) {
        console.error('Failed to update participants', err);
        alert('שגיאה בשמירת המשתתפים.');
    } finally {
        setSaving(false);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const lowerQuery = searchQuery.toLowerCase();
    
    return groups.filter(group => {
        const gName = group.name || '';
        if (gName.toLowerCase().includes(lowerQuery)) return true;

        const groupStudents = allStudents.filter(s => s.groupId === group.id);
        return groupStudents.some(s => {
            const sName = s.name || '';
            return sName.toLowerCase().includes(lowerQuery);
        });
    });
  }, [groups, allStudents, searchQuery]);

  if (activityLoading || studentsLoading) return <div className="p-8 text-center text-gray-500">טוען...</div>;
  if (!activity) return <div className="p-8 text-center text-red-500">הפעילות לא נמצאה.</div>;

  return (
    <div className="min-h-screen bg-gray-500/50 flex flex-col pt-safe pb-safe">
      <div className="flex-1 bg-gray-500/50 w-full max-w-lg mx-auto flex flex-col md:py-8">
        
        {/* Synthetic Modal Card */}
        <div className="flex-1 bg-[#f3f4f6] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* Header */}
            <header className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-5 flex flex-col relative shrink-0">
                <button 
                  onClick={() => navigate(`/attendance/${activityId}`)} 
                  className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                >
                  <X weight="bold" className="text-xl" />
                </button>
                <div className="text-right pl-12">
                    <h1 className="text-2xl font-bold mb-1">ניהול משתתפים בפעילות</h1>
                    <div className="text-sm text-purple-100 flex items-center justify-end gap-2">
                        <span>סה"כ משתתפים:</span>
                        <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-bold text-white">
                            {selectedStudents.size}
                        </span>
                    </div>
                </div>
            </header>

            {/* Search Bar */}
            <div className="bg-white p-4 border-b border-gray-200 shrink-0 shadow-sm z-10">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש תלמיד או כיתה..." 
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow outline-none"
                />
            </div>

            {/* Body */}
            <main className="flex-grow p-4 overflow-y-auto space-y-3">
                {filteredGroups.length === 0 && (
                    <p className="text-center text-gray-500 pt-8">לא נמצאו תוצאות.</p>
                )}
                
                {filteredGroups.map(group => {
                    const groupStudents = allStudents.filter(s => s.groupId === group.id);
                    if (groupStudents.length === 0) return null;
                    
                    const isExpanded = expandedGroups.has(group.id);
                    const totalInGroup = groupStudents.length;
                    const selectedInGroup = groupStudents.filter(s => selectedStudents.has(s.id)).length;
                    const allSelected = selectedInGroup === totalInGroup;
                    const someSelected = selectedInGroup > 0 && selectedInGroup < totalInGroup;

                    // Filter students if searching
                    const visibleStudents = searchQuery.trim() 
                        ? groupStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        : groupStudents;

                    if (searchQuery.trim() && visibleStudents.length === 0 && !group.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                        return null; 
                    }

                    return (
                        <div key={group.id} className="bg-white border text-gray-800 border-gray-200 rounded-xl shadow-sm overflow-hidden mb-3">
                            <div className="flex items-center p-4 hover:bg-gray-50 transition-colors">
                                {/* Right side: Checkbox and Name */}
                                <div className="flex items-center gap-3 w-1/2">
                                    <div 
                                        onClick={() => handleGroupCheckbox(group.id, groupStudents)}
                                        className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer transition-colors ${allSelected ? 'bg-rose-400 border-rose-400 text-white' : someSelected ? 'bg-rose-200 border-rose-400 text-white' : 'bg-white border-gray-300'}`}
                                    >
                                        {(allSelected || someSelected) && <Check weight="bold" className="text-sm" />}
                                    </div>
                                    <span className="font-bold text-lg">{group.name}</span>
                                </div>

                                {/* Left side: Badge and Caret */}
                                <div className="flex items-center justify-end gap-3 w-1/2">
                                    <div className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full cursor-default border border-gray-200">
                                        {totalInGroup} / {selectedInGroup}
                                    </div>
                                    <button 
                                        onClick={() => toggleGroup(group.id)} 
                                        className="text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <CaretDown weight="bold" className={`text-xl transition-transform ${isExpanded || searchQuery ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            
                            {(isExpanded || searchQuery.trim()) && (
                                <div className="bg-white border-t border-gray-100 px-4 py-2 space-y-1 pb-4">
                                    {visibleStudents.map(student => (
                                        <label key={student.id} className="flex items-center p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedStudents.has(student.id)}
                                                onChange={() => handleStudentCheckbox(student.id)}
                                                className="hidden" 
                                            />
                                            <div className={`w-5 h-5 rounded border mr-3 ml-3 flex items-center justify-center transition-colors ${selectedStudents.has(student.id) ? 'bg-rose-400 border-rose-400 text-white' : 'bg-white border-gray-300'}`}>
                                                {selectedStudents.has(student.id) && <Check weight="bold" className="text-xs" />}
                                            </div>
                                            <span className={`text-base flex-grow transition-colors ${selectedStudents.has(student.id) ? 'font-medium text-gray-800' : 'text-gray-600 group-hover:text-gray-800'}`}>
                                                {student.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] text-lg">
                <div className="flex gap-4 font-medium flex-row-reverse">
                    <button 
                        onClick={handleSave}
                        disabled={saving || selectedStudents.size === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-8 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <FloppyDisk weight="bold" className="text-xl" />
                        {saving ? 'שומר...' : 'שמור שינויים'}
                    </button>
                    <button 
                        onClick={() => navigate(`/attendance/${activityId}`)}
                        className="bg-white border text-gray-700 hover:bg-gray-50 py-3.5 px-8 rounded-xl transition-all border-gray-300"
                    >
                        ביטול
                    </button>
                </div>
            </footer>

        </div>
      </div>
    </div>
  );
}
