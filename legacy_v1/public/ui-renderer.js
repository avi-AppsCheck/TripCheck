/************************
* ui-renderer.js v3.0
* - Refactored Manage Participants Modal (Single Column, Header Stats).
* - Updated Student Import Modal (Word/Excel inputs).
* - Added support for Multiple Active Activities in Dashboard.
************************/

import { Logger } from './debug-logger.js';

export const Renderer = {
    renderAppShell(container, user) {
        Logger.log('Renderer: renderAppShell() called for user:', user.displayName);
        container.innerHTML = `
            <div class="container mx-auto max-w-lg min-h-screen flex flex-col">
                <div id="app-content" class="flex-grow"></div>
                <!-- Global Debug Console -->
                <div id="debug-log-display" class="w-full h-48 overflow-y-auto bg-gray-900 text-green-400 p-2 text-xs font-mono border-t-4 border-gray-700 shadow-inner" dir="ltr">
                    <div class="flex justify-between items-center text-xs text-gray-500 mb-1 border-b border-gray-700 pb-1 sticky top-0 bg-gray-900 z-10">
                        <span>Debug Console (v5.2) | Session: ${new Date().toLocaleTimeString()}</span>
                        <button id="copy-debug-log-btn" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded text-[10px] transition-colors">Copy Log</button>
                    </div>
                </div>
            </div>
            <div id="modal-root"></div>
        `;
        this.renderModals(document.getElementById('modal-root'));
        this.renderPage('home-page', user);
    },

    renderImportStudentsModal(groupId) {
        const modalHtml = `
            <div id="import-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
                    <header class="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
                        <h2 class="text-2xl font-bold">יבוא תלמידים</h2>
                        <button id="close-import-modal" class="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                            <i class="ph-bold ph-x text-xl"></i>
                        </button>
                    </header>
                    
                    <div class="p-6 overflow-y-auto space-y-6">
                        
                        <!-- File Upload Section -->
                        <div class="space-y-4">
                            <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative" id="drop-zone">
                                <input type="file" id="import-file-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls, .docx, .doc, .txt">
                                <i class="ph-duotone ph-file-arrow-up text-5xl text-blue-500 mb-2"></i>
                                <p class="text-lg font-medium text-gray-700">לחץ לבחירת קובץ או גרור לכאן</p>
                                <p class="text-sm text-gray-500 mt-1">אקסל (שמות בעמודה הראשונה), Word או טקסט</p>
                            </div>
                        </div>

                        <!-- Manual Paste Section -->
                        <div>
                             <label class="block text-sm font-medium text-gray-700 mb-2">ערוך רשימה שהועלתה או הדבק רשימת שמות (כל שם בשורה נפרדת):</label>
                             <textarea id="import-text-area" rows="8" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="ישראל ישראלי
משה כהן
דני דין"></textarea>
                        </div>



                    </div>

                    <footer class="p-6 border-t bg-gray-50 flex justify-end gap-3">
                        <button id="close-import-modal-btn" class="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors">ביטול</button>
                        <button id="save-imported-students-btn" disabled class="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                            <i class="ph-bold ph-check"></i>
                            שמור תלמידים
                        </button>
                    </footer>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    renderPage(pageId, context = {}) {
        const pageContainer = document.getElementById('app-content');
        Logger.log(`Renderer: renderPage() called for pageId: '${pageId}'. Container exists:`, !!pageContainer);

        if (!pageContainer) {
            console.error(`Renderer: Cannot render page '${pageId}' because #app-content container was not found.`);
            return;
        }
        const pageRenderers = {
            'login-page': this.getLoginPageHTML, 'home-page': this.getHomePageHTML,
            'new-activity-page': this.getNewActivityPageHTML, 'archive-page': this.getArchivePageHTML,
            'manage-groups-page': this.getManageGroupsPageHTML, 'group-details-page': this.getGroupDetailsPageHTML,
            'attendance-page': this.getAttendancePageHTML, 'activity-history-page': this.getActivityHistoryPageHTML,
        };
        const renderer = pageRenderers[pageId];
        if (renderer) {
            pageContainer.innerHTML = renderer.call(this, context);
            Logger.success(`Renderer: Successfully rendered page '${pageId}'.`);
        } else {
            console.warn(`Renderer: No renderer found for pageId: '${pageId}'.`);
        }
    },
    renderModals(container) {
        Logger.log('Renderer: renderModals() called.');
        container.innerHTML = `
            <div id="summary-modal" class="modal-container hidden"><div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-6 flex flex-col"><h2 class="text-2xl font-bold text-center mb-4">סיכום הבדיקה</h2><div id="summary-content" class="text-center mb-6"></div><div id="summary-details" class="flex-grow overflow-y-auto max-h-64 mb-4 pr-2 space-y-4"></div><button id="close-modal-button" class="mt-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">סגור</button></div></div>
            <div id="confirm-modal" class="modal-container hidden"><div class="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-auto p-6 text-center"><h2 id="confirm-title" class="text-xl font-bold text-gray-800 mb-4">אישור פעולה</h2><p id="confirm-text" class="text-gray-600 mb-6"></p><div class="flex justify-center gap-4"><button id="confirm-no-btn" class="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold">לא</button><button id="confirm-yes-btn" class="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold">כן</button></div></div></div>
            <div id="ask-for-name-modal" class="modal-container hidden"><div class="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-auto p-6 text-center"><h2 class="text-xl font-bold text-gray-800 mb-4">שם הבדיקה</h2><p class="text-gray-600 mb-6">לא נרשם שם לבדיקה. האם תרצה להוסיף שם?</p><div class="flex justify-center gap-4 mb-6"><button id="ask-name-no-btn" class="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold">המשך בלי שם</button><button id="ask-name-yes-btn" class="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold">כן, אוסיף שם</button></div><label class="flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer p-2 rounded-md text-sm"><input type="checkbox" id="ask-name-dont-show-again-checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"><span class="text-gray-600">אל תציג שוב עבור פעילות זו</span></label></div></div>
            <div id="report-absentees-modal" class="modal-container hidden"><div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-6 flex flex-col h-[70vh]"><h2 class="text-2xl font-bold text-center mb-4 text-gray-800">דיווח חסרים</h2><div class="flex-grow relative border rounded-lg bg-gray-50 p-2 mb-4 overflow-hidden"><textarea id="absentees-report-text" class="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-gray-700 font-mono text-sm leading-relaxed" readonly></textarea><button id="copy-report-btn" class="absolute top-2 left-2 bg-white/80 hover:bg-white text-blue-600 p-2 rounded-lg shadow-sm backdrop-blur-sm transition-all" title="העתק ללוח"><i class="ph-bold ph-copy text-xl"></i></button></div><p id="copy-feedback" class="text-center text-green-600 text-sm h-5 mb-2 font-medium opacity-0 transition-opacity">הועתק בהצלחה!</p><button id="close-report-modal-btn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition-colors">סגירה</button></div></div>
        `;
    },

    renderSummaryModal(present, absent, wasArchived) {
        const summaryModal = document.getElementById('summary-modal');
        if (!summaryModal) {
            console.error("renderSummaryModal: Could not find #summary-modal element.");
            return;
        }

        document.getElementById('summary-content').innerHTML = `<p class="text-lg"><span class="font-bold text-green-600">${present.length}</span> נוכחים, <span class="font-bold text-red-600">${absent.length}</span> חסרים</p>`;
        const detailsEl = document.getElementById('summary-details');
        detailsEl.innerHTML = '';

        if (absent.length > 0) {
            const absentContainer = document.createElement('div');
            const absentByGroup = absent.reduce((acc, student) => { const grp = student.groupName || student.group || 'ללא קבוצה'; acc[grp] = (acc[grp] || []).concat(student.name); return acc; }, {});
            let absentHtml = `<h3 class="font-bold text-red-600 text-lg mb-2">חסרים:</h3>`;
            Object.entries(absentByGroup).forEach(([groupName, names]) => { absentHtml += `<div class="mb-2"><p class="font-semibold">${groupName} (${names.length})</p><ul class="list-disc list-inside text-red-700">${names.map(name => `<li>${name}</li>`).join('')}</ul></div>`; });
            absentContainer.innerHTML = absentHtml;
            detailsEl.appendChild(absentContainer);
        }
        if (present.length > 0) {
            const presentContainer = document.createElement('div');
            const presentByGroup = present.reduce((acc, student) => { const grp = student.groupName || student.group || 'ללא קבוצה'; acc[grp] = (acc[grp] || []).concat(student.name); return acc; }, {});
            let presentHtml = `<h3 class="font-bold text-green-600 text-lg mb-2 mt-4">נוכחים:</h3>`;
            Object.entries(presentByGroup).forEach(([groupName, names]) => { presentHtml += `<div class="mb-2"><p class="font-semibold">${groupName} (${names.length})</p><ul class="list-disc list-inside text-green-700">${names.map(name => `<li>${name}</li>`).join('')}</ul></div>`; });
            presentContainer.innerHTML = presentHtml;
            detailsEl.appendChild(presentContainer);
        }

        summaryModal.classList.remove('hidden');
        summaryModal.dataset.wasArchived = wasArchived.toString();
    },

    renderReportAbsenteesModal(reportText) {
        const container = document.getElementById('report-absentees-modal');
        if (container) {
            const textarea = document.getElementById('absentees-report-text');
            if (textarea) textarea.value = reportText;
            container.classList.remove('hidden');
        }
    },

    renderStudentListForAttendance(studentsByGroup, presentIds) {
        const listEl = document.getElementById('attendance-list');
        if (!listEl) {
            console.error("renderStudentListForAttendance: Could not find #attendance-list element.");
            return;
        }

        listEl.innerHTML = '';
        const totalStudents = studentsByGroup.reduce((sum, group) => sum + group.students.length, 0);

        if (totalStudents === 0) {
            listEl.innerHTML = `<p class="text-center text-gray-500">לא נמצאו תלמידים בקבוצות המשויכות.</p>`;
            return;
        }

        studentsByGroup.forEach(group => {
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'group-block mb-4 p-2 border rounded-lg bg-white';

            const header = document.createElement('div');
            header.className = 'flex items-center justify-between bg-gray-100 p-2 rounded-t-md';
            header.innerHTML = `
                <h3 class="font-bold text-gray-800">${group.groupName}</h3>
                <i class="ph-bold ph-dots-six-vertical drag-handle text-gray-500 text-xl"></i>
            `;
            groupWrapper.appendChild(header);

            const studentListUl = document.createElement('ul');
            studentListUl.className = 'space-y-3 mt-2';

            group.students.forEach(student => {
                const li = document.createElement('li');
                li.dataset.studentId = student.id;
                li.className = 'student-item flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm cursor-pointer transition-all duration-200 ease-in-out border-2 border-transparent';

                const isPresent = presentIds.has(student.id);
                if (isPresent) {
                    li.classList.add('present', 'bg-green-100', 'border-green-500');
                }

                const iconClass = isPresent ? 'ph-fill ph-check-circle text-2xl text-green-600' : 'ph ph-circle text-2xl text-gray-300';
                li.innerHTML = `<span class="font-medium text-gray-800">${student.name}</span><i class="${iconClass} pointer-events-none"></i>`;

                studentListUl.appendChild(li);
            });
            groupWrapper.appendChild(studentListUl);
            listEl.appendChild(groupWrapper);
        });
    },

    updateAttendanceCounter(presentCount, totalCount) {
        const counterEl = document.getElementById('attendance-counter');
        if (!counterEl) return;
        counterEl.textContent = `${presentCount} / ${totalCount}`;
        counterEl.className = `text-6xl font-bold transition-colors duration-300 ${presentCount === totalCount && totalCount > 0 ? 'text-green-500' : 'text-red-600'}`;
    },

    updateStudentItemUI(studentItem) {
        const icon = studentItem.querySelector('i');
        const isPresent = studentItem.classList.contains('present');

        if (isPresent) {
            studentItem.classList.add('bg-green-100', 'border-green-500');
            icon.className = 'ph-fill ph-check-circle text-2xl text-green-600 pointer-events-none';
        } else {
            studentItem.classList.remove('bg-green-100', 'border-green-500');
            icon.className = 'ph ph-circle text-2xl text-gray-300 pointer-events-none';
        }
    },

    getLoginPageHTML: () => `<div id="login-page"><div class="container mx-auto max-w-lg min-h-screen flex flex-col items-center justify-center p-4"><div class="text-center"><img src="TripCheck%20New_Logo.png?v=5.2" alt="TripCheck Logo" class="w-80 h-80 mx-auto mb-4"/><h1 class="text-5xl font-bold text-gray-800">TripCheck</h1><p class="text-gray-500 mt-2 mb-8">ניהול נוכחות בשטח בקלות</p><button id="login-button" class="bg-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all mx-auto border"><div class="flex items-center justify-center pointer-events-none"><svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.486-11.189-8.188l-6.571,4.819C9.656,39.663,16.318,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.638,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg><span class="mr-3 font-semibold text-gray-700">התחבר עם חשבון גוגל</span></div></button></div><div id="debug-log-display" class="mt-8 w-full max-w-lg h-32 overflow-y-auto bg-gray-900 text-green-400 p-2 text-xs font-mono border rounded text-left shadow-inner" dir="ltr" style="display:block;"><div class="text-xs text-gray-500 mb-1 border-b border-gray-700 pb-1 sticky top-0 bg-gray-900">Debug Console (Login)</div></div></div></div>`,
    getHomePageHTML: (user) => `<div id="home-page" class="min-h-screen flex flex-col"><header class="p-4 flex justify-between items-center border-b"><div class="flex items-center"><img id="user-photo" src="${user.photoURL}" alt="User Photo" class="w-10 h-10 rounded-full ml-3"><div><span class="text-sm text-gray-500">שלום,</span><p id="user-display-name" class="font-bold text-gray-800">${user.displayName}</p></div></div><button id="logout-button" class="text-gray-500 hover:text-red-500 p-2 rounded-full"><i class="ph-bold ph-sign-out text-2xl"></i></button></header><main class="flex-grow flex flex-col justify-center p-4 space-y-5"><button data-target="new-activity-page" class="nav-btn bg-blue-600 text-white rounded-2xl p-8 shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1"><div class="flex items-center justify-center"><i class="ph-fill ph-plus-circle text-4xl ml-4"></i><span class="text-2xl font-semibold">פעילות חדשה</span></div></button><button data-target="manage-groups-page" class="nav-btn bg-white text-gray-700 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border"><div class="flex items-center justify-center"><i class="ph-bold ph-users-three text-4xl ml-4"></i><span class="text-2xl font-semibold">ניהול קבוצות</span></div></button><button data-target="archive-page" class="nav-btn bg-white text-gray-700 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border"><div class="flex items-center justify-center"><i class="ph-fill ph-archive text-4xl ml-4"></i><span class="text-2xl font-semibold">ארכיון פעילויות</span></div></button></main><footer id="active-activity-banner" class="p-4"></footer></div>`,
    getNewActivityPageHTML: () => `<div id="new-activity-page" class="flex flex-col bg-white h-full relative"><header class="p-4 flex items-center justify-between border-b sticky top-0 bg-white z-10"><h1 class="text-2xl font-bold text-gray-800">יצירת פעילות חדשה</h1><button data-target="home-page" class="nav-btn text-gray-500 hover:text-gray-800"><i class="ph-bold ph-x text-2xl"></i></button></header><main class="flex-grow p-6 space-y-8"><div><label for="activity-name" class="block text-lg font-medium text-gray-700 mb-2">שם הפעילות</label><input type="text" id="activity-name" class="block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="לדוגמה: טיול שנתי לגליל"></div><div><label class="block text-lg font-medium text-gray-700 mb-2">שייך קבוצות</label><div id="groups-selection-new-activity" class="space-y-3"></div></div><div class="pt-4"><button id="save-activity-button" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"><i class="ph-bold ph-check text-2xl"></i>שמירה ויצירת פעילות</button></div></main></div>`,
    getArchivePageHTML: () => `<div id="archive-page" class="min-h-screen flex flex-col"><header class="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b"><button data-target="home-page" class="nav-btn text-gray-500 hover:text-gray-800 ml-4"><i class="ph-bold ph-arrow-right text-2xl"></i></button><h1 class="text-2xl font-bold text-gray-800">ארכיון פעילויות</h1></header><main class="flex-grow p-4 pt-6"><div id="archive-list" class="space-y-4"></div></main></div>`,
    getManageGroupsPageHTML: () => `<div id="manage-groups-page" class="min-h-screen flex flex-col"><header class="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b justify-between"><div class="flex items-center"><button data-target="home-page" class="nav-btn text-gray-500 hover:text-gray-800 ml-4"><i class="ph-bold ph-arrow-right text-2xl"></i></button><h1 class="text-2xl font-bold text-gray-800">ניהול קבוצות</h1></div><button id="sort-groups-btn" class="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="מיין לפי א-ב"><i class="ph-bold ph-sort-ascending text-2xl"></i></button></header><main class="flex-grow p-4 pt-6 space-y-6"><div><form id="add-group-form" class="flex items-center gap-2"><input type="text" id="new-group-name" class="flex-grow block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" placeholder="שם קבוצה חדשה (למשל, כיתה י'3)"><button type="submit" class="bg-blue-600 text-white p-2 rounded-md shadow-sm hover:bg-blue-700"><i class="ph-bold ph-plus text-2xl"></i></button></form></div><div class="space-y-3" id="groups-list-manage"></div></main></div>`,
    getGroupDetailsPageHTML: (context) => `<div id="group-details-page" class="min-h-screen flex flex-col"><header class="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b"><button data-target="manage-groups-page" class="nav-btn text-gray-500 hover:text-gray-800 ml-4"><i class="ph-bold ph-arrow-right text-2xl"></i></button><h1 id="group-details-title" class="text-2xl font-bold text-gray-800">${context.groupName || 'שם הקבוצה'}</h1></header><main class="flex-grow p-4 pt-6 space-y-6"><div><form id="add-student-form" class="flex items-center gap-2 mb-2"><input type="text" id="new-student-name" class="flex-grow block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" placeholder="שם תלמיד/ה חדש/ה"><button type="submit" class="bg-blue-600 text-white p-2 rounded-md shadow-sm hover:bg-blue-700"><i class="ph-bold ph-plus text-2xl"></i></button></form><button id="import-students-btn" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 border border-gray-300 transition-colors"><i class="ph-bold ph-file-arrow-up text-xl"></i>יבוא תלמידים מקובץ (Excel, Word, Text)</button></div><div class="space-y-3" id="students-list"></div></main></div>`,
    getAttendancePageHTML: () => `<div id="attendance-page" class="h-screen flex flex-col overflow-hidden bg-gray-100"><header class="flex-none sticky top-0 bg-gray-100/95 backdrop-blur-sm z-10 pt-4 px-4"><div class="flex items-center justify-between py-4"><div class="w-10"></div><h1 id="attendance-activity-title" class="text-2xl font-bold text-gray-800 text-center mx-2 truncate flex-grow">טוען פעילות...</h1><button data-target="home-page" class="nav-btn bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition flex-shrink-0 w-10 h-10 flex items-center justify-center"><i class="ph ph-caret-right text-2xl"></i></button></div><div class="text-center pb-4"><p class="text-gray-600 font-medium">נוכחים</p><div id="attendance-counter" class="text-6xl font-bold transition-colors duration-300">0 / 0</div></div></header><main class="bg-white rounded-t-2xl shadow-lg flex-grow flex flex-col p-6 overflow-hidden"><div class="flex-none mb-4"><label for="check-name" class="block text-lg font-semibold text-gray-800 mb-2 text-center">שם הבדיקה</label><input type="text" id="check-name" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-lg" placeholder="לדוגמה: עלייה לאוטובוס"></div><div class="flex-none flex justify-center items-center gap-4 mb-4 text-sm"><button id="manage-participants-btn" class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2"><i class="ph-bold ph-users-three text-lg"></i> ערוך משתתפים</button><label class="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer p-2 rounded-md hover:bg-gray-50"><input type="checkbox" id="hide-present-checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"><span class="text-gray-700 font-medium">הסתר נוכחים</span></label></div><div class="flex-grow overflow-y-auto pr-2 min-h-0"><div id="attendance-list" class="space-y-4 pb-2"></div></div><div class="flex-none mt-4 flex flex-col gap-3 pb-2"><button id="finish-check-button" type="button" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md">סיום בדיקה וסיכום נוכחות</button><button id="end-activity-btn" type="button" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-md flex items-center justify-center gap-2">סיום פעילות/טיול</button></div></main></div>`,
    getActivityHistoryPageHTML: () => `<div id="activity-history-page" class="min-h-screen flex flex-col"><header class="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex items-center border-b"><button data-target="archive-page" class="nav-btn text-gray-500 hover:text-gray-800 ml-4"><i class="ph-bold ph-arrow-right text-2xl"></i></button><h1 id="history-activity-title" class="text-2xl font-bold text-gray-800">היסטוריית בדיקות</h1></header><main id="history-list" class="flex-grow p-4 pt-6 space-y-4"></main></div>`,

    renderGroupSelection(groups, allStudents) {
        const container = document.getElementById('groups-selection-new-activity');
        if (!container) return;

        container.innerHTML = '';
        if (groups.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500">יש ליצור קבוצות במסך "ניהול קבוצות" תחילה.</p>`;
            return;
        }

        // Group students by groupId for easy access
        const studentsMap = {};
        allStudents.forEach(s => {
            if (!studentsMap[s.groupId]) studentsMap[s.groupId] = [];
            studentsMap[s.groupId].push(s);
        });

        groups.forEach(group => {
            const groupStudents = studentsMap[group.id] || [];
            const hasStudents = groupStudents.length > 0;

            const groupEl = document.createElement('div');
            groupEl.className = "border border-gray-200 rounded-lg overflow-hidden";

            // Header
            groupEl.innerHTML = `
                <div class="flex items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-3 group-checkbox" data-group-id="${group.id}">
                    <div class="flex-grow font-medium text-gray-900 cursor-pointer group-header group-toggle" data-group-id="${group.id}">
                        ${group.name} <span class="text-xs text-gray-500">(${groupStudents.length} תלמידים)</span>
                    </div>
                    ${hasStudents ? `<button class="p-1 hover:bg-gray-200 rounded-full transition-colors group-toggle" data-group-id="${group.id}">
                        <i class="ph-bold ph-caret-down text-lg transition-transform" id="arrow-${group.id}"></i>
                    </button>` : ''}
                </div>
                ${hasStudents ? `
                <div id="students-container-${group.id}" class="hidden bg-white border-t border-gray-100 p-2 space-y-1">
                    ${groupStudents.map(student => `
                        <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2 student-checkbox" 
                                data-student-id="${student.id}" 
                                data-group-id="${group.id}"
                                data-student-name="${student.name}"
                                data-group-name="${group.name}">
                            <span class="text-sm text-gray-700">${student.name}</span>
                        </label>
                    `).join('')}
                </div>` : ''}
            `;
            container.appendChild(groupEl);
        });
    },

    renderManageParticipantsModal(currentParticipants, allGroups, allStudents) {
        // Group all available students by group
        const studentsMap = {};
        allStudents.forEach(s => {
            if (!studentsMap[s.groupId]) studentsMap[s.groupId] = [];
            studentsMap[s.groupId].push(s);
        });

        // Current participant IDs for quick lookup
        const currentIds = new Set(currentParticipants.map(p => p.id));

        const modalHtml = `
            <div id="manage-participants-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
                <header class="p-4 md:p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex justify-between items-center flex-none">
                    <div>
                        <h2 class="text-xl md:text-2xl font-bold">ניהול משתתפים בפעילות</h2>
                        <p class="text-indigo-100 text-xs md:text-sm mt-1">סה"כ משתתפים: <span id="participants-total-count" class="font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">${currentParticipants.length}</span></p>
                    </div>
                    <button id="close-manage-modal" class="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                        <i class="ph-bold ph-x text-xl"></i>
                    </button>
                </header>

                <div class="flex-grow flex flex-col overflow-hidden bg-gray-50">
                    <div class="p-3 md:p-4 border-b bg-white sticky top-0 z-20 shadow-sm">
                        <input type="text" id="search-students-input" placeholder="חפש תלמיד או כיתה..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm">
                    </div>
                    <div class="overflow-y-auto p-3 md:p-4 space-y-3 flex-grow custom-scrollbar" id="available-students-list">
                        <!-- Accordions will be injected here via JS -->
                    </div>
                </div>

                <footer class="p-4 border-t bg-white flex justify-end gap-3 flex-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button id="close-manage-modal-btn" class="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">ביטול</button>
                    <button id="save-participants-btn" class="px-8 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2">
                        <i class="ph-bold ph-floppy-disk"></i>
                        שמור שינויים
                    </button>
                </footer>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};

export const UIHelpers = {
    async askToNameCheck(activityId) {
        return new Promise((resolve) => {
            const modalRoot = document.getElementById('modal-root');
            if (!modalRoot) return resolve({ wantsToName: false });

            modalRoot.innerHTML = `
                <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                            <i class="ph-bold ph-pencil-simple text-2xl text-blue-600"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-900 mb-2">תן שם לבדיקה</h3>
                        <p class="text-gray-500 text-sm mb-6">האם תרצה לתת שם ייחודי לבדיקה זו? (למשל: "יציאה למסלול")</p>
                        <div class="flex flex-col gap-3">
                            <button id="give-name-btn" class="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition">כן, תן שם</button>
                            <button id="skip-name-btn" class="w-full bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition">דלג (השתמש בשעה)</button>
                            <label class="flex items-center justify-center gap-2 text-sm text-gray-400 mt-2 cursor-pointer">
                                <input type="checkbox" id="dont-ask-name-again" class="rounded text-blue-600 focus:ring-blue-500">
                                    <span>אל תשאל שוב בפעילות זו</span>
                            </label>
                        </div>
                    </div>
                </div>
             `;

            const giveNameBtn = modalRoot.querySelector('#give-name-btn');
            const skipNameBtn = modalRoot.querySelector('#skip-name-btn');
            const dontAskCheckbox = modalRoot.querySelector('#dont-ask-name-again');

            giveNameBtn.onclick = () => {
                modalRoot.innerHTML = '';
                resolve({ wantsToName: true });
            };

            skipNameBtn.onclick = () => {
                const dontAsk = dontAskCheckbox.checked;
                // Currently user settings save is disabled to avoid permission errors
                // if (dontAsk) { FirestoreService.saveUserSetting(`dontAskForName_${ activityId } `, true); }
                modalRoot.innerHTML = '';
                resolve({ wantsToName: false });
            };
        });
    },

    async confirmAction(title, message) {
        return new Promise((resolve) => {
            const modalRoot = document.getElementById('modal-root');
            if (!modalRoot) return resolve(false);

            modalRoot.innerHTML = `
                < div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" >
                    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                            <i class="ph-bold ph-warning text-2xl text-yellow-600"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-900 mb-2">${title}</h3>
                        <p class="text-gray-500 text-sm mb-6">${message}</p>
                        <div class="flex gap-3">
                            <button id="confirm-yes-btn" class="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition">כן</button>
                            <button id="confirm-no-btn" class="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition">ביטול</button>
                        </div>
                    </div>
                </div >
    `;

            modalRoot.querySelector('#confirm-yes-btn').onclick = () => {
                modalRoot.innerHTML = '';
                resolve(true);
            };

            modalRoot.querySelector('#confirm-no-btn').onclick = () => {
                modalRoot.innerHTML = '';
                resolve(false);
            };
        });
    }
};
