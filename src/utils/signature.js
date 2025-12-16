const crypto = require('crypto');

// Helper to generate SHA1 signature
// "sha1 is applied to the string, which contains merchant payment secret key and all request or response parameters, concatenated in alphabetic order and separated by | symbol."
const generateSignature = (params, secretKey) => {
  const sortedKeys = Object.keys(params).sort();
  let signatureString = secretKey;
  
  for (const key of sortedKeys) {
    const value = params[key];
    // "If parameter is absent or is empty then there is no need to add | symbol."
    if (value !== undefined && value !== null && value !== '') {
      signatureString += `|${value}`;
    }
  }

  return crypto.createHash('sha1').update(signatureString).digest('hex');
};

module.exports = {
  generateSignature,
};

