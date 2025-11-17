/**
 * Custom error classes for polkadot-deployer
 * Provides better error handling and user-friendly error messages
 */

const chalk = require('chalk');

/**
 * Base error class for polkadot-deployer
 */
class DeployerError extends Error {
  constructor(message, code, suggestions = []) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.suggestions = suggestions;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Formats error message with suggestions
   * @returns {string} Formatted error message
   */
  format() {
    let output = chalk.red(`\n❌ ${this.name}: ${this.message}\n`);
    if (this.code) {
      output += chalk.gray(`   Error Code: ${this.code}\n`);
    }
    if (this.suggestions && this.suggestions.length > 0) {
      output += chalk.yellow('\n💡 Suggestions:\n');
      this.suggestions.forEach((suggestion, index) => {
        output += chalk.yellow(`   ${index + 1}. ${suggestion}\n`);
      });
    }
    return output;
  }
}

/**
 * Cluster creation error
 */
class ClusterError extends DeployerError {
  constructor(message, provider, suggestions = []) {
    const defaultSuggestions = [
      `Check your ${provider} credentials and permissions`,
      `Verify you have sufficient quota/resources on ${provider}`,
      `Check network connectivity`,
      `Review the verbose logs with --verbose flag`
    ];
    super(message, 'CLUSTER_ERROR', [...defaultSuggestions, ...suggestions]);
    this.provider = provider;
  }
}

/**
 * Network configuration error
 */
class NetworkError extends DeployerError {
  constructor(message, suggestions = []) {
    const defaultSuggestions = [
      'Verify your Cloudflare credentials are set correctly',
      'Check that your domain is properly configured',
      'Ensure DNS settings are correct',
      'Check network connectivity to the deployment'
    ];
    super(message, 'NETWORK_ERROR', [...defaultSuggestions, ...suggestions]);
  }
}

/**
 * Configuration validation error
 */
class ValidationError extends DeployerError {
  constructor(message, field, suggestions = []) {
    const defaultSuggestions = [
      `Check the '${field}' field in your configuration`,
      'Review the sample configuration files in the config/ directory',
      'Use the interactive wizard by omitting --config flag'
    ];
    super(message, 'VALIDATION_ERROR', [...defaultSuggestions, ...suggestions]);
    this.field = field;
  }
}

/**
 * Polkadot API error
 */
class PolkadotAPIError extends DeployerError {
  constructor(message, endpoint, suggestions = []) {
    const defaultSuggestions = [
      `Verify the WebSocket endpoint is accessible: ${endpoint}`,
      'Check that Polkadot nodes are running and healthy',
      'Wait a few moments and try again - nodes may still be initializing',
      'Check node logs for connection issues'
    ];
    super(message, 'POLKADOT_API_ERROR', [...defaultSuggestions, ...suggestions]);
    this.endpoint = endpoint;
  }
}

/**
 * Resource not found error
 */
class NotFoundError extends DeployerError {
  constructor(resource, name, suggestions = []) {
    const message = `${resource} '${name}' not found`;
    const defaultSuggestions = [
      `Use 'polkadot-deployer list' to see available ${resource}s`,
      `Verify the ${resource} name is correct`,
      `Check if the ${resource} was deleted or never created`
    ];
    super(message, 'NOT_FOUND', [...defaultSuggestions, ...suggestions]);
    this.resource = resource;
    this.name = name;
  }
}

/**
 * Timeout error
 */
class TimeoutError extends DeployerError {
  constructor(operation, timeout, suggestions = []) {
    const message = `Operation '${operation}' timed out after ${timeout}ms`;
    const defaultSuggestions = [
      'The operation may still be in progress - check with status command',
      'Increase timeout if operation typically takes longer',
      'Check network connectivity and resource availability',
      'Review logs for any errors that may have caused delays'
    ];
    super(message, 'TIMEOUT_ERROR', [...defaultSuggestions, ...suggestions]);
    this.operation = operation;
    this.timeout = timeout;
  }
}

module.exports = {
  DeployerError,
  ClusterError,
  NetworkError,
  ValidationError,
  PolkadotAPIError,
  NotFoundError,
  TimeoutError
};


