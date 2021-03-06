const {
  getCollections,
  getCollectionById,
  setCollection,
  updateCollection,
} = require('../db')(require('../utils/store'));

/**
 * Create Collection
 *
 * @param {Object} collection
 * @return {Promise}
*/
exports.create = setCollection;

/**
 * Update Collection
 *
 * @param {Object} collection
 * @return {Promise}
*/
exports.update = updateCollection;

/**
 * Get a Collection by ID
 *
 * @param {String} id
 * @return {Promise}
*/
exports.get = getCollectionById;

/**
 * Get all Collections
 *
 * @return {Promise}
*/
exports.all = getCollections;
