import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities } from '../hooks/useActivities';
import { ArrowRight, Calendar, UsersThree } from '@phosphor-icons/react';

export default function Archive() {
  const { allActivitiesSorted, loading } = useActivities();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 ml-4 transition-colors">
          <ArrowRight weight="bold" className="text-2xl" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">ארכיון פעילויות</h1>
      </header>

      <main className="flex-grow p-4 pt-6">
        <div className="space-y-4">
          {loading && <p className="text-center text-gray-500">טוען ארכיון...</p>}
          {!loading && allActivitiesSorted.length === 0 && (
            <p className="text-center text-gray-500">אין פעילויות בארכיון.</p>
          )}
          {!loading && allActivitiesSorted.map(activity => {
            const dateStr = activity.createdAt 
              ? new Date(activity.createdAt.seconds * 1000).toLocaleDateString('he-IL') 
              : 'לא זמין';
            const groupsText = activity.groups?.join(', ') || 'אין קבוצות משויכות';
            const isActive = activity.status === 'active';

            return (
              <button 
                key={activity.id}
                onClick={() => navigate(`/history/${activity.id}`)}
                className="w-full text-right bg-white rounded-2xl shadow-md p-5 hover:bg-gray-50 transition-colors block"
              >
                {isActive && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded inline-block mb-2">
                    פעיל עכשיו
                  </span>
                )}
                <h2 className="text-xl font-bold text-gray-900">{activity.name}</h2>
                <div className="mt-2 flex items-center text-gray-500 text-sm">
                  <Calendar className="text-lg ml-2" />
                  <span>נוצר ב: {dateStr}</span>
                </div>
                <div className="mt-2 flex items-center text-gray-500 text-sm">
                  <UsersThree className="text-lg ml-2" />
                  <span>קבוצות: {groupsText}</span>
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  );
}
