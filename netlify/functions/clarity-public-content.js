// The Clarity Plan's Business Systems Audit is a free, public tool — unlike
// Structure/Growth it needs no access token, so this serves its content
// (departments, scale, maturity tiers, sections) with no auth at all.
const clarity = require("./clarity-content");

exports.handler = async () => {
  return { statusCode: 200, body: JSON.stringify(clarity) };
};
