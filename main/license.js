const jwt = require('jsonwebtoken');
const machineId = require('node-machine-id');
const { getSetting, setSetting } = require('./db/queries');

const LICENSE_PUBLIC_KEY = process.env.LICENSE_PUBLIC_KEY || 'your-public-key';

async function validateLicenseOnStartup() {
  try {
    const licenseKey = getSetting('license_key');
    const machineFingerprint = await machineId.machineId();

    if (!licenseKey) {
      console.warn('No license key configured');
      return true; // Allow demo mode
    }

    const jwtToken = getSetting('license_jwt');
    const decoded = jwt.verify(jwtToken, LICENSE_PUBLIC_KEY);

    if (decoded.machineId !== machineFingerprint) {
      console.error('License machine mismatch');
      return false;
    }

    if (new Date(decoded.exp * 1000) < new Date()) {
      console.error('License expired');
      return false;
    }

    return true;
  } catch (error) {
    console.error('License validation error:', error);
    return false;
  }
}

async function validateLicense(licenseKey) {
  try {
    const machineFingerprint = await machineId.machineId();
    
    // In production, validate against license server
    setSetting('license_key', licenseKey);
    setSetting('license_jwt', 'jwt-token-from-server');
    
    return true;
  } catch (error) {
    console.error('License validation failed:', error);
    throw error;
  }
}

module.exports = {
  validateLicenseOnStartup,
  validateLicense
};
