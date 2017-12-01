const redis = require('redis');
const config = require('config');
const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});
const cacheUtils = require('alien-node-redis-utils')(redisClient);

const conversation = require('../stubs/conversation.json');
const collection = require('../stubs/collection.json');
const series = require('../stubs/series.json');
const messages = require('../stubs/messages.json');
const blocks = require('../stubs/blocks.json');
const media = require('../stubs/media.json');
const {
  DB_CONVERSATIONS,
  DB_COLLECTIONS,
  DB_SERIES,
  DB_MESSAGES,
  DB_BLOCKS,
  DB_MEDIA,
  DB_TAG,
  ONE_WEEK_IN_MILLISECONDS
} = require('../constants');

let promises = [
  cacheUtils.deleteItem(DB_CONVERSATIONS).then(() => {
    cacheUtils.setItem(
      DB_CONVERSATIONS,
      ONE_WEEK_IN_MILLISECONDS,
      conversation
    );
  }),

  cacheUtils.deleteItem(DB_COLLECTIONS).then(() => {
    cacheUtils.setItem(DB_COLLECTIONS, ONE_WEEK_IN_MILLISECONDS, collection);
  }),

  cacheUtils.deleteItem(DB_SERIES).then(() => {
    cacheUtils.setItem(DB_SERIES, ONE_WEEK_IN_MILLISECONDS, series);
  }),

  cacheUtils.deleteItem(DB_MESSAGES).then(() => {
    cacheUtils.setItem(DB_MESSAGES, ONE_WEEK_IN_MILLISECONDS, messages);
  }),

  cacheUtils.deleteItem(DB_BLOCKS).then(() => {
    cacheUtils.setItem(DB_BLOCKS, ONE_WEEK_IN_MILLISECONDS, blocks);
  }),
  cacheUtils.deleteItem(DB_MEDIA).then(() => {
    cacheUtils.setItem(DB_MEDIA, ONE_WEEK_IN_MILLISECONDS, media);
  }),
  cacheUtils.deleteItem(DB_TAG).then(() => {
    cacheUtils.setItem(DB_TAG, ONE_WEEK_IN_MILLISECONDS, []);
  })
];

Promise.all(promises).then(process.exit);
