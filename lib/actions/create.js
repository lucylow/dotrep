const chalk = require('chalk');
const process = require('process');

const cfg = require('../core/cfg');
const { Cluster } = require('../cluster');
const db = require('../core/db');
const { Files } = require('../core/files');
const init = require('../init');
const inquirer = require('./inquirer');
const crypto = require('../network/crypto');
const libp2p = require('../network/libp2p');
const strings = require('../core/strings');
const { Validation } = require('../validation');
const { defaultLogger } = require('../core/logger');
const { ClusterError, ValidationError } = require('../core/errors');
const { createSpinner } = require('../core/progress');

module.exports = {
  do: async (cmd) => {
    const logger = defaultLogger.child('create');
    logger.verbose = cmd.verbose || false;
    
    let config;
    if (cmd.config) {
      try {
        config = cfg.readAndCatch(cmd.config);
        const validator = new Validation();
        if (!validator.run(config)) {
          const error = new ValidationError(
            'Configuration validation failed',
            'config',
            ['Review the error messages above', 'Check sample configs in config/ directory']
          );
          console.error(error.format());
          process.exit(1);
        }
      } catch (err) {
        const error = new ValidationError(
          `Failed to read configuration file: ${err.message}`,
          'config',
          ['Verify the config file path is correct', 'Check file permissions']
        );
        console.error(error.format());
        process.exit(1);
      }
    } else {
      config = await inquirer.create();
    }

    config.verbose = cmd.verbose;
    config.update = cmd.update;
    config.dataPath = cmd.data;

    logger.info('Initializing deployment environment...');
    await init.ensure(config);

    config.name = strings.removeSpaces(config.name)
    if (config.type === 'local') {
      config.workers = 1;
      config.provider = 'kind';
    } else {
      // give 1 more worker for auxiliar services.
      config.workers = config.nodes + 1;
      config.provider = config.type;
    }
    if (!config.nonValidatorIndices) {
      config.nonValidatorIndices = [];
    }
    if (!config.extraArgs) {
      config.extraArgs = "";
    }

    // create custom chainspec if not explicitly disabled.
    if (config.chainspec === undefined) {
      config.chainspec= {};
    }
    if (config.chainspec.custom === undefined) {
      config.chainspec.custom = true;
    }

    return create(config);
  }
}

