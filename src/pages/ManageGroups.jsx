import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { ArrowRight, Plus, SortAscending, DotsSixVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { collection, addDoc, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ReactSortable } from 'react-sortablejs';

export default function ManageGroups() {
  const { groups, loading } = useGroups();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [newGroupName, setNewGroupName] = useState('');
  
  const [sortedGroups, setSortedGroups] = useState([]);

  React.useEffect(() => {
    setSortedGroups(groups);
  }, [groups]);

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser) return;
    try {
      await addDoc(collection(db, "groups"), { 
        name: newGroupName.trim(), 
        createdBy: currentUser.uid,
        order: groups.length
      });
      setNewGroupName('');
    } catch (err) {
      console.error('Failed to add group', err);
    }
  };

  const handleSortEnd = async (newState) => {
    setSortedGroups(newState);
    if (!currentUser) return;
    
    try {
      const batch = writeBatch(db);
      newState.forEach((g, index) => {
        const ref = doc(db, "groups", g.id);
        batch.update(ref, { order: index });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to save group order', err);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק קבוצה זו? ייתכן ויש בה תלמידים.')) return;
    try {
      await deleteDoc(doc(db, "groups", groupId));
    } catch (err) {
      console.error('Failed to delete group', err);
    }
  };

  const handleEditGroup = async (groupId, oldName) => {
    const newName = window.prompt("שנה שם קבוצה:", oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
      try {
        await updateDoc(doc(db, "groups", groupId), { name: newName.trim() });
      } catch (err) {
        console.error('Failed to update group name', err);
      }
    }
  };

  const handleSortAbc = async () => {
    if (!currentUser) return;
    const sorted = [...groups].sort((a, b) => a.name.localeCompare(b.name, 'he'));
    
    try {
      const batch = writeBatch(db);
      sorted.forEach((g, index) => {
        const ref = doc(db, "groups", g.id);
        batch.update(ref, { order: index });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to sort ABC', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 ml-4 transition-colors">
            <ArrowRight weight="bold" className="text-2xl" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">ניהול קבוצות</h1>
        </div>
        <button onClick={handleSortAbc} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="מיין לפי א-ב">
          <SortAscending weight="bold" className="text-2xl" />
        </button>
      </header>

      <main className="flex-grow p-4 pt-6 space-y-6">
        <div>
          <form onSubmit={handleAddGroup} className="flex items-center gap-2">
            <input 
              type="text" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-grow block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" 
              placeholder="שם קבוצה חדשה (למשל, כיתה י'3)" 
            />
            <button type="submit" disabled={!newGroupName.trim()} className="bg-blue-600 text-white p-2 rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50">
              <Plus weight="bold" className="text-2xl" />
            </button>
          </form>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-center text-gray-500">טוען קבוצות...</p>}
          {!loading && groups.length === 0 && (
            <p className="text-center text-gray-500">אין קבוצות. צור את הקבוצה הראשונה שלך!</p>
          )}
          {!loading && sortedGroups.length > 0 && (
            <ReactSortable 
              list={sortedGroups} 
              setList={handleSortEnd}
              animation={150}
              handle=".drag-handle"
              ghostClass="bg-blue-50"
              className="space-y-3"
            >
              {sortedGroups.map(group => (
                <div key={group.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
                  <div className="drag-handle cursor-move p-2 text-gray-400 hover:text-gray-600">
                    <DotsSixVertical weight="bold" className="text-xl" />
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/group/${group.id}`, { state: { groupName: group.name } })}
                    className="flex-grow text-right p-2 font-medium text-gray-800 hover:text-blue-600 transition-colors"
                  >
                    {group.name}
                  </button>

                  <button 
                    onClick={() => handleEditGroup(group.id, group.name)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-full hover:bg-blue-50" 
                    title="ערוך קבוצה"
                  >
                    <PencilSimple weight="bold" className="text-xl" />
                  </button>

                  <button 
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50" 
                    title="מחק קבוצה"
                  >
                    <Trash weight="bold" className="text-xl" />
                  </button>
                </div>
              ))}
            </ReactSortable>
          )}
        </div>
      </main>
    </div>
  );
}
