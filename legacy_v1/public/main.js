/************************
* main.js v3.0
* - Added support for Multiple Concurrent Activities.
* - Refactored "Manage Participants" to single-column UI with stats and "Select All".
* - Improved Student Import (Word/Excel/Text support).
************************/

import { auth, provider, onAuthStateChanged, signInWithPopup, signOut } from './firebase-config.js';
import { Renderer } from './ui-renderer.js';
import { UIHelpers } from './ui-helpers.js';
import { FirestoreService } from './firestore-service.js';
import { Logger } from './debug-logger.js';

// --- State Management ---
export let appState = {
    currentUser: null,
    currentActivityId: null,
    attendance: {
        presentIds: new Set(),
        allStudents: []
    }
};

// --- Navigation & Page Logic ---
async function navigateTo(pageId, context = {}) {
    Logger.log(`Navigating to page: '${pageId}'`, context);
    if (pageId === 'home-page' && appState.currentUser) {
        context = appState.currentUser;
    }
    Renderer.renderPage(pageId, context);

    switch (pageId) {
        case 'home-page':
        case 'archive-page':
            FirestoreService.renderActivities();
            break;
        case 'new-activity-page':
            FirestoreService.renderGroups(); // Renders the container but empty
            const allStudents = await FirestoreService.getAllStudentsFromAllGroups();
            Renderer.renderGroupSelection(FirestoreService._allGroups, allStudents);
            break;
        case 'manage-groups-page':
            FirestoreService.renderGroups();
            break;
        case 'group-details-page':
            FirestoreService.loadStudents(context.groupId, context.groupName);
            break;
    }
}

async function showAttendancePage(activity) {
    navigateTo('attendance-page');

    appState.currentActivityId = activity.id;
    Logger.log(`Current activity ID set in appState: ${appState.currentActivityId}`);

    const listEl = document.getElementById('attendance-list');
    document.getElementById('attendance-activity-title').textContent = activity.name;

    listEl.innerHTML = `<div class="text-center py-4"><i class="ph-fill ph-spinner-gap animate-spin text-4xl text-gray-400"></i><p>טוען רשימת תלמידים...</p></div>`;
    Renderer.updateAttendanceCounter(0, 0);

    appState.attendance = { presentIds: new Set(), allStudents: [] };

    const { studentsByGroup, allStudents } = await FirestoreService.startAttendanceCheck(activity);

    appState.attendance.allStudents = allStudents;

    Renderer.renderStudentListForAttendance(studentsByGroup, appState.attendance.presentIds);
    Renderer.updateAttendanceCounter(0, allStudents.length);

    initializeAttendancePageListeners();
}


// --- Event Handlers & Initializers ---

function setupImportModalListeners(groupId) {
    const fileInput = document.getElementById('import-file-input');
    const textArea = document.getElementById('import-text-area');
    const saveBtn = document.getElementById('save-imported-students-btn');
    const closeBtn = document.getElementById('close-import-modal-btn');
    const closeX = document.getElementById('close-import-modal');
    const modal = document.getElementById('import-modal');

    const closeModal = () => {
        modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);

    const updateSaveButtonState = () => {
        const text = textArea.value.trim();
        saveBtn.disabled = text.length === 0;
    };

    const setNamesToTextArea = (names) => {
        const cleanNames = names.map(n => n.trim()).filter(n => n && n.length > 1);
        textArea.value = cleanNames.join('\n');
        updateSaveButtonState();
    };

    textArea.addEventListener('input', updateSaveButtonState);



    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();

        try {
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Array of arrays
                    const names = json.map(row => row[0]).filter(n => n); // First column
                    setNamesToTextArea(names);
                };
                reader.readAsArrayBuffer(file);
            } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    mammoth.extractRawText({ arrayBuffer: e.target.result })
                        .then((result) => {
                            const text = result.value;
                            const names = text.split(/\r?\n/);
                            setNamesToTextArea(names);
                        })
                        .catch((err) => {
                            console.error(err);
                            alert('שגיאה בקריאת קובץ Word. נסה להעתיק את הטקסט ידנית.');
                        });
                };
                reader.readAsArrayBuffer(file);
            } else if (fileName.endsWith('.txt')) {
                const text = await file.text();
                setNamesToTextArea(text.split(/\r?\n/));
            } else {
                alert('פורמט קובץ לא נתמך. אנא השתמש באקסל, וורד או קובץ טקסט.');
            }
        } catch (err) {
            console.error(err);
            alert('שגיאה בעיבוד הקובץ. נסה שנית או השתמש בהעתק-הדבק.');
        }
    });

    saveBtn.addEventListener('click', async () => {
        const text = textArea.value;
        if (!text.trim()) return;

        const names = text.split(/\r?\n/).map(n => n.trim()).filter(n => n && n.length > 1);
        if (names.length === 0) return;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> שומר...';

        try {
            await FirestoreService.batchSaveStudents(groupId, names);
            closeModal();
        } catch (error) {
            alert('שגיאה בשמירת התלמידים.');
            saveBtn.disabled = false;
            saveBtn.textContent = 'שמור תלמידים';
        }
    });
}


