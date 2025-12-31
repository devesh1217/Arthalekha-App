import RNFS from 'react-native-fs';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { Alert, PermissionsAndroid, Platform, Linking } from 'react-native';

export const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
        const writeGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
                title: "Storage Write Permission Required",
                message: "This app needs access to your storage to save files.",
                buttonPositive: "Grant Permission"
            }
        );

        const readGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
                title: "Storage Read Permission Required",
                message: "This app needs access to your storage to read backup files.",
                buttonPositive: "Grant Permission"
            }
        );

        return writeGranted === PermissionsAndroid.RESULTS.GRANTED && readGranted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
        console.error('Permission request error:', err);
        return false;
    }
};

const APP_NAME = 'ArthaLekha';

function getExportTypeDetails(transactions, options = {}) {
    // options: { exportType, month, year, startDate, endDate }
    let typeLabel = 'All Transactions';
    if (options.exportType === 'monthly') {
        typeLabel = `Monthly Report (${options.monthName || ''} ${options.year || ''})`;
    } else if (options.exportType === 'yearly') {
        typeLabel = `Yearly Report (${options.year || ''})`;
    } else if (options.exportType === 'custom') {
        typeLabel = `Custom Dates (${options.startDate || ''} to ${options.endDate || ''})`;
    }
    return typeLabel;
}

function getAccountWiseSummary(transactions) {
    const summary = {};
    transactions.forEach(t => {
        if (!summary[t.account]) {
            summary[t.account] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            summary[t.account].income += parseFloat(t.amount);
        } else if (t.type === 'expense') {
            summary[t.account].expense += parseFloat(t.amount);
        }
    });
    return summary;
}

function getCategoryWiseSummary(transactions) {
    const summary = { income: {}, expense: {} };
    transactions.forEach(t => {
        const type = t.type;
        const category = t.category || 'Others';
        if (!summary[type][category]) {
            summary[type][category] = 0;
        }
        summary[type][category] += parseFloat(t.amount);
    });
    // Sort categories by amount in descending order
    const sortedIncome = Object.entries(summary.income)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
    const sortedExpense = Object.entries(summary.expense)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
    return { income: sortedIncome, expense: sortedExpense };
}

