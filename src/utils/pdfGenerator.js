import html2pdf from 'html2pdf.js';

function generateReportHTML(activityName, check) {
    const date = check.checkedAt ? new Date(check.checkedAt.seconds * 1000) : new Date();
    const dateStr = date.toLocaleDateString('he-IL');
    const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    const presentList = check.present && check.present.length 
        ? check.present.map(s => `<li>${s.name} (${s.groupName || ''})</li>`).join('') 
        : '<li>אין נתונים</li>';
        
    const absentList = check.absent && check.absent.length 
        ? check.absent.map(s => `<li>${s.name} (${s.groupName || ''})</li>`).join('') 
        : '<li>אין נתונים</li>';

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
                הופק באמצעות מערכת TripCheck v2
            </div>
        </div>
    `;
    return element;
}

const getPdfOptions = (activityName, checkName) => ({
    margin: 10,
    filename: `report-${activityName}-${checkName || 'check'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
});

export function downloadReportPDF(activityName, check) {
    const element = generateReportHTML(activityName, check);
    html2pdf().set(getPdfOptions(activityName, check.name)).from(element).save();
}

export async function shareReportPDF(activityName, check) {
    const element = generateReportHTML(activityName, check);
    const opt = getPdfOptions(activityName, check.name);

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
            const isSecure = window.isSecureContext;
            if (!isSecure) {
                alert('שיתוף קבצים ישיר נתמך רק בחיבור מאובטח (HTTPS). הקובץ ייפתח בלשונית חדשה.');
                const url = URL.createObjectURL(pdfBlob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } else {
                alert('שיתוף קבצים לא נתמך. הקובץ יירד למכשיר.');
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = opt.filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    } catch (err) {
        console.error('Error sharing PDF:', err);
        alert('שגיאה ביצירת הקובץ.');
    }
}
