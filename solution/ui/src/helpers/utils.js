import _ from 'lodash';
import numeral from 'numeral';
import { observable } from 'mobx';

/**
 * Converts the given Map object to an array of values from the map
 */
function mapToArray(map) {
  const result = [];
  // converting map to result array
  map.forEach(value => result.push(value));
  return result;
}

function parseError(err) {
  const message = _.get(err, 'message', 'Something went wrong');
  const code = _.get(err, 'code');
  const status = _.get(err, 'status');
  const requestId = _.get(err, 'requestId');
  const error = new Error(message);

  error.code = code;
  error.requestId = requestId;
  error.root = err;
  error.status = status;

  return error;
}

function swallowError(promise, fn = () => ({})) {
  try {
    return Promise.resolve()
      .then(() => promise)
      .catch(err => fn(err));
  } catch (err) {
    return fn(err);
  }
}

const storage = observable({
  getItem(key) {
    try {
      if (localStorage) return localStorage.getItem(key);
      return window.localStorage.getItem(key);
    } catch (err) {
      console.log(err);
      try {
        if (sessionStorage) return sessionStorage.getItem(key);
        return window.sessionStorage.getItem(key);
      } catch (error) {
        // if we get here, it means no support for localStorage nor sessionStorage, which is a problem
        return console.log(error);
      }
    }
  },

  setItem(key, value) {
    try {
      if (localStorage) return localStorage.setItem(key, value);
      return window.localStorage.setItem(key, value);
    } catch (err) {
      console.log(err);
      try {
        if (sessionStorage) return sessionStorage.setItem(key, value);
        return window.sessionStorage.setItem(key, value);
      } catch (error) {
        // if we get here, it means no support for localStorage nor sessionStorage, which is a problem
        return console.log(error);
      }
    }
  },

  removeItem(key) {
    try {
      if (localStorage) return localStorage.removeItem(key);
      return window.localStorage.removeItem(key);
    } catch (err) {
      console.log(err);
      try {
        if (sessionStorage) return sessionStorage.removeItem(key);
        return window.sessionStorage.removeItem(key);
      } catch (error) {
        // if we get here, it means no support for localStorage nor sessionStorage, which is a problem
        return console.log(error);
      }
    }
  },
});

// a promise friendly delay function
function delay(seconds) {
  return new Promise(resolve => {
    _.delay(resolve, seconds * 1000);
  });
}

function niceNumber(value) {
  if (_.isNil(value)) return 'N/A';
  if (_.isString(value) && _.isEmpty(value)) return 'N/A';
  return numeral(value).format('0,0');
}

function nicePrice(value) {
  if (_.isNil(value)) return 'N/A';
  if (_.isString(value) && _.isEmpty(value)) return 'N/A';
  return numeral(value).format('0,0.00');
}

function getQueryParam(location, key) {
  const queryParams = new URL(location).searchParams;
  return queryParams.get(key);
}

function addQueryParams(location, params) {
  const url = new URL(location);
  const queryParams = url.searchParams;

  const keys = _.keys(params);
  keys.forEach(key => {
    queryParams.append(key, params[key]);
  });

  let newUrl = url.origin + url.pathname;

  if (queryParams.toString()) {
    newUrl += `?${queryParams.toString()}`;
  }

  newUrl += url.hash;
  return newUrl;
}

function removeQueryParams(location, keys) {
  const url = new URL(location);
  const queryParams = url.searchParams;

  keys.forEach(key => {
    queryParams.delete(key);
  });

  let newUrl = url.origin + url.pathname;

  if (queryParams.toString()) {
    newUrl += `?${queryParams.toString()}`;
  }

  newUrl += url.hash;
  return newUrl;
}

function getFragmentParam(location, key) {
  const fragmentParams = new URL(location).hash;
  const hashKeyValues = {};
  const params = fragmentParams.substring(1).split('&');
  if (params) {
    params.forEach(param => {
      const keyValueArr = param.split('=');
      const currentKey = keyValueArr[0];
      const value = keyValueArr[1];
      if (value) {
        hashKeyValues[currentKey] = value;
      }
    });
  }
  return hashKeyValues[key];
}

