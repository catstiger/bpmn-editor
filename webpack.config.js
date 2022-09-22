const path = require('path');

module.exports = {
    mode: 'development',
    entry: './index.js',
    output: {
        filename: 'bpmn-jseditor.js',
        path: path.resolve(__dirname, 'dist')
    },
};