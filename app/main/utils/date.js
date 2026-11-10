function getLocalDateString(d) {
  const date = d ? new Date(d) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
}

module.exports = {
  getLocalDateString
};