function removeFragmentParams(location, keyNamesToRemove) {
  const url = new URL(location);
  const fragmentParams = url.hash;
  let hashStr = '#';
  const params = fragmentParams.substring(1).split('&');
  if (params) {
    params.forEach(param => {
      const keyValueArr = param.split('=');
      const currentKey = keyValueArr[0];
      const value = keyValueArr[1];
      // Do not include the currentKey if it is the one specified in the array of keyNamesToRemove
      if (value && _.indexOf(keyNamesToRemove, currentKey) < 0) {
        hashStr = `${currentKey}${currentKey}=${value}`;
      }
    });
  }
  return `${url.protocol}//${url.host}${url.search}${hashStr === '#' ? '' : hashStr}`;
}

function isAbsoluteUrl(url) {
  return /^https?:/.test(url);
}

function removeNulls(obj = {}) {
  Object.keys(obj).forEach(key => {
    if (obj[key] === null) delete obj[key];
  });

  return obj;
}

// remove the "end" string from "str" if it exists
function chopRight(str = '', end = '') {
  if (!_.endsWith(str, end)) return str;
  return str.substring(0, str.length - end.length);
}

const isFloat = n => {
  return n % 1 !== 0;
};

// input [ { <name>: { label, desc, ..} }, { <name2>: { label, desc } } ]
// output { <name>: { label, desc, ..}, <name2>: { label, desc } }
function childrenArrayToMap(arr) {
  const result = {};
  arr.forEach(item => {
    const key = _.keys(item)[0];
    result[key] = item[key];
  });
  return result;
}

let idGeneratorCount = 0;

function generateId(prefix = '') {
  idGeneratorCount += 1;
  return `${prefix}_${idGeneratorCount}_${Date.now()}_${_.random(0, 1000)}`;
}

// Given a Map and an array of items (each item MUST have an "id" prop), consolidate
// the array in the following manner:
// - if an existing item in the map is no longer in the array of items, remove the item from the map
// - if an item in the array is not in the map, then add it to the map using the its "id" prop
// - if an item in the array is also in the map, then call 'mergeExistingFn' with the existing item
//   and the new item. It is expected that this 'mergeExistingFn', will know how to merge the
//   properties of the new item into the existing item.
function consolidateToMap(map, itemsArray, mergeExistingFn) {
  const unprocessedKeys = {};

  map.forEach((_value, key) => {
    unprocessedKeys[key] = true;
  });

  itemsArray.forEach(item => {
    const id = item.id;
    const hasExisting = map.has(id);
    const exiting = map.get(id);

    if (!exiting) {
      map.set(item.id, item);
    } else {
      mergeExistingFn(exiting, item);
    }

    if (hasExisting) {
      delete unprocessedKeys[id];
    }
  });

  _.forEach(unprocessedKeys, (_value, key) => {
    map.delete(key);
  });
}

/**
 * Converts an object graph into flat object with key/value pairs.
 * The rules of object graph to flat key value transformation are as follows.
 * 1. An already flat attribute with primitive will not be transformed.
 *    For example,
 *      input = { someKey: 'someValue' } => output = { someKey: 'someValue' }
 * 2. A nested object attribute will be flattened by adding full attribute path '<attributeName>.' (the paths are as per lodash's get and set functions)
 *    For example,
 *      input = { someKey: { someNestedKey: 'someValue' } } => output = { 'someKey.someNestedKey': 'someValue' }
 * 3. An array attribute will be flattened by adding correct path '<attributeName>[<elementIndex>]' prefix. (the paths are as per lodash's get and set functions)
 *    For example,
 *      input = { someKey: [ 'someValue1', 'someValue2' ] } => output = { 'someKey[0]': 'someValue1', 'someKey[1]': 'someValue2' }
 *      input = { someKey: [ 'someValue1', ['someValue2','someValue3'], 'someValue4' ] } => output = { 'someKey[0]': 'someValue1', 'someKey[1][0]': 'someValue2', 'someKey[1][1]': 'someValue3', 'someKey[2]': 'someValue4' }
 *      input = { someKey: [{ someNestedKey: 'someValue' }] } => output = { 'someKey[0].someNestedKey': 'someValue' }
 *
 * @param obj An object to flatten
 * @param filterFn An optional filter function that allows filtering out certain attributes from being included in the flattened result object. The filterFn is called with 3 arguments (result, value, key) and is expected to return true to include
 *   the key in the result or false to exclude the key from the result.
 * @param keyPrefix A optional key prefix to include in all keys in the resultant flattened object.
 * @param accum An optional accumulator to use when performing the transformation
 * @returns {*}
 */
