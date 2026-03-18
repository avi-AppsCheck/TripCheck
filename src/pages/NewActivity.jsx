import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { useAllStudents } from '../hooks/useAllStudents';
import { X, Check, CaretDown } from '@phosphor-icons/react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function NewActivity() {
  const { currentUser } = useAuth();
  const { groups } = useGroups();
  const { allStudents, loading: studentsLoading } = useAllStudents(groups);
  const navigate = useNavigate();

  const [activityName, setActivityName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) newExpanded.delete(groupId);
    else newExpanded.add(groupId);
    setExpandedGroups(newExpanded);
  };

  const handleGroupCheckbox = (groupId, groupStudents) => {
    const newSelectedGroups = new Set(selectedGroups);
    const newSelectedStudents = new Set(selectedStudents);
    
    if (newSelectedGroups.has(groupId)) {
      newSelectedGroups.delete(groupId);
      groupStudents.forEach(s => newSelectedStudents.delete(s.id));
    } else {
      newSelectedGroups.add(groupId);
      groupStudents.forEach(s => newSelectedStudents.add(s.id));
    }
    
    setSelectedGroups(newSelectedGroups);
    setSelectedStudents(newSelectedStudents);
  };

  const handleStudentCheckbox = (studentId, groupId, groupStudents) => {
    const newSelectedStudents = new Set(selectedStudents);
    const newSelectedGroups = new Set(selectedGroups);
    
    if (newSelectedStudents.has(studentId)) {
      newSelectedStudents.delete(studentId);
      // Remove group checkbox if not all students are selected
      newSelectedGroups.delete(groupId);
    } else {
      newSelectedStudents.add(studentId);
      // Check if all students in this group are now selected
      const allSelected = groupStudents.every(s => newSelectedStudents.has(s.id) || s.id === studentId);
      if (allSelected) newSelectedGroups.add(groupId);
    }

    setSelectedStudents(newSelectedStudents);
    setSelectedGroups(newSelectedGroups);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activityName.trim() || selectedStudents.size === 0 || !currentUser) {
      alert('יש להזין שם פעילות ולבחור לפחות תלמיד אחד.');
      return;
    }
    
    setSaving(true);
    try {
      const participantList = allStudents.filter(s => selectedStudents.has(s.id));
      const groupNames = groups.filter(g => selectedGroups.has(g.id)).map(g => g.name);

      const batch = writeBatch(db);
      const newActivityRef = doc(collection(db, "activities"));
      
      batch.set(newActivityRef, {
        name: activityName.trim(),
        groups: groupNames.length > 0 ? groupNames : ['מותאם אישית'],
        participants: participantList,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        status: 'active'
      });
      
      await batch.commit();
      navigate(`/attendance/${newActivityRef.id}`);
    } catch (err) {
      console.error('Save failed', err);
      alert('שגיאה ביצירת הפעילות');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col bg-white h-full min-h-screen relative">
      <header className="p-4 flex items-center justify-between border-b sticky top-0 bg-white z-10">
        <h1 className="text-2xl font-bold text-gray-800">יצירת פעילות חדשה</h1>
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800">
          <X weight="bold" className="text-2xl" />
        </button>
      </header>

      <main className="flex-grow p-6 space-y-8">
        <div>
          <label htmlFor="activity-name" className="block text-lg font-medium text-gray-700 mb-2">שם הפעילות</label>
          <input 
            type="text" 
            id="activity-name" 
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            className="block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            placeholder="לדוגמה: טיול שנתי לגליל" 
          />
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">שייך קבוצות</label>
          <div className="space-y-3">
            {studentsLoading && <p className="text-gray-500">טוען קבוצות ותלמידים...</p>}
            {!studentsLoading && groups.length === 0 && (
              <p className="text-center text-gray-500">יש ליצור קבוצות במסך "ניהול קבוצות" תחילה.</p>
            )}
            
            {!studentsLoading && groups.map(group => {
              const groupStudents = allStudents.filter(s => s.groupId === group.id);
              const hasStudents = groupStudents.length > 0;
              const isGroupChecked = selectedGroups.has(group.id);
              const isExpanded = expandedGroups.has(group.id);
              
              return (
                <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isGroupChecked}
                      onChange={() => handleGroupCheckbox(group.id, groupStudents)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-3"
                    />
                    <div 
                      className="flex-grow font-medium text-gray-900 cursor-pointer"
                      onClick={() => toggleGroup(group.id)}
                    >
                      {group.name} <span className="text-xs text-gray-500">({groupStudents.length} תלמידים)</span>
                    </div>
                    {hasStudents && (
                      <button onClick={() => toggleGroup(group.id)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <CaretDown weight="bold" className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  
                  {hasStudents && isExpanded && (
                    <div className="bg-white border-t border-gray-100 p-2 space-y-1">
                      {groupStudents.map(student => (
                        <label key={student.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedStudents.has(student.id)}
                            onChange={() => handleStudentCheckbox(student.id, group.id, groupStudents)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2" 
                          />
                          <span className="text-sm text-gray-700">{student.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={saving || !activityName.trim() || selectedStudents.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:transform-none cursor-pointer disabled:cursor-not-allowed"
          >
            <Check weight="bold" className="text-2xl" />
            {saving ? 'שומר...' : 'שמירה ויצירת פעילות'}
          </button>
        </div>
      </main>
    </div>
  );
}
