/************************
* ui-helpers.js v1.1
* - Fix: Corrected a syntax error in the version comment block.
************************/

export const UIHelpers = {
    confirmAction(title, text) {
        return new Promise(resolve => {
            const modal = document.getElementById('confirm-modal');
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-text').textContent = text;
            const yesBtn = document.getElementById('confirm-yes-btn');
            const noBtn = document.getElementById('confirm-no-btn');
            
            const cleanupAndResolve = (value) => {
                modal.classList.add('hidden');
                // Use a new clone to remove the old event listener
                const newYesBtn = yesBtn.cloneNode(true);
                yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
                const newNoBtn = noBtn.cloneNode(true);
                noBtn.parentNode.replaceChild(newNoBtn, noBtn);
                resolve(value);
            };

            yesBtn.addEventListener('click', () => cleanupAndResolve(true), { once: true });
            noBtn.addEventListener('click', () => cleanupAndResolve(false), { once: true });

            modal.classList.remove('hidden');
        });
    },

    askToNameCheck(activityId) {
        return new Promise(resolve => {
            const modal = document.getElementById('ask-for-name-modal');
            const checkbox = document.getElementById('ask-name-dont-show-again-checkbox');
            checkbox.checked = false;
            const yesBtn = document.getElementById('ask-name-yes-btn');
            const noBtn = document.getElementById('ask-name-no-btn');
            
            const cleanupAndResolve = (wantsToName) => {
                if (!wantsToName && checkbox.checked) {
                    sessionStorage.setItem(`dontAskForName_${activityId}`, 'true');
                }
                modal.classList.add('hidden');
                
                // Use a new clone to remove the old event listener
                const newYesBtn = yesBtn.cloneNode(true);
                yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
                const newNoBtn = noBtn.cloneNode(true);
                noBtn.parentNode.replaceChild(newNoBtn, noBtn);

                resolve({ wantsToName });
            };

            yesBtn.addEventListener('click', () => cleanupAndResolve(true), { once: true });
            noBtn.addEventListener('click', () => cleanupAndResolve(false), { once: true });
            
            modal.classList.remove('hidden');
        });
    }
};
