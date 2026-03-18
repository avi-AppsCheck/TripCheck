import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActivities } from '../hooks/useActivities';
import { PlusCircle, UsersThree, Archive as ArchiveIcon, SignOut, CaretLeft } from '@phosphor-icons/react';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { activeActivities, loading } = useActivities();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 flex justify-between items-center border-b bg-white">
        <div className="flex items-center">
          <img src={currentUser?.photoURL} alt="User Phone" className="w-10 h-10 rounded-full ml-3" />
          <div className="text-right">
            <span className="text-sm text-gray-500 block">שלום,</span>
            <p className="font-bold text-gray-800 leading-tight">{currentUser?.displayName}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 p-2 rounded-full transition-colors">
          <SignOut weight="bold" className="text-2xl" />
        </button>
      </header>

      <main className="flex-grow flex flex-col justify-center p-4 space-y-5">
        <button 
          onClick={() => navigate('/new-activity')} 
          className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 w-full"
        >
          <div className="flex items-center justify-center">
            <PlusCircle weight="fill" className="text-4xl ml-4" />
            <span className="text-2xl font-semibold">פעילות חדשה</span>
          </div>
        </button>

        <button 
          onClick={() => navigate('/manage-groups')} 
          className="bg-white text-gray-700 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border w-full"
        >
          <div className="flex items-center justify-center">
            <UsersThree weight="bold" className="text-4xl ml-4" />
            <span className="text-2xl font-semibold">ניהול קבוצות</span>
          </div>
        </button>

        <button 
          onClick={() => navigate('/archive')} 
          className="bg-white text-gray-700 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border w-full"
        >
          <div className="flex items-center justify-center">
            <ArchiveIcon weight="fill" className="text-4xl ml-4" />
            <span className="text-2xl font-semibold">ארכיון פעילויות</span>
          </div>
        </button>
      </main>

      <footer className="p-4 space-y-4">
        {!loading && activeActivities.length > 0 && activeActivities.map(activity => (
          <div 
            key={activity.id}
            onClick={() => navigate(`/attendance/${activity.id}`)}
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl shadow-xl p-5 cursor-pointer hover:shadow-emerald-400/50 transition-shadow w-full text-right"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">פעילות נוכחית</h3>
              <span className="bg-white/20 px-2 py-1 rounded text-xs">פעיל</span>
            </div>
            <p className="text-2xl font-bold">{activity.name}</p>
            <div className="mt-3 text-sm opacity-90 flex justify-between items-center">
              <span>{activity.groups?.join(', ') || 'אין קבוצות מוגדרות'}</span>
              <div className="flex items-center">
                <span>לניהול הפעילות</span>
                <CaretLeft className="text-lg mr-1" />
              </div>
            </div>
          </div>
        ))}
        {!loading && activeActivities.length === 0 && (
          <p className="text-center text-gray-500">אין פעילות נוכחית.</p>
        )}
      </footer>
    </div>
  );
}
