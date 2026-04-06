const XLSX = require('xlsx');
const path = require('path');

const filePath = 'd:/AI/Menu Restaurante/Cas Padri/Menu Cas Padri.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`\nSheet: ${sheetName}`);
    if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('Sheet is empty');
    }
});
