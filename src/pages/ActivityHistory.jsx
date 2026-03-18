import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, DownloadSimple, ShareNetwork, CircleNotch } from '@phosphor-icons/react';
import { useActivity } from '../hooks/useActivity';
import { useActivityHistory } from '../hooks/useActivityHistory';
import { downloadReportPDF, shareReportPDF } from '../utils/pdfGenerator';

export default function ActivityHistory() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  
  const { activity, loading: activityLoading } = useActivity(activityId);
  const { history, loading: historyLoading } = useActivityHistory(activityId);

  if (activityLoading) return <div className="p-8 text-center text-gray-500">טוען...</div>;
  if (!activity) return <div className="p-8 text-center text-red-500">הפעילות לא נמצאה.</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b">
        <button 
          onClick={() => navigate(activity.status === 'archived' ? '/archive' : `/attendance/${activity.id}`)} 
          className="text-gray-500 hover:text-gray-800 ml-4 transition-colors"
        >
          <ArrowRight weight="bold" className="text-2xl" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 truncate">היסטוריה: {activity.name}</h1>
      </header>

      <main className="flex-grow p-4 pt-6 space-y-4">
        {historyLoading && (
          <div className="text-center py-8">
            <CircleNotch weight="bold" className="animate-spin text-4xl text-blue-500 mx-auto mb-2" />
            <p className="text-gray-500">טוען היסטוריית בדיקות...</p>
          </div>
        )}
        
        {!historyLoading && history.length === 0 && (
          <p className="text-center text-gray-500 py-8">לא בוצעו בדיקות נוכחות לפעילות זו.</p>
        )}

        {!historyLoading && history.map(check => {
          const date = check.checkedAt ? new Date(check.checkedAt.seconds * 1000) : null;
          const time = date ? date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
          const dateStr = date ? date.toLocaleDateString('he-IL') : 'לא זמין';
          
          const checkTitle = check.name || `${dateStr} - ${time}`;
          const checkSubTitle = check.name ? `(${dateStr} - ${time})` : '';

          return (
             <div key={check.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">{checkTitle}</h3>
                        {checkSubTitle && <span className="text-gray-500 text-sm block mt-0.5">{checkSubTitle}</span>}
                    </div>
                    <div className="flex gap-2">
                        <button 
                          onClick={() => downloadReportPDF(activity.name, check)}
                          className="hidden md:flex text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" 
                          title="הורד קובץ PDF"
                        >
                            <DownloadSimple weight="bold" className="text-2xl" />
                        </button>
                        <button 
                          onClick={() => shareReportPDF(activity.name, check)}
                          className="flex md:hidden text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors" 
                          title="שתף קובץ PDF"
                        >
                            <ShareNetwork weight="bold" className="text-2xl" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                        <h4 className="font-semibold text-green-700 border-b border-green-200 pb-2 mb-3">
                          נוכחים <span className="text-sm bg-green-200 text-green-800 px-2 py-0.5 rounded-full mr-1">{check.present?.length || 0}</span>
                        </h4>
                        <ul className="text-sm text-gray-700 max-h-40 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                          {check.present?.map((s, i) => (
                            <li key={i}>{s.name} <span className="text-xs text-gray-500">({s.groupName || ''})</span></li>
                          ))}
                          {(!check.present || check.present.length === 0) && <li className="text-gray-400">אין נתונים</li>}
                        </ul>
                    </div>
                    <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                        <h4 className="font-semibold text-red-700 border-b border-red-200 pb-2 mb-3">
                          חסרים <span className="text-sm bg-red-200 text-red-800 px-2 py-0.5 rounded-full mr-1">{check.absent?.length || 0}</span>
                        </h4>
                        <ul className="text-sm text-gray-700 max-h-40 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                          {check.absent?.map((s, i) => (
                            <li key={i}>{s.name} <span className="text-xs text-gray-500">({s.groupName || ''})</span></li>
                          ))}
                          {(!check.absent || check.absent.length === 0) && <li className="text-gray-400">אין נתונים</li>}
                        </ul>
                    </div>
                </div>
             </div>
          )
        })}
      </main>
    </div>
  );
}
