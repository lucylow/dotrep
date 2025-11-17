/**
 * Progress indicator utilities for better UX
 * Provides visual feedback for long-running operations
 */

const chalk = require('chalk');
const readline = require('readline');
const process = require('process');

class ProgressIndicator {
  constructor(message, total = 100) {
    this.message = message;
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Update progress
   * @param {number} current - Current progress value
   * @param {string} status - Optional status message
   */
  update(current, status = '') {
    this.current = current;
    const percentage = Math.min(100, Math.round((current / this.total) * 100));
    const bar = this._createProgressBar(percentage);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    let output = `\r${chalk.cyan(this.message)} ${bar} ${chalk.yellow(percentage + '%')} ${chalk.gray(`(${elapsed}s)`)}`;
    if (status) {
      output += ` ${chalk.gray(status)}`;
    }
    
    process.stdout.write(output);
    
    if (current >= this.total) {
      this.complete();
    }
  }

  /**
   * Increment progress by 1
   * @param {string} status - Optional status message
   */
  increment(status = '') {
    this.update(this.current + 1, status);
  }

  /**
   * Mark as complete
   * @param {string} message - Optional completion message
   */
  complete(message = '') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const bar = this._createProgressBar(100);
    let output = `\r${chalk.green(this.message)} ${bar} ${chalk.green('100%')} ${chalk.gray(`(${elapsed}s)`)}`;
    if (message) {
      output += ` ${chalk.green(message)}`;
    }
    process.stdout.write(output + '\n');
    this.rl.close();
  }

  /**
   * Mark as failed
   * @param {string} message - Error message
   */
  fail(message) {
    const bar = this._createProgressBar(this.current);
    const percentage = Math.round((this.current / this.total) * 100);
    process.stdout.write(`\r${chalk.red(this.message)} ${bar} ${chalk.red(percentage + '%')} ${chalk.red('FAILED')}\n`);
    if (message) {
      console.error(chalk.red(`Error: ${message}`));
    }
    this.rl.close();
  }

  /**
   * Create a progress bar
   * @private
   * @param {number} percentage - Percentage complete
   * @returns {string} Progress bar string
   */
  _createProgressBar(percentage) {
    const barLength = 30;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    return '[' + chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + ']';
  }
}

/**
 * Spinner for indeterminate progress
 */
class Spinner {
  constructor(message) {
    this.message = message;
    this.spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentIndex = 0;
    this.interval = null;
  }

  /**
   * Start the spinner
   */
  start() {
    this.interval = setInterval(() => {
      const char = this.spinnerChars[this.currentIndex];
      process.stdout.write(`\r${chalk.cyan(char)} ${this.message}`);
      this.currentIndex = (this.currentIndex + 1) % this.spinnerChars.length;
    }, 100);
  }

  /**
   * Stop the spinner with success message
   * @param {string} message - Optional success message
   */
  succeed(message = '') {
    this.stop();
    if (message) {
      console.log(chalk.green(`✓ ${this.message} ${message}`));
    } else {
      console.log(chalk.green(`✓ ${this.message}`));
    }
  }

  /**
   * Stop the spinner with failure message
   * @param {string} message - Error message
   */
  fail(message) {
    this.stop();
    console.error(chalk.red(`✗ ${this.message} ${message}`));
  }

  /**
   * Stop the spinner
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
    }
  }
}

/**
 * Create a progress indicator
 * @param {string} message - Progress message
 * @param {number} total - Total items
 * @returns {ProgressIndicator} Progress indicator instance
 */
function createProgress(message, total = 100) {
  return new ProgressIndicator(message, total);
}

/**
 * Create a spinner
 * @param {string} message - Spinner message
 * @returns {Spinner} Spinner instance
 */
function createSpinner(message) {
  return new Spinner(message);
}

module.exports = {
  ProgressIndicator,
  Spinner,
  createProgress,
  createSpinner
};

