const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const logger = require('winston').default;
const { encrypt, decrypt } = require('../../shared/utils/cryptoUtils');

class EmailService {
  constructor() {
    this.transporter = null;
    this.config = null;
    this.isReady = false;
  }

  /**
   * Initialize email service with stored configuration
   * @param {Object} config - Email configuration object
   */
  async initialize(config) {
    if (!config || !config.enabled) {
      this.isReady = false;
      return;
    }

    this.config = config;

    try {
      if (config.provider === 'smtp') {
        // Decrypt stored credentials
        const password = config.smtpPassword ? decrypt(config.smtpPassword) : '';
        
        this.transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort || 587,
          secure: config.smtpPort === 465, // true for 465, false for 587
          auth: {
            user: config.smtpUser,
            pass: password,
          },
        });

        // Verify connection
        await this.transporter.verify();
        logger.info('SMTP email service initialized successfully');
      } else if (config.provider === 'sendgrid') {
        // Decrypt API key
        const apiKey = config.sendgridApiKey ? decrypt(config.sendgridApiKey) : '';
        sgMail.setApiKey(apiKey);
        logger.info('SendGrid email service initialized successfully');
      }

      this.isReady = true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isReady = false;
      throw error;
    }
  }

  /**
   * Send backup success notification
   * @param {Object} profile - Backup profile info
   * @param {Object} backupInfo - Backup result details
   */
  async sendBackupSuccess(profile, backupInfo) {
    if (!this.isReady || !this.config.notifyOnSuccess) {
      return;
    }

    try {
      const { emailTemplates } = require('./email-templates');
      const html = emailTemplates.success(profile, backupInfo);
      
      const subject = `✅ Backup Successful: ${profile.name}`;
      await this._sendEmail(subject, html);
      
      logger.info('Backup success email sent', { profile: profile.name });
    } catch (error) {
      logger.error('Failed to send backup success email:', error);
      // Don't throw - don't interrupt backup process
    }
  }

  /**
   * Send backup failure notification
   * @param {Object} profile - Backup profile info
   * @param {Error} error - Error that occurred
   */
  async sendBackupFailure(profile, error) {
    if (!this.isReady || !this.config.notifyOnFailure) {
      return;
    }

    try {
      const { emailTemplates } = require('./email-templates');
      const html = emailTemplates.failure(profile, error);
      
      const subject = `❌ Backup Failed: ${profile.name}`;
      await this._sendEmail(subject, html);
      
      logger.info('Backup failure email sent', { profile: profile.name });
    } catch (error) {
      logger.error('Failed to send backup failure email:', error);
      // Don't throw - don't interrupt failure handling
    }
  }

  /**
   * Send test email to verify configuration
   * @param {string} toEmail - Recipient email address
   * @returns {Object} Result with success status and message
   */
  async sendTestEmail(toEmail) {
    if (!this.config) {
      throw new Error('Email service not configured');
    }

    try {
      const { emailTemplates } = require('./email-templates');
      const html = emailTemplates.test();
      
      const subject = '🧪 Test Email - Backup Pro';
      await this._sendEmail(subject, html, toEmail);
      
      logger.info('Test email sent successfully', { toEmail });
      return {
        success: true,
        message: `Test email sent to ${toEmail}`,
      };
    } catch (error) {
      logger.error('Failed to send test email:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Internal method to send email via configured provider
   * @private
   */
  async _sendEmail(subject, html, toEmail = null) {
    const recipients = toEmail ? [toEmail] : this.config.recipientEmails || [];
    
    if (!recipients || recipients.length === 0) {
      throw new Error('No recipient emails configured');
    }

    if (this.config.provider === 'smtp') {
      await this.transporter.sendMail({
        from: this.config.fromEmail,
        to: recipients.join(','),
        subject,
        html,
      });
    } else if (this.config.provider === 'sendgrid') {
      const msg = {
        to: recipients,
        from: this.config.fromEmail,
        subject,
        html,
      };
      await sgMail.send(msg);
    } else {
      throw new Error(`Unknown email provider: ${this.config.provider}`);
    }
  }

  /**
   * Validate email configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];

    if (!config.provider || !['smtp', 'sendgrid'].includes(config.provider)) {
      errors.push('Invalid or missing email provider');
    }

    if (!config.fromEmail || !this._isValidEmail(config.fromEmail)) {
      errors.push('Invalid or missing "from" email address');
    }

    if (!config.recipientEmails || !Array.isArray(config.recipientEmails) || config.recipientEmails.length === 0) {
      errors.push('At least one recipient email is required');
    } else {
      config.recipientEmails.forEach((email, index) => {
        if (!this._isValidEmail(email)) {
          errors.push(`Invalid recipient email at index ${index}: ${email}`);
        }
      });
    }

    if (config.provider === 'smtp') {
      if (!config.smtpHost) errors.push('SMTP host is required');
      if (!config.smtpPort) errors.push('SMTP port is required');
      if (!config.smtpUser) errors.push('SMTP username is required');
      if (!config.smtpPassword) errors.push('SMTP password is required');
    } else if (config.provider === 'sendgrid') {
      if (!config.sendgridApiKey) errors.push('SendGrid API key is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email address format
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig() {
    if (!this.config) {
      return null;
    }

    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      recipientEmails: this.config.recipientEmails || [],
      notifyOnSuccess: this.config.notifyOnSuccess,
      notifyOnFailure: this.config.notifyOnFailure,
      fromEmail: this.config.fromEmail,
      // Don't return sensitive data
      smtpHost: this.config.smtpHost,
      smtpPort: this.config.smtpPort,
      smtpUser: this.config.smtpUser,
      // smtpPassword is intentionally omitted
      // sendgridApiKey is intentionally omitted
    };
  }
}

module.exports = new EmailService();
