/************************
* firestore-service.js v3.0
* - Removed auto-archiving to support Multiple Concurrent Activities.
* - Updated renderActivities to display multiple active cards.
* - Added updateActivityParticipants for managing activity-specific lists.
************************/

import { db, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs, doc, updateDoc, writeBatch, deleteDoc } from './firebase-config.js';
import { Logger } from './debug-logger.js';

export const FirestoreService = {
    _currentUser: null, _allActivities: [], _allGroups: [], _userSettings: {},
    _unsubscribeActivities: null, _unsubscribeGroups: null, _unsubscribeStudents: null,

    setCurrentUser(user) { this._currentUser = user; },
    getActivityById(id) { return this._allActivities.find(act => act.id === id); },

    async endCurrentActivity(activityId) {
        if (!this._currentUser) throw new Error("User not authenticated");
        if (!activityId) throw new Error("Activity ID is required");

        Logger.log(`FirestoreService: Ending activity ${activityId}`);
        const activityRef = doc(db, "activities", activityId);
        await updateDoc(activityRef, {
            status: "archived",
            archivedAt: serverTimestamp()
        });
        Logger.success(`FirestoreService: Activity ${activityId} archived successfully.`);
    },

    loadActivities() {
        if (!this._currentUser) return;
        if (this._unsubscribeActivities) this._unsubscribeActivities();
        const q = query(collection(db, "activities"), where("createdBy", "==", this._currentUser.uid));
        this._unsubscribeActivities = onSnapshot(q, (snapshot) => {
            this._allActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderActivities();
        });
    },

    loadGroups() {
        if (!this._currentUser) return;
        if (this._unsubscribeGroups) this._unsubscribeGroups();
        const q = query(collection(db, "groups"), where("createdBy", "==", this._currentUser.uid));
        this._unsubscribeGroups = onSnapshot(q, (snapshot) => {
            this._allGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort groups: Primary by 'order' (asc), Secondary by 'name' (asc)
            this._allGroups.sort((a, b) => {
                const orderA = a.order !== undefined ? a.order : 9999;
                const orderB = b.order !== undefined ? b.order : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name, 'he');
            });
            this.renderGroups();
        });
    },

    renderActivities() {
        const activeActivities = this._allActivities.filter(act => act.status === 'active').sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const archivedActivities = this._allActivities.filter(act => act.status !== 'active').sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        const bannerContainer = document.getElementById('active-activity-banner');
        if (bannerContainer) {
            bannerContainer.innerHTML = '';
            if (activeActivities.length > 0) {
                activeActivities.forEach(activeActivity => {
                    const banner = document.createElement('div');
                    banner.className = "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-5 cursor-pointer hover:shadow-emerald-400/50 transition-shadow mb-4 last:mb-0";
                    banner.dataset.activityId = activeActivity.id;
                    const groupsText = activeActivity.groups?.join(', ') || 'אין קבוצות משויכות';
                    banner.innerHTML = `
                        <div class="pointer-events-none">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="font-bold text-lg">פעילות נוכחית</h3>
                                <span class="bg-white/20 px-2 py-1 rounded text-xs">פעיל</span>
                            </div>
                            <p class="text-2xl font-bold">${activeActivity.name}</p>
                            <div class="mt-3 text-sm opacity-90 flex justify-between items-center">
                                <span>${groupsText}</span>
                                <div class="flex items-center">
                                    <span>לניהול הפעילות</span>
                                    <i class="ph ph-caret-left text-lg mr-1"></i>
                                </div>
                            </div>
                        </div>`;
                    bannerContainer.appendChild(banner);
                });
            } else {
                bannerContainer.innerHTML = `<p class="text-center text-gray-500">אין פעילות נוכחית.</p>`;
            }
        }

        const archiveListElement = document.getElementById('archive-list');
        if (archiveListElement) {
            archiveListElement.innerHTML = '';
            if (archivedActivities.length === 0) {
                archiveListElement.innerHTML = `<p class="text-center text-gray-500">אין פעילויות בארכיון.</p>`;
            } else {
                archivedActivities.forEach(activity => {
                    const card = document.createElement('button');
                    card.className = "w-full text-right bg-white rounded-2xl shadow-md p-5 hover:bg-gray-50 transition-colors";
                    card.dataset.activityId = activity.id;
                    const date = activity.createdAt ? new Date(activity.createdAt.seconds * 1000).toLocaleDateString('he-IL') : 'לא זמין';
                    const groupsText = activity.groups?.join(', ') || 'אין קבוצות משויכות';
                    card.innerHTML = `<h2 class="text-xl font-bold text-gray-900 pointer-events-none">${activity.name}</h2><div class="mt-4 flex items-center text-gray-500 text-sm pointer-events-none"><i class="ph ph-calendar text-lg ml-2"></i><span>נוצר ב: ${date}</span></div><div class="mt-2 flex items-center text-gray-500 text-sm pointer-events-none"><i class="ph ph-users-three text-lg ml-2"></i><span>קבוצות: ${groupsText}</span></div>`;
                    archiveListElement.appendChild(card);
                });
            }
        }
    },

    renderGroups() {
        const groupsListManage = document.getElementById('groups-list-manage');
        if (groupsListManage) {
            groupsListManage.innerHTML = '';
            if (this._allGroups.length === 0) {
                groupsListManage.innerHTML = `<p class="text-center text-gray-500">אין קבוצות. צור את הקבוצה הראשונה שלך!</p>`;
            } else {
                this._allGroups.forEach(group => {
                    const groupItem = document.createElement('div');
                    groupItem.className = "group-list-item flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-all";
                    groupItem.dataset.id = group.id;

                    groupItem.innerHTML = `
                        <div class="drag-handle cursor-move p-2 text-gray-400 hover:text-gray-600">
                            <i class="ph-bold ph-dots-six-vertical text-xl"></i>
                        </div>
                        <button class="flex-grow text-right p-2 font-medium text-gray-800 hover:text-blue-600 transition-colors" data-action="view-group" data-group-id="${group.id}" data-group-name="${group.name}">
                            ${group.name}
                        </button>
                        <button class="edit-group-btn p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-full hover:bg-blue-50" data-group-id="${group.id}" data-group-name="${group.name}" title="ערוך קבוצה">
                            <i class="ph-bold ph-pencil-simple text-xl"></i>
                        </button>
                        <button class="delete-group-btn p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50" data-group-id="${group.id}" data-group-name="${group.name}" title="מחק קבוצה">
                            <i class="ph-bold ph-trash text-xl"></i>
                        </button>
                    `;
                    groupsListManage.appendChild(groupItem);
                });

                if (window.Sortable) {
                    new window.Sortable(groupsListManage, {
                        animation: 150,
                        handle: '.drag-handle',
                        ghostClass: 'bg-blue-50',
                        onEnd: (evt) => {
                            const newOrderIds = Array.from(groupsListManage.children).map(child => child.dataset.id);
                            this.updateGroupsOrder(newOrderIds);
                        }
                    });
                }
            }
        }
        const groupsSelectionNewActivity = document.getElementById('groups-selection-new-activity');
        if (groupsSelectionNewActivity) {
            groupsSelectionNewActivity.innerHTML = '';
            if (this._allGroups.length === 0) {
                groupsSelectionNewActivity.innerHTML = `<p class="text-center text-gray-500">יש ליצור קבוצות במסך "ניהול קבוצות" תחילה.</p>`;
            } else {
                this._allGroups.forEach(group => {
                    const checkboxLabel = document.createElement('label');
                    checkboxLabel.className = "flex items-center p-3 bg-gray-50 rounded-lg";
                    checkboxLabel.innerHTML = `<input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-3"><span class="text-gray-900">${group.name}</span>`;
                    groupsSelectionNewActivity.appendChild(checkboxLabel);
                });
            }
        }
    },

    async saveNewActivity(activityName, selectedGroups, participantList) {
        if (!this._currentUser) throw new Error("User not authenticated");
        const batch = writeBatch(db);
        // Removed auto-archiving logic to allow multiple concurrent activities
        const newActivityRef = doc(collection(db, "activities"));
        batch.set(newActivityRef, {
            name: activityName,
            groups: selectedGroups, // Keep for legacy/display 
            participants: participantList, // New source of truth
            createdBy: this._currentUser.uid,
            createdAt: serverTimestamp(),
            status: 'active'
        });
        await batch.commit();
    },

    async updateActivityParticipants(activityId, newParticipants) {
        if (!this._currentUser) return;
        const activityRef = doc(db, "activities", activityId);
        await updateDoc(activityRef, { participants: newParticipants });
    },

    async getAllStudentsFromAllGroups() {
        if (!this._currentUser) return [];
        const groupsQuery = query(collection(db, "groups"), where("createdBy", "==", this._currentUser.uid));
        const groupDocs = await getDocs(groupsQuery);

        let allStudents = [];
        for (const groupDoc of groupDocs.docs) {
            const groupName = groupDoc.data().name;
            const groupId = groupDoc.id;
            const studentDocs = await getDocs(collection(db, "groups", groupId, "students"));
            studentDocs.forEach(doc => {
                allStudents.push({
                    id: doc.id,
                    name: doc.data().name,
                    groupId: groupId,
                    groupName: groupName
                });
            });
        }
        return allStudents;
    },

    async saveNewGroup(groupName) {
        if (!this._currentUser) throw new Error("User not authenticated");
        await addDoc(collection(db, "groups"), { name: groupName, createdBy: this._currentUser.uid });
    },

    loadStudents(groupId, groupName) {
        if (this._unsubscribeStudents) this._unsubscribeStudents();
        document.getElementById('group-details-title').textContent = groupName;
        document.getElementById('add-student-form').dataset.groupId = groupId;
        const q = query(collection(db, "groups", groupId, "students"));
        this._unsubscribeStudents = onSnapshot(q, (snapshot) => {
            const listEl = document.getElementById('students-list');
            listEl.innerHTML = '';
            if (snapshot.empty) {
                listEl.innerHTML = `<p class="text-center text-gray-500">אין תלמידים בקבוצה זו.</p>`;
            } else {
                snapshot.docs.forEach(doc => {
                    const student = { id: doc.id, ...doc.data() };
                    const card = document.createElement('div');
                    card.className = "flex justify-between items-center bg-gray-50 p-3 rounded-lg";
                    card.innerHTML = `<span class="font-medium text-gray-800">${student.name}</span><button data-group-id="${groupId}" data-student-id="${student.id}" data-student-name="${student.name}" class="delete-student-btn text-gray-400 hover:text-red-500 p-1 rounded-full"><i class="ph-bold ph-trash text-xl pointer-events-none"></i></button>`;
                    listEl.appendChild(card);
                });
            }
        });
    },

    async saveNewStudent(groupId, studentName) {
        await addDoc(collection(db, "groups", groupId, "students"), { name: studentName, addedAt: serverTimestamp() });
    },

    async batchSaveStudents(groupId, studentNames) {
        if (!this._currentUser || !studentNames.length) return;
        const batch = writeBatch(db);
        const studentsRef = collection(db, "groups", groupId, "students");

        studentNames.forEach(name => {
            const newStudentRef = doc(studentsRef);
            batch.set(newStudentRef, { name: name, addedAt: serverTimestamp() });
        });

        await batch.commit();
        Logger.success(`FirestoreService: Batch saved ${studentNames.length} students to group ${groupId}.`);
    },

    async deleteStudent(groupId, studentId) {
        await deleteDoc(doc(db, "groups", groupId, "students", studentId));
    },

    async startAttendanceCheck(activity) {
        if (!this._currentUser) throw new Error("User not authenticated");
        if (!activity.groups || activity.groups.length === 0) {
            return { studentsByGroup: [], allStudents: [] };
        }

        // Check if activity has "participants" field (New Model)
        if (activity.participants && activity.participants.length > 0) {
            Logger.log('Using new "participants" model for attendance.');
            let studentsByGroup = {};
            let allStudents = activity.participants;

            allStudents.forEach(student => {
                if (!studentsByGroup[student.groupName]) {
                    studentsByGroup[student.groupName] = [];
                }
                studentsByGroup[student.groupName].push(student);
            });

            // Convert map to array
            const sortedGroups = Object.keys(studentsByGroup).sort((a, b) => a.localeCompare(b, 'he'));
            const result = sortedGroups.map(gName => ({
                groupName: gName,
                students: studentsByGroup[gName].sort((a, b) => a.name.localeCompare(b.name, 'he'))
            }));

            return { studentsByGroup: result, allStudents };
        }

        // Fallback to "groups" field (Legacy Model)
        Logger.log('Using legacy "groups" model for attendance.');
        const groupsQuery = query(collection(db, "groups"), where("name", "in", activity.groups), where("createdBy", "==", this._currentUser.uid));
        const groupDocs = await getDocs(groupsQuery);
        if (groupDocs.empty) {
            console.warn("No matching groups found in database for activity:", activity.name);
            return { studentsByGroup: [], allStudents: [] };
        }

        let studentsByGroup = [];
        let allStudents = [];
        for (const groupDoc of groupDocs.docs) {
            const studentDocs = await getDocs(collection(db, "groups", groupDoc.id, "students"));
            const students = studentDocs.docs.map(d => ({ id: d.id, groupName: groupDoc.data().name, groupId: groupDoc.id, name: d.data().name })); // Normalized field names
            studentsByGroup.push({ groupName: groupDoc.data().name, students: students });
            allStudents.push(...students);
        }

        studentsByGroup.sort((a, b) => a.groupName.localeCompare(b.groupName, 'he'));

        return { studentsByGroup, allStudents };
    },

    async saveAttendanceCheck(activityId, shouldArchive, checkName, present, absent) {
        try {
            const batch = writeBatch(db);
            const checksRef = doc(collection(db, "activities", activityId, "checks"));
            batch.set(checksRef, { name: checkName, checkedAt: serverTimestamp(), checkedBy: this._currentUser.uid, present, absent });

            if (shouldArchive) {
                Logger.log(`FirestoreService: Archiving activity ${activityId}.`);
                batch.update(doc(db, "activities", activityId), { status: "archived", archivedAt: serverTimestamp() });
            }

            await batch.commit();
            Logger.success('FirestoreService: Batch commit successful.');
            return true;
        } catch (error) {
            Logger.error("FirestoreService: CRITICAL Error during batch commit:", error);
            alert("שגיאה קריטית בשמירת הנתונים לשרת.");
            return false;
        }
    },

    _generateCheckReport(activityName, check) {
        const date = check.checkedAt ? new Date(check.checkedAt.seconds * 1000) : new Date();
        const dateStr = date.toLocaleDateString('he-IL');
        const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        let report = `*דוח נוכחות - ${activityName}*\n`;
        report += `בדיקה: ${check.name || 'ללא שם'}\n`;
        report += `תאריך: ${dateStr} ${timeStr}\n\n`;

        if (check.present && check.present.length > 0) {
            report += `*נוכחים (${check.present.length}):*\n`;
            check.present.forEach(p => report += `- ${p.name} (${p.group})\n`);
            report += `\n`;
        } else {
            report += `*אין נוכחים*\n\n`;
        }

        if (check.absent && check.absent.length > 0) {
            report += `*חסרים (${check.absent.length}):*\n`;
            check.absent.forEach(a => report += `- ${a.name} (${a.group})\n`);
            report += `\n`;
        } else {
            report += `*אין חסרים*\n\n`;
        }

        return report;
    },

    _generateReportHTML(activityName, check) {
        const date = check.checkedAt ? new Date(check.checkedAt.seconds * 1000) : new Date();
        const dateStr = date.toLocaleDateString('he-IL');
        const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        const presentList = check.present && check.present.length ? check.present.map(s => `<li>${s.name} (${s.group})</li>`).join('') : '<li>אין נתונים</li>';
        const absentList = check.absent && check.absent.length ? check.absent.map(s => `<li>${s.name} (${s.group})</li>`).join('') : '<li>אין נתונים</li>';

        const element = document.createElement('div');
        element.innerHTML = `
            <div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; background-color: white;">
                <h1 style="text-align: center; margin-bottom: 20px; color: #2d3748; font-size: 28px; font-weight: bold;">דוח נוכחות: ${activityName}</h1>
                
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 12px; margin-bottom: 40px; border: 1px solid #edf2f7;">
                    <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 10px; font-size: 18px;">
                        <span style="font-weight: bold; color: #4a5568;">בדיקה:</span>
                        <span style="color: #2d3748;">${check.name || 'ללא שם'}</span>
                    </div>
                    <div style="display: flex; justify-content: center; gap: 20px; font-size: 18px;">
                        <span style="font-weight: bold; color: #4a5568;">תאריך:</span>
                        <span style="color: #2d3748;">${dateStr} בשעה ${timeStr}</span>
                    </div>
                </div>

                <div style="display: flex; gap: 30px; justify-content: space-between;">
                    <div style="flex: 1; border: 1px solid #c6f6d5; border-radius: 12px; padding: 25px; background-color: #f0fff4;">
                        <h3 style="margin-top: 0; border-bottom: 2px solid #c6f6d5; padding-bottom: 15px; margin-bottom: 20px; color: #2f855a; font-size: 20px; text-align: center;">נוכחים (${check.present ? check.present.length : 0})</h3>
                        <ul style="list-style-type: none; padding: 0; margin: 0; line-height: 1.8; font-size: 16px;">${presentList}</ul>
                    </div>
                    <div style="flex: 1; border: 1px solid #fed7d7; border-radius: 12px; padding: 25px; background-color: #fff5f5;">
                        <h3 style="margin-top: 0; border-bottom: 2px solid #fed7d7; padding-bottom: 15px; margin-bottom: 20px; color: #c53030; font-size: 20px; text-align: center;">חסרים (${check.absent ? check.absent.length : 0})</h3>
                        <ul style="list-style-type: none; padding: 0; margin: 0; line-height: 1.8; font-size: 16px;">${absentList}</ul>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 50px; font-size: 14px; color: #cbd5e0; border-top: 1px solid #edf2f7; padding-top: 20px;">
                    הופק באמצעות מערכת TripCheck
                </div>
            </div>
        `;
        return element;
    },

    downloadReportPDF(activityName, check) {
        const element = this._generateReportHTML(activityName, check);
        const opt = {
            margin: 10,
            filename: `report-${activityName}-${check.name || 'check'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    },

    async shareReportPDF(activityName, check) {
        const element = this._generateReportHTML(activityName, check);
        const opt = {
            margin: 10,
            filename: `report-${activityName}-${check.name || 'check'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `דוח נוכחות - ${activityName}`,
                    text: 'מצורף דוח נוכחות כקובץ PDF.'
                });
            } else {
                // Determine if we are on a secure context (HTTPS or localhost proper)
                const isSecure = window.isSecureContext;

                if (!isSecure) {
                    alert('שים לב: שיתוף קבצים ישיר נתמך רק בחיבור מאובטח (HTTPS).\nבגלל שאתה מחובר כתובת פנימית (IP), הדפדפן חוסם את זה.\n\nהפתרון כרגע: הקובץ ייפתח בלשונית חדשה, ומשם תוכל לשתף אותו דרך התפריט של הדפדפן.');
                    const url = URL.createObjectURL(pdfBlob);
                    window.open(url, '_blank');
                    // Clean up after a delay
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                } else {
                    // Fallback for generic failure (e.g. desktop firefox)
                    alert('שיתוף קבצים לא נתמך בדפדפן זה. הקובץ יירד למכשיר.');
                    const url = URL.createObjectURL(pdfBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = opt.filename;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            }
        } catch (err) {
            console.error('Error generating/sharing PDF:', err);
            alert('שגיאה ביצירת הקובץ.');
        }
    },

    async loadActivityHistory(activity) {
        const listEl = document.getElementById('history-list');
        document.getElementById('history-activity-title').textContent = `היסטוריה: ${activity.name}`;
        listEl.innerHTML = `<div class="text-center py-4"><i class="ph-fill ph-spinner-gap animate-spin text-4xl text-gray-400"></i><p>טוען היסטוריית בדיקות...</p></div>`;

        try {
            const q = query(collection(db, "activities", activity.id, "checks"));
            const snapshot = await getDocs(q);
            listEl.innerHTML = '';

            if (snapshot.empty) {
                listEl.innerHTML = `<p class="text-center text-gray-500">לא בוצעו בדיקות לפעילות זו.</p>`;
                return;
            }

            const checks = snapshot.docs.map(d => d.data()).sort((a, b) => (b.checkedAt?.seconds || 0) - (a.checkedAt?.seconds || 0));

            checks.forEach(check => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded-lg shadow relative';

                const date = check.checkedAt ? new Date(check.checkedAt.seconds * 1000) : null;
                const time = date ? date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
                const dateStr = date ? date.toLocaleDateString('he-IL') : 'לא זמין';

                const checkTitle = check.name || `${dateStr} - ${time}`;
                const checkSubTitle = check.name ? `(${dateStr} - ${time})` : '';

                // Header with Buttons
                // Desktop: Download Icon (hidden on mobile)
                // Mobile: Share Icon (hidden on desktop)
                const headerHtml = `
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${checkTitle}</h3>
                            ${checkSubTitle ? `<span class="text-gray-500 text-sm">${checkSubTitle}</span>` : ''}
                        </div>
                        <div class="flex gap-2">
                            <!-- Desktop Download Button -->
                            <button class="download-pdf-btn hidden md:block text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" title="הורד קובץ PDF">
                                <i class="ph-bold ph-download-simple text-xl"></i>
                            </button>
                            <!-- Mobile Share Button -->
                            <button class="share-pdf-btn block md:hidden text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors" title="שתף קובץ PDF">
                                <i class="ph-bold ph-share-network text-xl"></i>
                            </button>
                        </div>
                    </div>
                `;

                const presentList = check.present && check.present.length ? check.present.map(s => `<li>${s.name} (${s.group})</li>`).join('') : '<li>אין נתונים</li>';
                const absentList = check.absent && check.absent.length ? check.absent.map(s => `<li>${s.name} (${s.group})</li>`).join('') : '<li>אין נתונים</li>';

                const contentHtml = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-semibold text-green-600 border-b border-green-200 pb-1 mb-2">נוכחים (${check.present ? check.present.length : 0})</h4>
                            <ul class="list-disc list-inside text-sm text-gray-700 max-h-40 overflow-y-auto">${presentList}</ul>
                        </div>
                        <div>
                            <h4 class="font-semibold text-red-600 border-b border-red-200 pb-1 mb-2">חסרים (${check.absent ? check.absent.length : 0})</h4>
                            <ul class="list-disc list-inside text-sm text-gray-700 max-h-40 overflow-y-auto">${absentList}</ul>
                        </div>
                    </div>
                `;

                card.innerHTML = headerHtml + contentHtml;

                // Attach Event Listeners
                const shareBtn = card.querySelector('.share-pdf-btn');
                shareBtn.addEventListener('click', () => {
                    this.shareReportPDF(activity.name, check);
                });

                const downloadBtn = card.querySelector('.download-pdf-btn');
                downloadBtn.addEventListener('click', () => {
                    this.downloadReportPDF(activity.name, check);
                });

                listEl.appendChild(card);
            });
        } catch (error) {
            Logger.error("Error loading activity history:", error);
            listEl.innerHTML = `<p class="text-center text-red-500">שגיאה בטעינת ההיסטוריה.</p>`;
        }
    },

    async updateGroupsOrder(newOrderIds) {
        if (!this._currentUser) return;
        const batch = writeBatch(db);
        newOrderIds.forEach((id, index) => {
            const groupRef = doc(db, "groups", id);
            batch.update(groupRef, { order: index });
        });
        await batch.commit();
        Logger.log('FirestoreService: Groups order updated.');
    },

    async deleteGroup(groupId) {
        if (!this._currentUser) return;
        try {
            await deleteDoc(doc(db, "groups", groupId));
            Logger.success(`FirestoreService: Group ${groupId} deleted.`);
        } catch (error) {
            console.error("Error deleting group:", error);
            throw error;
        }
    },

    async updateGroupName(groupId, newName) {
        if (!this._currentUser) return;
        try {
            await updateDoc(doc(db, "groups", groupId), { name: newName });
            Logger.success(`FirestoreService: Group ${groupId} renamed to ${newName}.`);
        } catch (error) {
            console.error("Error updating group name:", error);
            throw error;
        }
    },

    async resetGroupOrderToABC() {
        if (!this._currentUser) return;
        const sorted = [...this._allGroups].sort((a, b) => a.name.localeCompare(b.name, 'he'));
        const newOrderIds = sorted.map(g => g.id);
        await this.updateGroupsOrder(newOrderIds);
    }
};
