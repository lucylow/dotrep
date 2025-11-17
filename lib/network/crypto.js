const Keyring = require('@polkadot/keyring').default;
const { mnemonicGenerate, mnemonicToLegacySeed, mnemonicValidate } = require('@polkadot/util-crypto');
const process = require('process');
const { u8aToHex } = require('@polkadot/util/u8a/toHex');
const { waitReady } = require('@polkadot/wasm-crypto');

/**
 * Cryptographic key management for Polkadot nodes
 * 
 * This module handles the generation and management of cryptographic keys
 * required for Polkadot validators, including:
 * - Stash and controller keys
 * - Session keys (Grandpa, Babe, I'm Online, Parachain, etc.)
 * 
 * Uses Polkadot's keyring and crypto utilities for secure key generation.
 */
module.exports = {
  /**
   * Get list of session key types
   * @returns {string[]} Array of session key type names
   */
  sessionTypes: () => {
    return [
      'session_grandpa',
      'session_babe',
      'session_imonline',
      'session_parachain',
      'session_audi'
    ];
  },
  
  /**
   * Get all key types (stash, controller, and session keys)
   * @returns {string[]} Array of all key type names
   */
  keyTypes: () => {
    return [
      'stash',
      'controller'
    ].concat(module.exports.sessionTypes());
  },
  
  /**
   * Create cryptographic keys for Polkadot nodes
   * 
   * Generates keys using Polkadot's cryptographic libraries:
   * - Ed25519 for Grandpa session keys
   * - Sr25519 for other keys (stash, controller, Babe, etc.)
   * 
   * @param {number} nodes - Number of nodes to generate keys for
   * @param {boolean} environment - If true, read keys from environment variables
   * @returns {Promise<object>} Object containing keys organized by type
   * @example
   * const keys = await crypto.create(4);
   * // Returns: { stash: [...], controller: [...], session_grandpa: [...], ... }
   */
  create: async (nodes, environment=false) => {
    if (environment) {
      return environmentKeys(nodes);
    }
    const output = {};
    const keyTypes = module.exports.keyTypes();
    keyTypes.forEach((type) => {
      output[type] = [];
    });
    const keyringEd = new Keyring({ type: 'ed25519' });
    const keyringSr = new Keyring({ type: 'sr25519' });

    await waitReady();

    for (let counter = 0; counter < nodes; counter++) {
      keyTypes.forEach((type) => {
        const { seedU8a, seed, mnemonic } = generateSeed();

        let keyring;
        if (type === 'session_grandpa') {
          keyring = keyringEd;
        } else {
          keyring = keyringSr;
        }

        const pair = keyring.addFromSeed(seedU8a);
        const address = pair.address;
        output[type].push({ address, seed, mnemonic });
      });
    }
    return output;
  },
}

/**
 * Generate a cryptographic seed from a mnemonic phrase
 * @private
 * @returns {object} Object containing seed (hex), seedU8a (Uint8Array), and mnemonic
 */
function  generateSeed() {
  const mnemonic = generateValidMnemonic();

  const seedU8a = mnemonicToLegacySeed(mnemonic);
  const seed = u8aToHex(seedU8a);

  return { seed, seedU8a, mnemonic};
}

/**
 * Generate a valid BIP39 mnemonic phrase
 * @private
 * @returns {string} Valid mnemonic phrase
 * @throws {Error} If unable to generate valid mnemonic after max attempts
 */
function generateValidMnemonic() {
  const maxCount = 3;
  let count = 0;
  let isValidMnemonic = false;
  let mnemonic;

  while (!isValidMnemonic) {
    if (count > maxCount) {
      throw new Error('could not generate valid mnemonic!');
    }
    mnemonic = mnemonicGenerate();
    isValidMnemonic = mnemonicValidate(mnemonic);
    count++;
  }
  return mnemonic;
}

function environmentKeys(nodes) {
  const output = {};
  const keyTypes = module.exports.keyTypes();
  keyTypes.forEach((type) => {
    output[type] = [];
  });

  for (let counter = 0; counter < nodes; counter++) {

    const envVarPrefix = `POLKADOT_DEPLOYER_KEYS_${counter}`;
    keyTypes.forEach((type) => {
      const prefix = `${envVarPrefix}_${type.toUpperCase()}`;

      const address = process.env[`${prefix}_ADDRESS`];
      const seed = process.env[`${prefix}_SEED`];

      output[type].push({ address, seed });
    });
  }
  return output;
}
