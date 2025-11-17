/**
 * Status command - Monitor deployment health and status
 * Provides real-time information about deployments
 */

const chalk = require('chalk');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const cliTable3 = require('cli-table3');
const process = require('process');

const db = require('../core/db');
const { defaultLogger } = require('../core/logger');
const { PolkadotAPIError, NotFoundError } = require('../core/errors');
const { createSpinner } = require('../core/progress');

/**
 * Get status of a deployment
 * @param {object} cmd - Command options
 */
async function getStatus(cmd) {
  const logger = defaultLogger;
  const deploymentName = cmd.name;

  if (!deploymentName) {
    logger.error('Deployment name is required');
    console.log(chalk.yellow('Usage: polkadot-deployer status <deployment-name>'));
    process.exit(1);
  }

  const deployment = await db.find({ name: deploymentName });
  if (!deployment) {
    const error = new NotFoundError('Deployment', deploymentName);
    console.error(error.format());
    process.exit(1);
  }

  logger.info(`Checking status of deployment: ${deploymentName}`);

  // Display basic deployment info
  displayDeploymentInfo(deployment);

  // Check WebSocket connection if available
  if (deployment.wsEndpoint) {
    await checkNodeStatus(deployment.wsEndpoint, logger);
  } else {
    logger.warn('No WebSocket endpoint available for this deployment');
  }
}

/**
 * Display deployment information
 * @param {object} deployment - Deployment configuration
 */
function displayDeploymentInfo(deployment) {
  const table = new cliTable3({
    head: [chalk.cyan('Property'), chalk.cyan('Value')],
    style: { head: [], border: [] }
  });

  table.push(
    [chalk.yellow('Name'), deployment.name],
    [chalk.yellow('Type'), deployment.type],
    [chalk.yellow('Provider'), deployment.provider || 'N/A'],
    [chalk.yellow('Nodes'), deployment.nodes],
    [chalk.yellow('Workers'), deployment.workers || 'N/A'],
    [chalk.yellow('WebSocket Endpoint'), deployment.wsEndpoint || 'N/A']
  );

  console.log('\n' + chalk.bold('Deployment Information:'));
  console.log(table.toString());
}

/**
 * Check node status via Polkadot API
 * @param {string} wsEndpoint - WebSocket endpoint
 * @param {object} logger - Logger instance
 */
async function checkNodeStatus(wsEndpoint, logger) {
  const spinner = createSpinner('Connecting to Polkadot node');
  spinner.start();

  try {
    const provider = new WsProvider(wsEndpoint);
    const api = await ApiPromise.create({ provider });
    
    spinner.succeed('Connected to node');

    // Get chain information
    const [chain, nodeName, nodeVersion, health, peers, finalizedHead] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version(),
      api.rpc.system.health(),
      api.rpc.system.peers(),
      api.rpc.chain.getFinalizedHead()
    ]);

    // Get block information
    const finalizedBlock = await api.rpc.chain.getBlock(finalizedHead);
    const finalizedBlockNumber = finalizedBlock.block.header.number.toNumber();

    // Display node status
    displayNodeStatus({
      chain: chain.toString(),
      nodeName: nodeName.toString(),
      nodeVersion: nodeVersion.toString(),
      health,
      peers: peers.length,
      finalizedBlock: finalizedBlockNumber
    });

    await api.disconnect();
  } catch (error) {
    spinner.fail('Failed to connect');
    const apiError = new PolkadotAPIError(
      `Failed to connect to node at ${wsEndpoint}`,
      wsEndpoint,
      ['Check if the node is running', 'Verify the WebSocket endpoint is correct']
    );
    console.error(apiError.format());
    logger.debug('Connection error details', { error: error.message });
  }
}

/**
 * Display node status information
 * @param {object} status - Node status data
 */
function displayNodeStatus(status) {
  const table = new cliTable3({
    head: [chalk.cyan('Property'), chalk.cyan('Value')],
    style: { head: [], border: [] }
  });

  const healthStatus = status.health.isSyncing
    ? chalk.yellow('Syncing')
    : status.health.shouldHavePeers && status.peers === 0
    ? chalk.red('No Peers')
    : chalk.green('Healthy');

  table.push(
    [chalk.yellow('Chain'), status.chain],
    [chalk.yellow('Node Name'), status.nodeName],
    [chalk.yellow('Node Version'), status.nodeVersion],
    [chalk.yellow('Health Status'), healthStatus],
    [chalk.yellow('Peers'), status.peers],
    [chalk.yellow('Finalized Block'), status.finalizedBlock]
  );

  console.log('\n' + chalk.bold('Node Status:'));
  console.log(table.toString());
}

module.exports = {
  do: getStatus
};