async function create(config) {
  const logger = defaultLogger.child('create');
  logger.verbose = config.verbose || false;
  
  const deployment = await db.find(config);
  const files = new Files(config);
  if (deployment && !config.update) {
    logger.warn(`Deployment ${config.name} already exists.`);
    //process.exit(1);
  }
  
  logger.info('Creating deployment directories...');
  files.createDeploymentDirectories(config.name);

  // Generate keys with progress indicator
  const keySpinner = createSpinner('Generating cryptographic keys');
  keySpinner.start();
  try {
    const numberOfKeys = getNumberOfKeys(config);
    config.keys = await crypto.create(numberOfKeys, config.environmentKeys);
    config.nodeKeys = await libp2p.createNodeKeys(config.nodes, config.environmentNodeKeys);
    keySpinner.succeed('Keys generated successfully');
  } catch (err) {
    keySpinner.fail('Failed to generate keys');
    logger.error('Key generation failed', err);
    process.exit(1);
  }

  // Create cluster
  const clusterSpinner = createSpinner(`Creating cluster '${config.name}'`);
  clusterSpinner.start();
  const cluster = new Cluster(config);

  try {
    await cluster.create();
    clusterSpinner.succeed('Cluster created successfully');
  } catch (err) {
    clusterSpinner.fail('Failed to create cluster');
    const error = new ClusterError(
      `Could not create cluster: ${err.message}`,
      config.provider || config.type,
      ['Check your cloud provider credentials', 'Verify sufficient quota/resources']
    );
    console.error(error.format());
    logger.error('Cluster creation failed', err);
    await rollback(config, cluster);
    process.exit(1);
  }

  // Install dependencies
  const depsSpinner = createSpinner('Installing dependencies');
  depsSpinner.start();
  try {
    await cluster.installDeps();
    depsSpinner.succeed('Dependencies installed');
  } catch (err) {
    depsSpinner.fail('Failed to install dependencies');
    logger.error('Dependency installation failed', err);
    const error = new ClusterError(
      `Could not install dependencies: ${err.message}`,
      config.provider || config.type
    );
    console.error(error.format());
    await rollback(config, cluster);
    process.exit(1);
  }

  // Initialize nodes
  const nodesSpinner = createSpinner('Initializing Polkadot nodes');
  nodesSpinner.start();
  try {
    await cluster.installNodes();
    nodesSpinner.succeed('Nodes initialized');
  } catch (err) {
    nodesSpinner.fail('Failed to initialize nodes');
    logger.error('Node initialization failed', err);
    const error = new ClusterError(
      `Could not initialize nodes: ${err.message}`,
      config.provider || config.type
    );
    console.error(error.format());
    await rollback(config, cluster);
    process.exit(1);
  }

  logger.info('Saving deployment configuration...');
  await db.save(config);

  if (!config.environmentKeys) {
    console.log(chalk.green(keysBanner(config.keys, config.nodeKeys)));
  }

  // Wait for nodes to be ready
  const readySpinner = createSpinner('Waiting for nodes to be ready');
  readySpinner.start();
  try {
    const result = await cluster.waitReady();
    config.portForwardPID = result.pid;
    config.wsEndpoint = result.wsEndpoint;
    readySpinner.succeed('Nodes are ready');
    
    logger.success(`Deployment '${config.name}' created successfully!`);
    logger.info(`WebSocket endpoint: ${config.wsEndpoint}`);
  } catch (err) {
    readySpinner.fail('Failed to connect to nodes');
    logger.error('Node readiness check failed', err);
    const error = new ClusterError(
      `Could not forward port: ${err.message}`,
      config.provider || config.type
    );
    console.error(error.format());
    await rollback(config, cluster);
    process.exit(1);
  }

  /*
  if (config.type !== 'local') {
    files.deleteKubeconfig(config.name);
  }
  */
}

async function rollback(config, cluster) {
  if (!config.keep) {
    const files = new Files(config);
    await cluster.destroy();
    const deploymentPath = files.deploymentPath(config.name);
    files.deleteDirectory(deploymentPath);
  }
}

function keysBanner(keys, nodeKeys) {
  const starLine = `*******************************************************************************`
  let keysString = '';
  const keyTypes = crypto.keyTypes();
  const totalKeys = keys[keyTypes[0]].length;
  for (let counter = 0; counter < totalKeys; counter++) {
    keyTypes.forEach((type) => {
      keysString += `
export POLKADOT_DEPLOYER_KEYS_${counter}_${type.toUpperCase()}_ADDRESS=${keys[type][counter].address}
export POLKADOT_DEPLOYER_KEYS_${counter}_${type.toUpperCase()}_SEED=${keys[type][counter].seed}
`;
    });
  }
  let nodesString = '';
  for (let counter = 0; counter < nodeKeys.length; counter++) {
    nodesString +=`
export POLKADOT_DEPLOYER_NODE_KEYS_${counter}_KEY=${nodeKeys[counter].nodeKey}
export POLKADOT_DEPLOYER_NODE_KEYS_${counter}_PEER_ID=${nodeKeys[counter].peerId}
`
  }

  return `

${starLine}
${starLine}

 IMPORTANT: the raw seeds for the created accounts will be shown next.

 These seeds allow to gain control over the accounts represented by
 the keys. If you plan to use the new cluster for other than testing
 or trying the technology, please keep them safe. If you lose these
 seeds you won't be able to access the accounts. If anyone founds them,
 they can gain control over the accounts and any funds (test or real DOTs)
 stored in them.

${keysString}

${nodesString}

${starLine}
${starLine}
`
}

function getNumberOfKeys(config) {
  let output = config.nodes;

  if (config.remote && config.remote.clusters) {
    output -= config.nonValidatorIndices.length * config.remote.clusters.length;
  }

  return output;
}
