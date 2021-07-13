/*
 * Copyright (c) ZIMT AG - All Rights Reserved 2020
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Contact: tech@zimt.co
 */

const copy = data => JSON.parse(JSON.stringify(data));

const getImages = event => {
   const data = event.data || event;

   if (data && data.documents) {
      const images = data.documents.filter(document => document.type.indexOf('image') > -1);

      return images.length ? images : undefined;
   }
};

const parseEventProperties = event => {
   const parsed = {
      simple: {},
      complex: {},
   };
   const IGNORE = ['name', 'type', 'description', 'asset_type'];

   if (event) {
      const properties = event.data.properties;

      if (properties) {
         Object.keys(properties).forEach(key => {
            if (
               typeof properties[key] === 'string' ||
               typeof properties[key] === 'number' ||
               typeof properties[key] === 'boolean' ||
               !properties[key]
            ) {
               if (IGNORE.indexOf(key.toLowerCase()) === -1) parsed.simple[key] = properties[key];
            }
            else {
               parsed.complex[key] = properties[key];
            }
         });
      }
   }

   event['parsed'] = parsed;
};

const getObject = object => {
   try {
      const isAsset = !!object.events;

      if (isAsset) {
         const event = object.events.find(e => e.data.type.indexOf('info') > -1);

         return event;
      }
      return object;

   } catch (error) {
      return undefined;
   }
};

const getAssetName = asset => {
   try {
      if (asset) {
         const id = asset.id;
         const infoEvent = asset.info || (asset.events && asset.events.find(event => ['info'].indexOf(event.data.type) > -1));

         return (infoEvent && infoEvent.data && infoEvent.data.name) || id;
      }
   } catch (error) {
      console.log('getAssetName: ', error);
      return 'No name';
   }
};

const getDocumentURL = document => {
   const zimt_token = CONFIG.token;

   let link = document;

   if (!document) return link;
   if (typeof document === 'string') return document;

   if (document.url) link = document.url;
   if (document.id) link = `${CONFIG.api.core}/documents/${document.id}?zimt_token=${zimt_token}`;

   return link;
};

const cleanKey = value => {
   return value && value.replace(/\./g, '');
};

const castParam = (_value, options = { number: true }) => {
   try {
      let value = JSON.parse(decodeURIComponent(_value));

      if (typeof value === 'number' && typeof _value === 'string' && !options.number) value = String(value);
      if (['undefined', 'null', undefined, null].indexOf(value) > -1) value = undefined;

      return value;
   } catch (error) { }
   return decodeURIComponent(_value);
};

function getObjectPropertyValueOne(object, keys) {
   if (!object || !keys) return object;

   if (typeof keys === 'string') {
      const _keys = keys.split('.').filter(Boolean).map(item => castParam(item));

      return getObjectPropertyValue(object, _keys);
   }
   else if (keys.length === 1) return object[keys[0]];
   else if (keys.length > 1 && object[keys[0]]) return getObjectPropertyValue(object[keys[0]], keys.slice(1));

   return undefined;
}

function getObjectPropertyValue(object, ...keys) {
   if (!object || !keys) return object;

   let value;

   for (const key of keys) {
      value = getObjectPropertyValueOne(object, key);

      if (value !== undefined) break;
   }

   return value;
}

function setObjectValue(object, keys, value) {
   if (!object || !keys) return object;

   if (typeof keys === 'string') {
      const _keys = keys.split('.').filter(Boolean).map(item => castParam(item));

      return setObjectValue(object, _keys, value);
   }
   else if (keys.length === 1 && value !== undefined) {
      if (
         (Array.isArray(object) && typeof keys[0] === 'number') ||
         (object instanceof Object && typeof keys[0] === 'string')
      ) object[typeof keys[0] === 'string' ? cleanKey(keys[0]) : keys[0]] = value;
   }
   else if (keys.length > 1) {
      if (!object[keys[0]]) object[cleanKey(keys[0])] = typeof keys[1] === 'number' ? [] : {};

      return setObjectValue(object[keys[0]], keys.slice(1), value);
   }

   return object;
}

function removeObjectValue(object, keys) {
   if (!object || !keys) return object;

   if (typeof keys === 'string') {
      const _keys = keys.split('.').filter(Boolean).map(item => castParam(item));

      return removeObjectValue(object, _keys);
   }
   else if (keys.length === 1) {
      if (Array.isArray(object) && typeof keys[0] === 'number') object.splice(keys[0], 1);
      else if (object instanceof Object && typeof keys[0] === 'string') delete object[keys[0]];
   }
   else if (keys.length > 1) {
      if (!object[keys[0]]) return object;

      return removeObjectValue(object[keys[0]], keys.slice(1));
   }

   return object;
}