function handleStudentClick(event) {
    const studentItem = event.currentTarget;
    const studentId = studentItem.dataset.studentId;

    if (!studentId) return;

    const isPresent = appState.attendance.presentIds.has(studentId);

    if (isPresent) {
        appState.attendance.presentIds.delete(studentId);
    } else {
        appState.attendance.presentIds.add(studentId);
    }

    studentItem.classList.toggle('present');
    Renderer.updateStudentItemUI(studentItem);
    Renderer.updateAttendanceCounter(appState.attendance.presentIds.size, appState.attendance.allStudents.length);
}

async function handleFinishCheck(event) {
    Logger.log('--- "Finish Check" button clicked! ---');
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const activityId = appState.currentActivityId;

    if (!activityId) {
        alert("שגיאה קריטית: לא נמצא מזהה פעילות. נסה לרענן את הדף.");
        return;
    }

    button.disabled = true;

    const checkNameInput = document.getElementById('check-name');
    let checkName = checkNameInput.value.trim();

    const present = appState.attendance.allStudents.filter(s => appState.attendance.presentIds.has(s.id));
    const absent = appState.attendance.allStudents.filter(s => !appState.attendance.presentIds.has(s.id));

    const dontAskForNameSetting = FirestoreService._userSettings[`dontAskForName_${activityId}`];
    if (!checkName && !dontAskForNameSetting) {
        Logger.log('Asking user to name the check.');
        const { wantsToName } = await UIHelpers.askToNameCheck(activityId);
        if (wantsToName) {
            checkNameInput.focus();
            button.disabled = false;
            return;
        }
    }

    Logger.log(`Saving attendance check for activityId: ${activityId}`);
    const success = await FirestoreService.saveAttendanceCheck(activityId, false, checkName, present, absent);

    if (success) {
        Logger.success('Attendance check saved. Rendering summary modal.');
        Renderer.renderSummaryModal(present, absent, false);
    } else {
        Logger.error('Failed to save attendance check.');
    }

    button.disabled = false;
}


async function handleEndActivityClick(event) {
    Logger.log('--- "End Activity" button clicked! ---');
    if (await UIHelpers.confirmAction('האם לסיים את הפעילות?', 'פעולה זו תעביר את הפעילות לארכיון.')) {
        const activityId = appState.currentActivityId;
        if (!activityId) return;

        // Check if there are any students marked as present
        if (appState.attendance.presentIds.size > 0) {
            Logger.log('End Activity: Auto-saving "Final Check" before archiving.');

            const present = appState.attendance.allStudents.filter(s => appState.attendance.presentIds.has(s.id));
            const absent = appState.attendance.allStudents.filter(s => !appState.attendance.presentIds.has(s.id));

            // Save check AND archive (true = shouldArchive)
            try {
                await FirestoreService.saveAttendanceCheck(activityId, true, "בדיקת סיום", present, absent);
            } catch (error) {
                Logger.error('End Activity: Error during saveAttendanceCheck:', error);
                alert('שגיאה בשמירת בדיקת סיום. אנא נסה שוב.');
                return; // Stop navigation if save fails
            }
        } else {
            Logger.log('End Activity: No marked students. Just archiving.');
            await FirestoreService.endCurrentActivity(activityId);
        }

        navigateTo('home-page');
    }
}