const generatePDFContent = async (transactions, options = {}) => {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    // Table rows: merge title/description, widen date, rearrange columns (amount at end)
    const tableRows = transactions.map(t => `
        <tr>
            <td class="date-col">${t.date}</td>
            <td class="title-desc-col">
                <div><b>${t.title}</b></div>
                ${t.description ? `<div class="desc-text">${t.description}</div>` : ''}
            </td>
            <td>${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
            <td>${t.category}</td>
            <td>${t.account}</td>
            <td>₹${parseFloat(t.amount).toFixed(2)}</td>
        </tr>
    `).join('');

    const accountSummary = getAccountWiseSummary(transactions);
    const accountSummaryRows = Object.entries(accountSummary).map(([acc, vals]) => `
        <tr>
            <td>${acc}</td>
            <td>₹${vals.income.toFixed(2)}</td>
            <td>₹${vals.expense.toFixed(2)}</td>
            <td>₹${(vals.income - vals.expense).toFixed(2)}</td>
        </tr>
    `).join('');

    const categorySummary = getCategoryWiseSummary(transactions);
    const incomeCategoryRows = Object.entries(categorySummary.income).map(([cat, amount]) => `
        <tr>
            <td>${cat}</td>
            <td>₹${parseFloat(amount).toFixed(2)}</td>
        </tr>
    `).join('');
    const expenseCategoryRows = Object.entries(categorySummary.expense).map(([cat, amount]) => `
        <tr>
            <td>${cat}</td>
            <td>₹${parseFloat(amount).toFixed(2)}</td>
        </tr>
    `).join('');

    const exportTypeLabel = getExportTypeDetails(transactions, options);
    const downloadLink = `<a href="https://play.google.com/store/apps/details?id=com.myexpensemanager" style="color:#1976d2;text-decoration:underline;">Download this file</a>`;

    // Use @page margin boxes for header/footer and static header/footer for HTML preview
    return `
        <html>
            <head>
                <style>
                    @page {
                        margin: 32mm 16mm 22mm 16mm;
                        @top-center {
                            content: element(pageHeader);
                        }
                        @bottom-center {
                            content: element(pageFooter);
                        }
                    }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; color: #222; margin: 0; }
                    header#pageHeader, footer#pageFooter {
                        display: block;
                        width: 100%;
                        background: #fff;
                    }
                    header#pageHeader {
                        border-bottom: 1px solid #e0e0e0;
                        height: 60px;
                        display: flex;
                        align-items: center;
                        padding: 0 32px;
                        position: running(pageHeader);
                    }
                    footer#pageFooter {
                        border-top: 1px solid #e0e0e0;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 32px;
                        font-size: 0.95rem;
                        color: #888;
                        position: running(pageFooter);
                    }
                    .page-number::after {
                        content: counter(page);
                    }
                    .logo { width: 40px; height: 40px; border-radius: 10px; margin-right: 16px; }
                    .app-title { font-size: 1.5rem; font-weight: bold; color: #037168ff; }
                    .main-content { margin-top: 0; margin-bottom: 0; padding: 0 8px; }
                    .export-type { font-size: 1.1rem; color: #444; margin-bottom: 8px; }
                    .summary, .account-summary { margin: 20px 0; }
                    .summary p, .account-summary p { margin: 4px 0; }
                    .account-summary-table, .transaction-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #bbb; padding: 8px; text-align: left; }
                    th { background-color: #e3f2fd; }
                    .transaction-table th, .transaction-table td { font-size: 0.98rem; }
                    .account-summary-table th, .account-summary-table td { font-size: 1rem; }
                    .download-link { margin: 16px 0; display: block; }
                    .transaction-table th.date-col, .transaction-table td.date-col { width: 110px; min-width: 100px; }
                    .transaction-table th.title-desc-col, .transaction-table td.title-desc-col { width: 220px; min-width: 180px; }
                    .desc-text { color: #666; font-size: 0.93em; margin-top: 2px; }
                    .category-summary { margin: 20px 0; }
                    .category-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
                    .category-table th, .category-table td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
                    .category-table th { background-color: #f0f0f0; }
                </style>
            </head>
            <body>
                <header id="pageHeader">
                    <span class="app-title">${APP_NAME}</span>
                </header>
                <footer id="pageFooter">
                    <span>Generated on: ${new Date().toLocaleString()}</span>
                </footer>
                <div class="main-content">
                    <div class="export-type"><b>${exportTypeLabel}</b></div>
                    <div class="summary">
                        <p><b>Total Income:</b> ₹${totalIncome.toFixed(2)}</p>
                        <p><b>Total Expense:</b> ₹${totalExpense.toFixed(2)}</p>
                        <p><b>Net Balance:</b> ₹${netBalance.toFixed(2)}</p>
                    </div>
                    <div class="account-summary">
                        <b>Account-wise Summary</b>
                        <table class="account-summary-table">
                            <thead>
                                <tr>
                                    <th>Account</th>
                                    <th>Income</th>
                                    <th>Expense</th>
                                    <th>Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${accountSummaryRows}
                            </tbody>
                        </table>
                    </div>
                    <div class="category-summary">
                        <b>Category-wise Summary</b>
                        <div style="margin-top: 10px;">
                            <div style="margin-bottom: 20px;">
                                <b style="color: #4caf50;">Income Categories</b>
                                <table class="category-table" style="margin-top: 8px;">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${incomeCategoryRows || '<tr><td colspan="2" style="text-align: center; color: #999;">No income</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <b style="color: #f44336;">Expense Categories</b>
                                <table class="category-table" style="margin-top: 8px;">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${expenseCategoryRows || '<tr><td colspan="2" style="text-align: center; color: #999;">No expenses</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="download-link">${downloadLink}</div>
                    <table class="transaction-table">
                        <thead>
                            <tr>
                                <th class="date-col">Date</th>
                                <th class="title-desc-col">Title / Description</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Account</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </body>
        </html>
    `;
};

const generateCSVContent = (transactions, options = {}) => {
    // Add app name, export type, and summary at the top
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const netBalance = totalIncome - totalExpense;
    const exportTypeLabel = getExportTypeDetails(transactions, options);
    const accountSummary = getAccountWiseSummary(transactions);
    let csv = '';
    csv += `${APP_NAME} Export\n`;
    csv += `Export Type:,${exportTypeLabel}\n`;
    csv += `Generated on:,${new Date().toLocaleString()}\n`;
    csv += `Total Income:,${totalIncome.toFixed(2)}\n`;
    csv += `Total Expense:,${totalExpense.toFixed(2)}\n`;
    csv += `Net Balance:,${netBalance.toFixed(2)}\n`;
    csv += `\nAccount-wise Summary:\n`;
    csv += `Account,Income,Expense,Net\n`;
    Object.entries(accountSummary).forEach(([acc, vals]) => {
        csv += `${acc},${vals.income.toFixed(2)},${vals.expense.toFixed(2)},${(vals.income - vals.expense).toFixed(2)}\n`;
    });
    csv += `\n`;
    const headers = ['Date', 'Title', 'Amount', 'Type', 'Category', 'Account', 'Description'];
    const rows = transactions.map(t => [
        t.date,
        t.title,
        t.amount,
        t.type,
        t.category,
        t.account,
        t.description || ''
    ]);
    csv += headers.join(',') + '\n';
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    return csv;
};

const generateTempPath = (extension) => {
    const fileName = `temp_${Date.now()}.${extension}`;
    return `${RNFS.CachesDirectoryPath}/${fileName}`;
};

