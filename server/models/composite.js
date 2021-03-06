const R = require('ramda');

const block = require('./block');
const collection = require('./collection');
const conversation = require('./conversation');
const series = require('./series');
const message = require('./message');
const redisClient = require('../utils/client');

const { updateStart, getMessages, getCollections, getNameCopyNumber } = require('../db')(require('../utils/store'));
const helpers = require('../helpers/db');
const Constants = require('../constants');

const { promiseSerial, keyFormatForCollOrMessage } = require('../utils/data');

const config = require('config');
const store = require('../utils/store');

const {
  TYPE_CONVERSATION,
  TYPE_COLLECTION,
  TYPE_SERIES,
  TYPE_BLOCK,
  MESSAGE_TYPE_QUESTION_WITH_REPLIES,
  DEFAULT_NAME,
  TYPE_MESSAGE,
  DB_MESSAGE_LIST,
  DB_COLLECTION_LIST
} = require('../constants');

const modelMap = { conversation, collection, series, block, message };

const { getNewestInList } = helpers;

const makeANewCollection = conversations => ({
  type: TYPE_COLLECTION,
  private: true,
  name: DEFAULT_NAME,
  parent: {
    type: TYPE_CONVERSATION,
    id: getNewestInList(conversations).id
  }
});

const makeANewSeries = collections => ({
  type: TYPE_SERIES,
  private: true,
  name: DEFAULT_NAME,
  parent: {
    type: TYPE_COLLECTION,
    id: getNewestInList(collections).id
  }
});

const makeANewBlock = allSeries => ({
  type: TYPE_BLOCK,
  private: true,
  name: DEFAULT_NAME,
  parent: {
    type: TYPE_SERIES,
    id: getNewestInList(allSeries).id
  }
});

/**
 * Create a new Conversation and default private descendants
 *
 * @param {Object} entity
 * @return {Promise}
*/
exports.createConversation = entity =>
  conversation.create(entity).then(conversations =>
    collection.create(makeANewCollection(conversations)).then(collections =>
      series.create(makeANewSeries(collections)).then(allSeries =>
        block.create(makeANewBlock(allSeries)).then(blocks => ({
          block: blocks,
          series: allSeries,
          collection: collections,
          conversation: conversations
        }))
      )
    )
  );

/**
   * Update all Message Pointers Between Two Lists (Old, New)
   *
   * @param {Object} entityOldNew
   * @return {Array}
  */
function createChainedItemsList(entityOldNew) {
  const oldList = R.pluck('oldChild', entityOldNew);
  const newList = R.pluck('newChild', entityOldNew);
  let listToSave = newList;

  oldList.forEach((oldItem, i) => {
    listToSave = listToSave.map(newItem => {
      if (R.pathEq(['next', 'id'], oldItem.id, newItem)) {
        return R.merge(newItem, {
          next: { id: listToSave[i].id, type: listToSave[i].type }
        });
      }

      if (newItem.messageType === MESSAGE_TYPE_QUESTION_WITH_REPLIES) {
        const quick_replies = newItem.quick_replies.map(qr => {
          let payload;
          try {
            payload = JSON.parse(qr.payload);
          } catch(e) {
            console.error(e);
          }
          if (!!payload && payload.id === oldItem.id) {
            const newPayload = JSON.stringify({
              id: listToSave[i].id,
              type: listToSave[i].type
            });
            return Object.assign({}, qr, {payload: newPayload});
          }
          return qr;
        });

        return R.merge(newItem, { quick_replies });
      }

      return newItem;
    });
  });

  return listToSave;
}

/**
 * Copy children
 *
 * @param {Object} parent
 * @param {Array} children
 * @return {Promise}
*/
const copyChildren = parent =>
  function(children) {
    const childPromises = children.map(oldChild => async () => {
      return modelMap[oldChild.type]
        .create(
          R.merge(oldChild, {
            parent: {
              type: parent.type,
              id: parent.id
            },
            id: null,
            name: await generateCopyName(oldChild.name)
          })
        )
        .then(newChildList => {
          const newChild = getNewestInList(newChildList);

          return {
            oldChild,
            newChild
          };
        })
        .catch(console.error);
    });

    return promiseSerial(childPromises).then(R.uniq);
  };

const generateCopyName = name =>
  getNameCopyNumber(name).then(val => `${name} copy-${val}`);


/**
 * Copy the Parent Entity
 *
 * @param {Object} parent
 * @return {Promise}
*/
const copyParent = async parent =>
  modelMap[parent.type].create(
    R.merge(parent, { id: null, name: await generateCopyName(parent.name) })
  );


/**
 * Construct Return Value By Entity Key
 *
 * @param {Object}
 * @return {Function}
*/
const constructReturnCopiedValues = parent => children => {
  return children.concat(parent).reduce(
    (prev, curr) =>
      R.merge(prev, {
        [curr.type]: prev[curr.type] ? prev[curr.type].concat(curr) : [curr]
      }),
    {}
  );
};

/**
 * Fetch all for given entity
 *
 * @param {String} entity
 * @return {Promise}
*/
function fetchAllForEntity(entity) {
  return modelMap[entity].all();
}

/**
 * Get Children for Parent
 *
 * @param {Object} parent
 * @return {Function}
*/
function getChildrenForParent(parent) {
  return function(children) {
    return children.reduce((prev, curr) => {
      return prev.concat(
        ...R.reject(
          R.prop('private'),
          curr.filter(R.pathEq(['parent', 'id'], parent.id))
        )
      );
    }, []);
  };
}

/**
 * Get All Children for an Entity
 *
 * @param {Object} parent
 * @return {Promise}
*/
function getAllChildren(parent) {
  return new Promise(resolve => {
    return Promise.all(
      config.entities[parent.type].children.map(fetchAllForEntity)
    )
      .then(getChildrenForParent(parent))
      .then(resolve);
  });
}