function handleCopyLog() {
    const debugContainer = document.getElementById('debug-log-display');
    if (!debugContainer) return;

    // Extract text from the debug lines
    const lines = Array.from(debugContainer.querySelectorAll('div')).map(div => div.textContent).join('\n');
    const timestamp = new Date().toLocaleString();
    const copyText = `TripCheck Debug Log (${timestamp}):\n\n${lines}`;

    navigator.clipboard.writeText(copyText).then(() => {
        const btn = document.getElementById('copy-debug-log-btn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('bg-green-600');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('bg-green-600');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy log:', err);
        alert('העתקת הלוג נכשלה');
    });
}

function initializeAttendancePageListeners() {
    Logger.log('Initializing attendance page listeners...');

    const hideCheckbox = document.getElementById('hide-present-checkbox');
    if (hideCheckbox) {
        hideCheckbox.addEventListener('change', (event) => {
            document.getElementById('attendance-list').classList.toggle('hide-present-mode', event.target.checked);
        });
    }

    document.querySelectorAll('.student-item').forEach(item => {
        item.addEventListener('click', handleStudentClick);
    });

    const listEl = document.getElementById('attendance-list');
    if (listEl && window.Sortable) {
        new window.Sortable(listEl, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost'
        });
    }
    Logger.success('Attendance page listeners initialized.');
}

