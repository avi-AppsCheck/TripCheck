import React, { useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, FileArrowUp, Trash, X, Check } from '@phosphor-icons/react';
import { collection, addDoc, doc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useStudents } from '../hooks/useStudents';
import * as XLSX from 'xlsx';

export default function GroupDetails() {
  const { id: groupId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const groupName = location.state?.groupName || 'פרטי קבוצה';
  
  const { students, loading } = useStudents(groupId);
  const [newStudentName, setNewStudentName] = useState('');
  
  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef(null);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim() || !groupId) return;
    try {
      await addDoc(collection(db, "groups", groupId, "students"), { 
        name: newStudentName.trim(), 
        addedAt: serverTimestamp() 
      });
      setNewStudentName('');
    } catch (error) {
      console.error('Failed to add student', error);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      await deleteDoc(doc(db, "groups", groupId, "students", studentId));
    } catch (error) {
      console.error('Failed to delete student', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const names = json.map(row => {
        const values = Object.values(row);
        return values[0] ? String(values[0]).trim() : '';
      }).filter(name => name.length > 0);

      setImportText(names.join('\n'));
    } catch (err) {
      console.error('Failed to parse file', err);
      alert('שגיאה בקריאת הקובץ');
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveImport = async () => {
    const names = importText.split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
      
    if (names.length === 0) return;

    try {
      const batch = writeBatch(db);
      const studentsRef = collection(db, "groups", groupId, "students");
      
      names.forEach(name => {
        const newRef = doc(studentsRef);
        batch.set(newRef, { name, addedAt: serverTimestamp() });
      });

      await batch.commit();
      setShowImportModal(false);
      setImportText('');
    } catch (error) {
      console.error('Failed to batch save imports', error);
      alert('שגיאה בשמירת התלמידים');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b">
        <button onClick={() => navigate('/manage-groups')} className="text-gray-500 hover:text-gray-800 ml-4 transition-colors">
          <ArrowRight weight="bold" className="text-2xl" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{groupName}</h1>
      </header>

      <main className="flex-grow p-4 pt-6 space-y-6">
        <div>
          <form onSubmit={handleAddStudent} className="flex items-center gap-2 mb-2">
            <input 
              type="text" 
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="flex-grow block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" 
              placeholder="שם תלמיד/ה חדש/ה" 
            />
            <button type="submit" disabled={!newStudentName.trim()} className="bg-blue-600 text-white p-2 rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50">
              <Plus weight="bold" className="text-2xl" />
            </button>
          </form>
          <button 
            onClick={() => setShowImportModal(true)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 border border-gray-300 transition-colors"
          >
            <FileArrowUp weight="bold" className="text-xl" />
            יבוא תלמידים מקובץ (Excel, Text)
          </button>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-center text-gray-500">טוען תלמידים...</p>}
          {!loading && students.length === 0 && (
            <p className="text-center text-gray-500">אין תלמידים בקבוצה זו.</p>
          )}
          {!loading && students.map(student => (
            <div key={student.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="font-medium text-gray-800">{student.name}</span>
              <button 
                onClick={() => handleDeleteStudent(student.id)}
                className="text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors"
              >
                <Trash weight="bold" className="text-xl pointer-events-none" />
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <header className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
              <h2 className="text-2xl font-bold">יבוא תלמידים</h2>
              <button onClick={() => setShowImportModal(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                <X weight="bold" className="text-xl" />
              </button>
            </header>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept=".xlsx, .xls, .csv, .txt" 
                />
                <FileArrowUp weight="duotone" className="text-5xl text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-lg font-medium text-gray-700">לחץ לבחירת קובץ או גרור לכאן</p>
                <p className="text-sm text-gray-500 mt-1">אקסל (שמות בעמודה הראשונה) או טקסט</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ערוך רשימה שהועלתה או הדבק רשימת שמות (כל שם בשורה נפרדת):
                </label>
                <textarea 
                  rows={8} 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="ישראל ישראלי&#10;משה כהן&#10;דני דין"
                />
              </div>
            </div>

            <footer className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowImportModal(false)} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors">
                ביטול
              </button>
              <button 
                onClick={handleSaveImport}
                disabled={importText.trim().length === 0} 
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Check weight="bold" />
                שמור תלמידים
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
