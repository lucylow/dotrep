const path = require('path');

const { Files } = require('./core/files');
const files = new Files();

module.exports = {
  show: () => {
    // Use __dirname for more reliable path resolution in cloud deployments
    const targetPath = path.join(__dirname, '..', 'package.json');
    const pkg = files.readJSON(targetPath);

    return pkg.version;
  }
}