export const generatePDFPreview = async (transactions, options = {}) => {
    try {
        const html = await generatePDFContent(transactions, options);
        const pdfOptions = {
            html,
            fileName: `temp_${Date.now()}`,
            directory: 'Cache'
        };
        const file = await RNHTMLtoPDF.convert(pdfOptions);
        return file.filePath;
    } catch (error) {
        console.error('PDF generation error:', error);
        throw error;
    }
};

export const savePDFToDownloads = async (tempFilePath, options) => {
    try {
        const downloadPath = `${RNFS.DownloadDirectoryPath}/ArthaLekha`;
        let fileName = '';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        if (options.exportType === 'monthly') {
            fileName = `Report_${options.monthName || ''}_${options.year || ''}_${timestamp}.pdf`;
        } else if (options.exportType === 'yearly') {
            fileName = `Report_${options.year || ''}_${timestamp}.pdf`;
        } else if (options.exportType === 'custom') {
            fileName = `Report_${options.startDate || ''}_to_${options.endDate || ''}_${timestamp}.pdf`;
        } else {
            fileName = `Transactions_Report_${timestamp}.pdf`;
        }
        // Clean up filename (remove spaces, replace slashes)
        fileName = fileName.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '-');
        const finalPath = `${downloadPath}/${fileName}`;

        // Create directory if doesn't exist
        await RNFS.mkdir(downloadPath);
        // Copy from temp to downloads
        await RNFS.copyFile(tempFilePath, finalPath);
        // Delete temp file
        await RNFS.unlink(tempFilePath);

        return finalPath;
    } catch (error) {
        console.error('Error saving PDF:', error);
        throw error;
    }
};

export const generateExcelPreview = async (transactions, options = {}) => {
    const csvContent = generateCSVContent(transactions, options);
    const tempPath = generateTempPath('csv');
    await RNFS.writeFile(tempPath, csvContent, 'utf8');
    return tempPath;
};

export const saveExcelToDownloads = async (tempFilePath, options) => {
    try {
        const downloadPath = `${RNFS.DownloadDirectoryPath}/ArthaLekha`;
        let fileName = '';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        if (options.exportType === 'monthly') {
            fileName = `Report_${options.monthName || ''}_${options.year || ''}_${timestamp}.csv`;
        } else if (options.exportType === 'yearly') {
            fileName = `Report_${options.year || ''}_${timestamp}.csv`;
        } else if (options.exportType === 'custom') {
            fileName = `Report_${options.startDate || ''}_to_${options.endDate || ''}_${timestamp}.csv`;
        } else {
            fileName = `Transactions_Report_${timestamp}.csv`;
        }
        // Clean up filename (remove spaces, replace slashes)
        fileName = fileName.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '-');
        const finalPath = `${downloadPath}/${fileName}`;

        await RNFS.mkdir(downloadPath);
        await RNFS.copyFile(tempFilePath, finalPath);
        await RNFS.unlink(tempFilePath);

        return finalPath;
    } catch (error) {
        console.error('Error saving Excel:', error);
        throw error;
    }
};

export const exportAsCSV = async (transactions, options = {}) => {
    try {
        const tempPath = await generateExcelPreview(transactions, options);
        Alert.alert(
            'File Ready',
            'The file is ready to be saved.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: async () => {
                        try {
                            const savedPath = await saveExcelToDownloads(tempPath, options);
                            Alert.alert(
                                'File Saved',
                                `File saved to:\n${savedPath}`,
                                [
                                    { text: 'OK' },
                                    {
                                        text: 'Share',
                                        onPress: () => Share.open({
                                            url: `file://${savedPath}`,
                                            type: 'text/csv',
                                            filename: savedPath.split('/').pop()
                                        })
                                    }
                                ]
                            );
                        } catch (error) {
                            console.error('Error saving file:', error);
                            Alert.alert('Save Error', 'Failed to save the file.');
                        }
                    }
                }
            ]
        );
        return tempPath;
    } catch (error) {
        console.error('CSV Export error:', error);
        Alert.alert('Export Error', 'Failed to prepare CSV file.');
        throw error;
    }
};

export const exportAsPDF = async (transactions, options = {}) => {
    try {
        const tempPath = await generatePDFPreview(transactions, options);
        Alert.alert(
            'File Ready',
            'The file is ready to be saved.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: async () => {
                        try {
                            const savedPath = await savePDFToDownloads(tempPath, options);
                            Alert.alert(
                                'File Saved',
                                `File saved to:\n${savedPath}`,
                                [
                                    { text: 'OK' },
                                    {
                                        text: 'Share',
                                        onPress: () => Share.open({
                                            url: `file://${savedPath}`,
                                            type: 'application/pdf',
                                            filename: savedPath.split('/').pop()
                                        })
                                    }
                                ]
                            );
                        } catch (error) {
                            console.error('Error saving file:', error);
                            Alert.alert('Save Error', 'Failed to save the file.');
                        }
                    }
                }
            ]
        );
        return tempPath;
    } catch (error) {
        console.error('PDF Export error:', error);
        Alert.alert('Export Error', 'Failed to prepare PDF file.');
        throw error;
    }
};