/**
 * Connect the children via next pointers
 *
 * @param {String} type
 * @return {Promise}
*/
function connectChildrenForParentType(type) {
  return function(children) {
    if (!config.entities[type].childrenConnected) {
      return children;
    }

    const chainedList = createChainedItemsList(children);
    const updatePromises = chainedList.map(entityToUpdate => () =>
      modelMap[entityToUpdate.type].update(R.clone(entityToUpdate))
    );

    return promiseSerial(updatePromises)
      .then(function(output) {
        return output;
      })
      .then(R.uniq)
      .then(updatedChildren => {
        return updatedChildren.filter(child =>
          R.find(R.propEq('id', child.id))(chainedList)
        );
      })
      .catch(console.error);
  };
}

/**
 * Check and Perform Recursion if necessary
 *
 * @param {Array} children
 * @return {Promise}
*/
function isRecursionNeeded(children) {
  return new Promise(resolve => {
    let promises = [];

    promises = children.map(c => {
      if (config.entities[c.oldChild.type].children.length) {
        return () => getAllChildrenAndCopy(c.oldChild, c.newChild);
      } else {
        return () => Promise.resolve(c);
      }
    });

    promiseSerial(promises).then(() => resolve(children));
  });
}

/**
 * Recursively Copy From Parent
 *
 * @param {Object} parent
 * @return {Function}
*/
function recursivelyCopy(parent) {
  return function(allChildren) {
    return copyChildren(parent)(allChildren)
      .then(isRecursionNeeded)
      .then(connectChildrenForParentType(parent.type));
  };
}

/**
 * Get All Children for Old Parent and Make New Copies
 *
 * @param {Object} oldParent
 * @param {Object} newParent
 * @return {Function}
*/
const  getAllChildrenAndCopy = (oldParent, newParent) =>  getAllChildren(oldParent).then(recursivelyCopy(newParent));

/**
 * Get Fresh Batch of all Data for UI
 *
 * @return {Promise}
*/
const freshDataForUI = () => {
  return new Promise(resolve => {
    Promise.all([
      conversation.all(),
      collection.all(),
      series.all(),
      block.all(),
      message.all()
    ]).then(data => {
      resolve({
        conversation: data[0],
        collection: data[1],
        series: data[2],
        block: data[3],
        message: data[4]
      });
    });
  });
};

function modifyParentIfNeeded(parent) {
  return function(entity) {
    if (
      R.path(['id'], parent) &&
      R.path(['id'], parent) !== R.path(['parent', 'id'], entity)
    ) {
      return Object.assign({}, entity, {parent});
    }

    return entity;
  };
}

/**
 * Copy an Entity and all it's descendants
 *
 * @param {Object} data
 * @return {Promise}
*/
exports.copyEntityAndAllChildren = data => {
  return modelMap[data.parent.type].get(data.parent.id)
    .then(modifyParentIfNeeded(R.path(['parent', 'parent'], data)))
    .then(parent => copyParent(parent))
    .then(parentList => {
      const newParent = getNewestInList(parentList);
      return getAllChildrenAndCopy(data.parent, newParent)
        .then(constructReturnCopiedValues(newParent))
        .then(freshDataForUI)
        .catch(console.error);
    })
    .catch(console.error);
};

const parentMatchesId = id => child => child.parent && child.parent.id === id;
const getAllChildrenForParent = id => children =>
  children.filter(parentMatchesId(id));

const deleteAllRemainingChildren = store => children => // eslint-disable-line
  promiseSerial(
    children.map(c => () => deleteEntity({ type: c.type, id: c.id }))
  );

const tryToParseList = list => {
  let parsedList;

  try {
    parsedList = JSON.parse(list);
  } catch (e) {
    parsedList = [];
  }

  return parsedList;
};

const mapChildrenForDeletion = (typeChildren, id) => typeChildren.map(childType => () =>
  store
    .getItem(helpers.getDBKeyForEntityType(childType))
    .then(tryToParseList)
    .then(getAllChildrenForParent(id))
    .then(deleteAllRemainingChildren(store))
    .catch(console.error)
);

const deleteEntity = item => {
  const { id, type } = item;

  const typeChildren = config.entities[type].children;

  let children = [];

  if (typeChildren.length) {
    children = mapChildrenForDeletion(typeChildren, id);
  }
  if (type === TYPE_MESSAGE || type === TYPE_COLLECTION) {
    return deleteMessageOrBlock(item, children);
  }

  return promiseSerial(children)
    .then(() => store.getItem(helpers.getDBKeyForEntityType(type)))
    .then(tryToParseList)
    .then(helpers.deleteEntityFromList(id))
    .then(
      store.setItem(
        helpers.getDBKeyForEntityType(type),
        Constants.ONE_DAY_IN_MILLISECONDS
      )
    )
    .then(helpers.maybeDeleteLinksForEntity(type, id))
    .then(freshDataForUI)
    .catch(console.error);
};

const deleteMessageOrBlock = (item, children) => {
  const { id, type } = item;

  return promiseSerial(children)
    .then(() => {
      redisClient.del(keyFormatForCollOrMessage(item));
      // remove the id from the list
      redisClient.lrem(type === TYPE_MESSAGE ? DB_MESSAGE_LIST : DB_COLLECTION_LIST, 1, id);
      return type === TYPE_MESSAGE ? getMessages() : getCollections();
    })
    .then(helpers.maybeDeleteLinksForEntity(type, id))
    .then(freshDataForUI)
    .catch(console.error);
};

exports.deleteEntity = deleteEntity;

exports.updateStart = updateStart;