function flattenObject(obj, filterFn = () => true, keyPrefix = '', accum = {}) {
  function toFlattenedKey(key, idx) {
    let flattenedKey;
    if (_.isNil(idx)) {
      if (_.isNumber(key)) {
        flattenedKey = keyPrefix ? `${keyPrefix}[${key}]` : `[${key}]`;
      } else {
        flattenedKey = keyPrefix ? `${keyPrefix}.${key}` : key;
      }
    } else {
      flattenedKey = keyPrefix ? `${keyPrefix}.${key}[${idx}]` : `${key}[${idx}]`;
    }
    return flattenedKey;
  }

  return _.transform(
    obj,
    (result, value, key) => {
      if (filterFn(result, value, key)) {
        if (_.isArray(value)) {
          let idx = 0;
          _.forEach(value, element => {
            const flattenedKey = toFlattenedKey(key, idx);
            if (_.isObject(element)) {
              flattenObject(element, filterFn, flattenedKey, result);
            } else {
              result[flattenedKey] = element;
            }
            ++idx;
          });
        } else {
          const flattenedKey = toFlattenedKey(key);
          if (_.isObject(value)) {
            flattenObject(value, filterFn, flattenedKey, result);
          } else {
            result[flattenedKey] = value;
          }
        }
      }
      return result;
    },
    accum,
  );
}

/**
 * Converts an object with key/value pairs into object graph. This function is inverse of flattenObject.
 * i.e., unFlattenObject(flattenObject(obj)) = obj
 *
 * The rules of key/value pairs to object graph transformation are as follows.
 * 1. Key that does not contain delimiter will not be transformed.
 *    For example,
 *      input = { someKey: 'someValue' } => output = { someKey: 'someValue' }
 * 2. Key/Value containing delimiter will be transformed into object path
 *    For example,
 *      input = { someKey_someNestedKey: 'someValue' } => output = { someKey: { someNestedKey: 'someValue' } }
 * 3. Key/Value containing delimiter and integer index will be transformed into object containing array.
 *    For example,
 *      input = { someKey_0: 'someValue1', someKey_1: 'someValue2' } => output = { someKey: [ 'someValue1', 'someValue2' ] }
 *      input = { "someKey_0": "someValue1", "someKey_1_0": "someValue2", "someKey_1_1": "someValue3", "someKey_2": "someValue4" } => output = { someKey: [ 'someValue1', ['someValue2','someValue3'], 'someValue4' ] }
 *      input = { someKey_0_someNestedKey: 'someValue' } => output = { someKey: [{ someNestedKey: 'someValue' }] }
 *
 * @param obj An object to flatten
 * @param filterFn An optional filter function that allows filtering out certain attributes from being included in the flattened result object. The filterFn is called with 3 arguments (result, value, key) and is expected to return true to include
 *   the key in the result or false to exclude the key from the result.
 * @param keyPrefix A optional key prefix to include in all keys in the resultant flattened object.
 * @returns {*}
 */
function unFlattenObject(keyValuePairs, filterFn = () => true) {
  return _.transform(
    keyValuePairs,
    (result, value, key) => {
      if (filterFn(result, value, key)) {
        _.set(result, key, value);
      }
      return result;
    },
    {},
  );
}

function isAmountFormatCorrect(no) {
  const noStr = `${no}`;
  return /^\d{0,7}([.]{0,1}\d{0,2})$/.test(noStr);
}

function formatAmount(amount) {
  return amount
    .toFixed(2)
    .toString()
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

export {
  mapToArray,
  parseError,
  swallowError,
  storage,
  delay,
  niceNumber,
  getQueryParam,
  removeQueryParams,
  addQueryParams,
  getFragmentParam,
  removeFragmentParams,
  nicePrice,
  isFloat,
  removeNulls,
  chopRight,
  childrenArrayToMap,
  isAbsoluteUrl,
  generateId,
  consolidateToMap,
  flattenObject,
  unFlattenObject,
  isAmountFormatCorrect,
  formatAmount,
};
