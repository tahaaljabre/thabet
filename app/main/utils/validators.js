function safeParseFloat(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let str = String(val);
  for (let i = 0; i < 10; i++) {
    str = str.replace(arabicNumbers[i], i);
  }
  str = str.replace(/,/g, ".");
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

module.exports = {
  safeParseFloat
};
