'use strict';

const R = require('ramda'),
  AWS = require('aws-sdk'),
  config = require('config');

AWS.config.update(R.path(['aws', 'config'], config));

const s3 = new AWS.S3();

module.exports = {
  saveFile: require('./methods/saveFile')(s3),
  getFiles: require('./methods/getFiles')(s3),
  deleteFile: require('./methods/deleteFile')(s3),
  copyFile: require('./methods/copyFile')(s3),
  getFileMeta: require('./methods/getFileMeta')(s3),
};
