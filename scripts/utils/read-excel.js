const path = require('path');

// Try to require exceljs from backend directory
let ExcelJS;
try {
    ExcelJS = require('../backend/node_modules/exceljs');
} catch (e) {
    console.error('ExcelJS not found. Installing...');
    process.exit(1);
}

async function readExcelFile() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, '../data/GEP_DEMO_DATA.xlsx');
        
        console.log('Reading Excel file:', filePath);
        await workbook.xlsx.readFile(filePath);
        
        console.log('\n=== EXCEL FILE ANALYSIS ===');
        console.log('Number of worksheets:', workbook.worksheets.length);
        
        workbook.eachSheet((worksheet, sheetIndex) => {
            console.log(`\n--- Sheet ${sheetIndex}: "${worksheet.name}" ---`);
            console.log(`Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);
            
            // Show first few rows to understand structure
            console.log('\nFirst 5 rows of data:');
            for (let rowNum = 1; rowNum <= Math.min(5, worksheet.rowCount); rowNum++) {
                const row = worksheet.getRow(rowNum);
                const values = [];
                row.eachCell((cell, colNumber) => {
                    values.push(`${colNumber}: ${cell.value}`);
                });
                console.log(`Row ${rowNum}: ${values.join(' | ')}`);
            }
            
            // Show column headers if available
            if (worksheet.rowCount > 0) {
                const headerRow = worksheet.getRow(1);
                console.log('\nColumn Headers:');
                headerRow.eachCell((cell, colNumber) => {
                    console.log(`Column ${colNumber}: "${cell.value}"`);
                });
            }
        });
        
    } catch (error) {
        console.error('Error reading Excel file:', error);
    }
}

readExcelFile();