function initializeGlobalEventListeners() {
    Logger.log('Initializing global event listeners...');
    const appRoot = document.getElementById('app-root');

    appRoot.addEventListener('click', async (event) => {
        const target = event.target;

        const finishCheckButton = target.closest('#finish-check-button');
        if (finishCheckButton) {
            handleFinishCheck(event);
            return;
        }

        const loginButton = target.closest('#login-button');
        if (loginButton) {
            Logger.log('Login button clicked via delegate');
            signInWithPopup(auth, provider).catch(err => {
                Logger.error('Sign-in error from main.js delegate:', err);
                console.error("Sign-in error", err);
            });
            return;
        }

        const navBtn = target.closest('.nav-btn');
        if (navBtn) {
            event.preventDefault();
            navigateTo(navBtn.dataset.target);
            return;
        }

        if (target.closest('#logout-button')) {
            signOut(auth).catch(err => console.error("Sign-out error", err));
            return;
        }

        const groupCard = target.closest('[data-action="view-group"]');
        if (groupCard) {
            const { groupId, groupName } = groupCard.dataset;
            navigateTo('group-details-page', { groupId, groupName });
            return;
        }

        const activityButton = target.closest('[data-activity-id]');
        if (activityButton) {
            const activity = FirestoreService.getActivityById(activityButton.dataset.activityId);
            if (activity) {
                if (target.closest('#archive-list')) {
                    navigateTo('activity-history-page');
                    FirestoreService.loadActivityHistory(activity);
                } else if (activity.status === 'active') {
                    await showAttendancePage(activity);
                } else {
                    navigateTo('activity-history-page');
                    FirestoreService.loadActivityHistory(activity);
                }
            }
            return;
        }

        const deleteBtn = target.closest('.delete-student-btn');
        if (deleteBtn) {
            const { groupId, studentId, studentName } = deleteBtn.dataset;
            if (await UIHelpers.confirmAction('מחיקת תלמיד', `האם למחוק את ${studentName}?`)) {
                FirestoreService.deleteStudent(groupId, studentId).catch(err => alert('שגיאה במחיקת תלמיד'));
            }
            return;
        }

        // --- New Activity Page Logic (Accordion & Save) ---

        // Toggle Group Accordion
        const groupToggle = target.closest('.group-toggle');
        if (groupToggle) {
            const groupId = groupToggle.dataset.groupId;
            const container = document.getElementById(`students-container-${groupId}`);
            const arrow = document.getElementById(`arrow-${groupId}`);
            if (container) {
                container.classList.toggle('hidden');
                arrow.classList.toggle('rotate-180');
            }
            return;
        }

        // Group Checkbox - Select All Students
        if (target.classList.contains('group-checkbox')) {
            const groupId = target.dataset.groupId;
            const isChecked = target.checked;
            const studentCheckboxes = document.querySelectorAll(`.student-checkbox[data-group-id="${groupId}"]`);
            studentCheckboxes.forEach(cb => cb.checked = isChecked);
            return;
        }

        // Save New Activity
        const saveActivityButton = target.closest('#save-activity-button');
        if (saveActivityButton) {
            saveActivityButton.disabled = true;
            const name = document.getElementById('activity-name').value.trim();

            if (!name) {
                alert("אנא הזן שם לפעילות.");
                saveActivityButton.disabled = false;
                return;
            }

            // Gather selected students
            const selectedStudentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
            if (selectedStudentCheckboxes.length === 0) {
                alert("אנא בחר לפחות תלמיד אחד לפעילות.");
                saveActivityButton.disabled = false;
                return;
            }

            const participants = Array.from(selectedStudentCheckboxes).map(cb => ({
                id: cb.dataset.studentId,
                name: cb.dataset.studentName,
                groupId: cb.dataset.groupId,
                groupName: cb.dataset.groupName
            }));

            // Derive group names for legacy/display
            const uniqueGroupNames = [...new Set(participants.map(p => p.groupName))];

            await FirestoreService.saveNewActivity(name, uniqueGroupNames, participants);
            navigateTo('home-page');
            saveActivityButton.disabled = false;
            return;
        }


        if (target.id === 'manage-participants-btn' || target.closest('#manage-participants-btn')) {
            const currentActivityId = appState.currentActivityId;
            if (!currentActivityId) return;

            // 1. Get current participants (already in appState.attendance.allStudents)
            // But wait, appState.attendance.allStudents might be based on groups if legacy.
            // It's safer to use the list we have in memory.
            const currentParticipants = appState.attendance.allStudents || [];

            // 2. Fetch all system students
            const allStudents = await FirestoreService.getAllStudentsFromAllGroups();
            const allGroups = FirestoreService._allGroups;

            // 3. Render Modal
            Renderer.renderManageParticipantsModal(currentParticipants, allGroups, allStudents);

            // 4. Setup listeners
            setupManageParticipantsListeners(currentActivityId, currentParticipants, allStudents);
            return;
        }

        const editGroupBtn = target.closest('.edit-group-btn');
        if (editGroupBtn) {
            const { groupId, groupName } = editGroupBtn.dataset;
            // Native prompt is used for simplicity as per requirement for quick edit. 
            // Can be upgraded to modal later if needed.
            const newName = prompt("הכנס שם חדש לקבוצה:", groupName);
            if (newName && newName.trim() !== "" && newName !== groupName) {
                FirestoreService.updateGroupName(groupId, newName.trim()).catch(err => alert('שגיאה בעדכון שם הקבוצה'));
            }
            return;
        }

        const deleteGroupBtn = target.closest('.delete-group-btn');
        if (deleteGroupBtn) {
            const { groupId, groupName } = deleteGroupBtn.dataset;
            if (await UIHelpers.confirmAction('מחיקת קבוצה', `האם למחוק את הקבוצה "${groupName}"?`)) {
                FirestoreService.deleteGroup(groupId).catch(err => alert('שגיאה במחיקת קבוצה'));
            }
            return;
        }

        const sortGroupsBtn = target.closest('#sort-groups-btn');
        if (sortGroupsBtn) {
            if (await UIHelpers.confirmAction('מיון קבוצות', 'האם למיין את הקבוצות לפי א-ב? הסדר הנוכחי ישתנה.')) {
                FirestoreService.resetGroupOrderToABC();
            }
            return;
        }

        const closeModalButton = target.closest('#close-modal-button');
        if (closeModalButton) {
            const modal = document.getElementById('summary-modal');
            modal.classList.add('hidden');
            navigateTo('home-page');
            return;
        }

        const endActivityBtn = target.closest('#end-activity-btn');
        if (endActivityBtn) {
            handleEndActivityClick(event);
            return;
        }

        // New Event Listeners
        if (target.closest('#copy-debug-log-btn')) {
            handleCopyLog();
            return;
        }

        if (target.closest('#copy-report-btn')) {
            const textarea = document.getElementById('absentees-report-text');
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile devices
            try {
                await navigator.clipboard.writeText(textarea.value);
                const feedback = document.getElementById('copy-feedback');
                feedback.classList.remove('opacity-0');
                setTimeout(() => feedback.classList.add('opacity-0'), 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                alert('העתקה נכשלה, נסה להעתיק ידנית.');
            }
            return;
        }
    });

    appRoot.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = event.target.querySelector('button[type="submit"]');

        if (event.target.id === 'add-group-form') {
            const input = document.getElementById('new-group-name');
            const name = input.value.trim();
            if (name) {
                if (button) button.disabled = true;
                await FirestoreService.saveNewGroup(name);
                input.value = '';
                if (button) button.disabled = false;
            }
        }
        if (event.target.id === 'add-student-form') {
            const input = document.getElementById('new-student-name');
            const name = input.value.trim();
            const groupId = event.target.dataset.groupId;
            if (name && groupId) {
                if (button) button.disabled = true;
                await FirestoreService.saveNewStudent(groupId, name);
                input.value = '';
                if (button) button.disabled = false;
            }
        }
    });

    // --- Import Modal Logic ---
    appRoot.addEventListener('click', (event) => {
        const importBtn = event.target.closest('#import-students-btn');
        if (importBtn) {
            const addForm = document.getElementById('add-student-form');
            if (addForm) {
                const groupId = addForm.dataset.groupId;
                Renderer.renderImportStudentsModal(groupId);
                setupImportModalListeners(groupId);
            }
        }
    });

    Logger.success('Global event listeners initialized.');
}

