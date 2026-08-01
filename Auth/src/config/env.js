const REQUIRED_AUTH_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const OPTIONAL_SECRET_GROUPS = [
  {
    name: 'Google auth',
    keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
  {
    name: 'SMTP email',
    keys: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
  },
];

function isMissing(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function getMissingRequiredEnvVars() {
  return REQUIRED_AUTH_ENV_VARS.filter((key) => isMissing(process.env[key]));
}

function getIncompleteOptionalGroups() {
  return OPTIONAL_SECRET_GROUPS
    .filter(({ keys }) => keys.some((key) => !isMissing(process.env[key])) && keys.some((key) => isMissing(process.env[key])))
    .map(({ name, keys }) => ({
      name,
      missing: keys.filter((key) => isMissing(process.env[key])),
    }));
}

function validateAuthEnv() {
  const missingRequired = getMissingRequiredEnvVars();

  if (missingRequired.length > 0) {
    throw new Error(`Missing required auth environment variables: ${missingRequired.join(', ')}`);
  }

  const incompleteOptional = getIncompleteOptionalGroups();
  if (incompleteOptional.length > 0) {
    const details = incompleteOptional
      .map(({ name, missing }) => `${name} is partially configured; missing ${missing.join(', ')}`)
      .join('; ');
    console.warn(details);
  }
}

module.exports = {
  validateAuthEnv,
  getMissingRequiredEnvVars,
};