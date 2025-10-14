const fs = require("fs");
const path = require("path");

function parseCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const row = [];
    let inQuotes = false;
    let value = "";

    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(value.trim());
        value = "";
      } else {
        value += char;
      }
    }
    row.push(value.trim());

    const obj = {};
    headers.forEach((h, j) => (obj[h.trim()] = row[j] || ""));
    data.push(obj);
  }

  return data;
}

// 🔍 Fonction récursive pour parcourir tous les dossiers
function walkDir(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile() && /^guest(s)?\.csv$/i.test(entry.name)) {
      callback(fullPath);
    }
  });
}

// 🚀 Conversion automatique de tous les guest.csv
walkDir(".", filePath => {
  try {
    console.log(`🔄 Conversion de ${filePath}`);
    const csv = fs.readFileSync(filePath, "utf8");
    const records = parseCSV(csv);
    const jsonPath = filePath.replace(/\.csv$/i, ".json");
    fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2), "utf8");
    console.log(`✅ Fichier JSON généré : ${jsonPath}`);
  } catch (err) {
    console.error(`❌ Erreur lors de la conversion de ${filePath} :`, err);
  }
});