function setupManageParticipantsListeners(activityId, initialParticipants, allStudents) {
    const modal = document.getElementById('manage-participants-modal');
    if (!modal) return;

    let currentParticipants = [...initialParticipants];
    const participantsCountEl = document.getElementById('participants-total-count');
    const searchInput = document.getElementById('search-students-input');
    const availableListEl = document.getElementById('available-students-list');

    // Helper to render available students (Accordion style)
    const renderAvailableList = (filterTerm = '') => {
        const studentsMap = {};
        allStudents.forEach(s => {
            if (!studentsMap[s.groupId]) studentsMap[s.groupId] = [];
            studentsMap[s.groupId].push(s);
        });

        const groups = FirestoreService._allGroups;
        let html = '';

        groups.forEach(group => {
            const groupStudents = studentsMap[group.id] || [];
            // Filter students based on search term
            const matchesGroup = group.name.includes(filterTerm);
            const filteredStudents = groupStudents.filter(s => s.name.includes(filterTerm) || matchesGroup);

            if (filteredStudents.length === 0) return;

            // Calculate stats
            const participantsInGroup = filteredStudents.filter(s => currentParticipants.find(cp => cp.id === s.id));
            const selectedCount = participantsInGroup.length;
            const totalCount = filteredStudents.length;
            const isAllSelected = totalCount > 0 && selectedCount === totalCount;

            html += `
                <div class="border border-gray-200 rounded-xl overflow-hidden bg-white mb-3 shadow-sm transition-all hover:shadow-md">
                    <div class="flex items-center p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100">
                         <div class="flex items-center h-5">
                            <input type="checkbox" 
                                class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 group-select-all-cb transition-all cursor-pointer" 
                                data-group-id="${group.id}"
                                ${isAllSelected ? 'checked' : ''}
                                title="בחר הכל בקבוצה זו">
                        </div>
                         <div class="flex-grow font-bold text-gray-800 cursor-pointer select-none px-4 flex justify-between items-center group-header-toggle" data-group-id="${group.id}">
                            <span>${group.name}</span>
                            <div class="flex items-center gap-3">
                                <span class="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200">
                                    ${selectedCount} / ${totalCount}
                                </span>
                                <i class="ph-bold ph-caret-down text-gray-400 transition-transform duration-300" id="arrow-${group.id}"></i>
                            </div>
                        </div>
                    </div>
                    <div id="avail-students-${group.id}" class="hidden bg-gray-50/50 p-2 space-y-1 border-t border-gray-100 animate-fade-in">
                        ${filteredStudents.map(s => {
                const isParticipant = currentParticipants.find(cp => cp.id === s.id);
                return `
                            <label class="flex items-center p-2.5 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                                <input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-3 add-student-cb transition-all" 
                                    value="${s.id}" data-name="${s.name}" data-group-name="${group.name}" data-group-id="${group.id}"
                                    ${isParticipant ? 'checked' : ''}>
                                <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">${s.name}</span>
                            </label>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = `<div class="text-center p-8 text-gray-400 flex flex-col items-center">
                <i class="ph-duotone ph-magnifying-glass text-4xl mb-2 opacity-50"></i>
                <p>לא נמצאו תלמידים התואמים את החיפוש</p>
            </div>`;
        }

        availableListEl.innerHTML = html;
        if (participantsCountEl) participantsCountEl.textContent = currentParticipants.length;

        // Toggle Accordion Listeners
        availableListEl.querySelectorAll('.group-header-toggle').forEach(header => {
            header.addEventListener('click', (e) => {
                const groupId = header.dataset.groupId;
                const arrow = document.getElementById(`arrow-${groupId}`);
                const content = document.getElementById(`avail-students-${groupId}`);

                content.classList.toggle('hidden');
                arrow.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        });

        // "Select All" Listeners
        availableListEl.querySelectorAll('.group-select-all-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const groupId = e.target.dataset.groupId;
                const groupStudents = studentsMap[groupId].filter(s => s.name.includes(filterTerm) || groups.find(g => g.id === groupId).name.includes(filterTerm)); // Apply logic to filtered

                if (e.target.checked) {
                    // Add all filtered students in group if not present
                    groupStudents.forEach(s => {
                        if (!currentParticipants.find(p => p.id === s.id)) {
                            currentParticipants.push({
                                id: s.id,
                                name: s.name,
                                groupId: s.groupId,
                                groupName: groups.find(g => g.id === s.groupId).name
                            });
                        }
                    });
                } else {
                    // Remove all filtered students in this group from list
                    const groupStudentIds = new Set(groupStudents.map(s => s.id));
                    currentParticipants = currentParticipants.filter(p => !groupStudentIds.has(p.id));
                }
                saveOpenStatesAndRender();
            });
        });

        // Individual Checkbox Listeners
        availableListEl.querySelectorAll('.add-student-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const student = {
                    id: e.target.value,
                    name: e.target.dataset.name,
                    groupId: e.target.dataset.groupId,
                    groupName: e.target.dataset.groupName
                };

                if (e.target.checked) {
                    if (!currentParticipants.find(p => p.id === student.id)) {
                        currentParticipants.push(student);
                    }
                } else {
                    currentParticipants = currentParticipants.filter(p => p.id !== student.id);
                }
                saveOpenStatesAndRender();
            });
        });
    };

    const saveOpenStatesAndRender = () => {
        const openGroups = [];
        availableListEl.querySelectorAll('[id^="avail-students-"]').forEach(el => {
            if (!el.classList.contains('hidden')) {
                openGroups.push(el.id);
            }
        });

        renderAvailableList(searchInput.value);

        // Restore open states
        openGroups.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('hidden');
                const arrow = document.getElementById(id.replace('avail-students-', 'arrow-'));
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }
        });
    };

    // Initial Render
    renderAvailableList();

    // Event: Close Modal
    const closeModal = () => modal.remove();
    document.getElementById('close-manage-modal').onclick = closeModal;
    document.getElementById('close-manage-modal-btn').onclick = closeModal;

    // Event: Search
    searchInput.addEventListener('input', (e) => {
        renderAvailableList(e.target.value);
    });

    // Event: Save Changes
    document.getElementById('save-participants-btn').addEventListener('click', async () => {
        const btn = document.getElementById('save-participants-btn');
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> שומר...';
        btn.disabled = true;

        try {
            await FirestoreService.updateActivityParticipants(activityId, currentParticipants);
            closeModal();
            // Reload attendance page
            const activity = FirestoreService.getActivityById(activityId);
            await showAttendancePage(activity);
        } catch (error) {
            console.error(error);
            alert('שגיאה בשמירת הנתונים.');
            btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> שמור שינויים';
            btn.disabled = false;
        }
    });

}

// --- App Initialization ---
function initializeApp() {
    Logger.log('initializeApp() called.');
    const appRoot = document.getElementById('app-root');
    initializeGlobalEventListeners();

    onAuthStateChanged(auth, async (user) => { // Added async here
        Logger.log('onAuthStateChanged triggered. User object:', user);
        if (user) {
            Logger.log('User is SIGNED IN. Updating state and rendering app shell.');
            appState.currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL
            };
            FirestoreService.setCurrentUser(appState.currentUser);

            Renderer.renderAppShell(appRoot, appState.currentUser);

            Logger.log('Loading user data (activities and groups)...');
            FirestoreService.loadActivities();
            FirestoreService.loadGroups();
        } else {
            Logger.log('User is SIGNED OUT. Rendering login page.');
            appState.currentUser = null;
            FirestoreService.setCurrentUser(null);

            appRoot.innerHTML = `
                <div class="container mx-auto max-w-lg">
                    <div id="app-content"></div>
                </div>
                <div id="modal-root"></div>
            `;
            Renderer.renderModals(document.getElementById('modal-root'));
            Renderer.renderPage('login-page');
        }
    });
}

// Start the application
initializeApp();
