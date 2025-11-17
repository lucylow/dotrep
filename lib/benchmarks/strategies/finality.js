const { ApiPromise, WsProvider } = require('@polkadot/api');
const { defaultLogger } = require('../../core/logger');
const { PolkadotAPIError, TimeoutError } = require('../../core/errors');

/**
 * Finality Benchmarks Strategy
 * Measures the time to finality for blocks in a Polkadot network
 * 
 * This class leverages the Polkadot API to subscribe to block production
 * and finalization events, calculating the time difference between when
 * a block is produced and when it's finalized.
 */
class FinalityBenchmarks {
  /**
   * Create a new FinalityBenchmarks instance
   * @param {object} config - Configuration object
   * @param {string} config.wsEndpoint - WebSocket endpoint for Polkadot node
   * @param {object} config.blocks - Block configuration
   * @param {number} config.blocks.offset - Number of blocks to skip before measuring
   * @param {number} config.blocks.measure - Number of blocks to measure
   * @param {number} config.timeout - Optional timeout in milliseconds
   */
  constructor(config) {
    this.config = config;
    this.logger = defaultLogger.child('finality-benchmark');
    this.timeout = config.timeout || 300000; // 5 minutes default
  }

  /**
   * Collect finality metrics
   * @returns {Promise<number[]>} Array of finalization times in milliseconds
   */
  metrics() {
    return new Promise(async (resolve, reject) => {
      let api;
      let timeoutId;
      
      try {
        const provider = new WsProvider(this.config.wsEndpoint);
        api = await ApiPromise.create({ provider });
        
        this.logger.info('Connected to Polkadot node, starting finality measurements');
        
        const result = [];
        let blockCounter = 0;
        let finalizedBlockCounter = 0;
        const creationTimestamps = new Map();

        // Set timeout
        timeoutId = setTimeout(() => {
          if (api) {
            api.disconnect();
          }
          const error = new TimeoutError('Finality benchmark', this.timeout);
          this.logger.error('Benchmark timed out');
          reject(error);
        }, this.timeout);

        // Subscribe to new block headers
        const unsubscribeNewHead = await api.rpc.chain.subscribeNewHeads(async (header) => {
          try {
            const blockNumber = header.number.toNumber();
            const timestamp = Date.now();
            
            this.logger.debug(`New block produced: #${blockNumber} at ${new Date(timestamp).toISOString()}`);
            blockCounter++;
            
            // Safety check: if too many blocks without finalization, something is wrong
            if (blockCounter - finalizedBlockCounter > 100) {
              this.logger.warn(`Too many new blocks (${blockCounter}) without finalization, exiting`);
              if (unsubscribeNewHead) unsubscribeNewHead();
              if (api) api.disconnect();
              if (timeoutId) clearTimeout(timeoutId);
              resolve([]);
              return;
            }
            
            creationTimestamps.set(blockNumber.toString(), timestamp);
          } catch (err) {
            this.logger.error('Error processing new block header', err);
          }
        });

        // Subscribe to finalized block headers
        const unsubscribeFinalized = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
          try {
            const blockNumber = header.number.toNumber();
            const finalizationTimestamp = Date.now();
            finalizedBlockCounter++;
            
            // Skip blocks before offset
            if (this.config.blocks.offset && finalizedBlockCounter < this.config.blocks.offset) {
              this.logger.debug(`Skipping block #${blockNumber} (offset: ${finalizedBlockCounter}/${this.config.blocks.offset})`);
              return;
            }

            const creationTimestamp = creationTimestamps.get(blockNumber.toString());
            if (!creationTimestamp) {
              this.logger.warn(`Creation timestamp not found for finalized block #${blockNumber}`);
              return;
            }

            const finalizationTime = finalizationTimestamp - creationTimestamp;
            result.push(finalizationTime);
            
            this.logger.info(
              `Block #${blockNumber} finalized in ${finalizationTime}ms ` +
              `(${(finalizationTime / 1000).toFixed(2)}s)`
            );

            // Check if we have enough measurements
            if (result.length >= this.config.blocks.measure) {
              if (unsubscribeNewHead) unsubscribeNewHead();
              if (unsubscribeFinalized) unsubscribeFinalized();
              if (api) api.disconnect();
              if (timeoutId) clearTimeout(timeoutId);
              
              const avgTime = result.reduce((a, b) => a + b, 0) / result.length;
              this.logger.success(
                `Benchmark complete: ${result.length} blocks measured, ` +
                `average finalization time: ${avgTime.toFixed(2)}ms (${(avgTime / 1000).toFixed(2)}s)`
              );
              
              resolve(result);
            }
          } catch (err) {
            this.logger.error('Error processing finalized block header', err);
          }
        });

      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (api) {
          try {
            api.disconnect();
          } catch (disconnectErr) {
            // Ignore disconnect errors
          }
        }
        
        const error = new PolkadotAPIError(
          `Failed to connect to Polkadot node: ${err.message}`,
          this.config.wsEndpoint,
          ['Verify the WebSocket endpoint is correct', 'Check that the node is running']
        );
        this.logger.error('Failed to establish API connection', err);
        reject(error);
      }
    });
  }
}

module.exports = {
  FinalityBenchmarks
}
