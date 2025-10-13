const fs = require("fs");

function parseCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== "");
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
    headers.forEach((h, j) => obj[h.trim()] = row[j] || "");
    data.push(obj);
  }

  return data;
}

const csv = fs.readFileSync("guests.csv", "utf8");
const records = parseCSV(csv);

fs.writeFileSync("guests.json", JSON.stringify(records, null, 2), "utf8");
console.log("✅ guests.json généré correctement");
