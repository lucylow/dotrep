/**
 * Comprehensive logging system for polkadot-deployer
 * Provides structured logging with different log levels
 */

const chalk = require('chalk');
const moment = require('moment');
const process = require('process');

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4
};

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.level = options.level || (this.verbose ? LOG_LEVELS.VERBOSE : LOG_LEVELS.INFO);
    this.prefix = options.prefix || 'polkadot-deployer';
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error} error - Optional error object
   */
  error(message, error = null) {
    if (this.level >= LOG_LEVELS.ERROR) {
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      console.error(chalk.red(`[${timestamp}] [ERROR] ${this.prefix}: ${message}`));
      if (error && this.verbose) {
        console.error(chalk.red(error.stack));
      }
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    if (this.level >= LOG_LEVELS.WARN) {
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      console.warn(chalk.yellow(`[${timestamp}] [WARN] ${this.prefix}: ${message}`));
    }
  }

  /**
   * Log an info message
   * @param {string} message - Info message
   */
  info(message) {
    if (this.level >= LOG_LEVELS.INFO) {
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      console.log(chalk.blue(`[${timestamp}] [INFO] ${this.prefix}: ${message}`));
    }
  }

  /**
   * Log a success message
   * @param {string} message - Success message
   */
  success(message) {
    if (this.level >= LOG_LEVELS.INFO) {
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      console.log(chalk.green(`[${timestamp}] [SUCCESS] ${this.prefix}: ${message}`));
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Debug message
   * @param {object} data - Optional data object
   */
  debug(message, data = null) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      console.log(chalk.gray(`[${timestamp}] [DEBUG] ${this.prefix}: ${message}`));
      if (data && this.verbose) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  /**
   * Log a verbose message
   * @param {string} message - Verbose message
   * @param {object} data - Optional data object
   */
  verbose(message, data = null) {
    if (this.level >= LOG_LEVELS.VERBOSE) {
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      console.log(chalk.gray(`[${timestamp}] [VERBOSE] ${this.prefix}: ${message}`));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  /**
   * Create a child logger with a specific prefix
   * @param {string} prefix - Prefix for the child logger
   * @returns {Logger} New logger instance
   */
  child(prefix) {
    return new Logger({
      verbose: this.verbose,
      level: this.level,
      prefix: `${this.prefix}:${prefix}`
    });
  }

  /**
   * Log progress information
   * @param {string} operation - Operation name
   * @param {number} current - Current progress
   * @param {number} total - Total items
   */
  progress(operation, current, total) {
    if (this.level >= LOG_LEVELS.INFO) {
      const percentage = Math.round((current / total) * 100);
      const bar = this._createProgressBar(percentage);
      process.stdout.write(`\r${chalk.cyan(`[${operation}] ${bar} ${percentage}% (${current}/${total})`)}`);
      if (current === total) {
        process.stdout.write('\n');
      }
    }
  }

  /**
   * Create a simple progress bar
   * @private
   * @param {number} percentage - Percentage complete
   * @returns {string} Progress bar string
   */
  _createProgressBar(percentage) {
    const barLength = 30;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }
}

// Create a default logger instance
const defaultLogger = new Logger();

module.exports = {
  Logger,
  defaultLogger,
  LOG_LEVELS
};

