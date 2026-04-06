const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'd:/AI/Menu Restaurante/Cas Padri/categories_rows.xlsx';
const workbook = XLSX.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const simplified = data.map(cat => ({
    name: cat.name_es,
    id: cat.id,
    order: cat.Orden || cat.orden
}));

fs.writeFileSync('excel_categories_debug.json', JSON.stringify(simplified, null, 2));
console.log('Written info to excel_categories_debug.json');
