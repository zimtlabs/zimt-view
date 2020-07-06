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

const getProperty = (object, prop = '') => {
   try {
      let value = object[prop];
      const data = object.data || object;
      value = value || data[prop];

      if (!value) {
         if (data.properties) {
            const key = Object.keys(data.properties).find(k => k.toLowerCase() === prop.toLowerCase());
            value = data.properties[key];
         }
      }

      return value;
   } catch (error) {
      console.log(error);
      return '';
   }
};

const getExplorer = name => {
   const n = name && name.toLowerCase();

   switch (n) {
      case 'ambrosus':
         return 'https://explorer.ambrosus.com/transactions';

      case 'kovan':
         return 'https://kovan.etherscan.io/tx';

      default:
         return '';
   }
};

const getChainDetails = bundle => {
   const d = {
      name: 'Kovan',
      environment: 'test',
   };

   try {
      const strategy = bundle && bundle.strategy;
      const info = strategy && strategy.data && bundle.strategy.data.info;

      if (info) {
         if (info.name) d.name = info.name;
         if (info.environment) d.environment = info.environment;
      }
      else {
         // Extract info from bundle upload url
         const url = ((bundle.data && bundle.data.upload && bundle.data.upload.url) || '').toLowerCase();

         // Ambrosus chain
         if (url && url.indexOf('ambrosus') > -1) {
            d.name = 'Ambrosus';
            d.environment = url.indexOf('test') > -1 ? 'test' : 'prod';
         }
      }

   } catch (error) {
      console.log(error);
   }

   return d;
};

const getTransaction = async bundle => {
   const url = bundle.data && bundle.data.upload && bundle.data.upload.url;
   const tx_hash = bundle.data && bundle.data.upload && bundle.data.upload.tx_hash;

   const provider = url && zimtService.utils.JsonRpcProvider(url);
   let t = '';

   if (provider && tx_hash) {
      try {
         t = await provider.getTransaction(tx_hash);
         console.log(`Bundle ${bundle.id} transaction: `, t);
      } catch (error) {
         console.log(error);
      }
   }

   return t;
};

const verifyObject = async (object, type, recheck = false) => {
   try {
      const verificationResult = {};
      const hasDataHash = ['event', 'document'].indexOf(type) > -1;

      // DATA HASH
      if (hasDataHash) {
         const _dataHash = zimtService.utils.hash(object.data);

         verificationResult['data_hash'] = {
            value: _dataHash === object.meta.data_hash,
            result: _dataHash,
         };
      }

      // SIGNATURE
      const _signature = zimtService.utils.validateSignature(object.meta.created_by, object.signature, object.meta);

      verificationResult['signature'] = {
         value: !!_signature,
         result: _signature,
      };

      // RECEIPT
      // Check object hash
      const _objectHash = zimtService.utils.hash({
         meta: object.meta,
         ...(hasDataHash ? { data: object.data } : {}),
         signature: object.signature,
      });
      const objectHashResult = _objectHash === object.receipt.object_hash;
      // Check id
      const _id = zimtService.utils.hash(object.receipt);
      const idResult = _id === object.id;
      // Check proof (signature)
      const proofResult = zimtService.utils.validateSignature(object.receipt.received_by, object.proof, object.id);
      const result = !!(objectHashResult && idResult && proofResult);

      verificationResult['receipt'] = {
         result,
         value: result,
      };

      // RECEIPT NOTARIZATION
      if (object.bundles && object.bundles.length) {
         const results = [];

         for (let [index, bundle] of object.bundles.entries()) {
            if (recheck) {
               if (!(bundle.data && bundle.data.upload && bundle.data.upload.url)) {
                  object.bundles[index] = await BundleService.get(bundle.id);
                  bundle = object.bundles[index];
                  console.log('Recheck bundle: ', bundle)
               }
            }

            const t = await getTransaction(bundle);

            const inTransaction = !!(t && t.data && (t.data === bundle.proof));
            const inBundle = bundle.object && bundle.object.entries.indexOf(object.proof) > -1;

            results.push({
               bundle,
               inBundle,
               inTransaction,
               transaction: t,
               result: !!(inBundle && inTransaction),
            });
         }

         verificationResult['receipt_notarization'] = {
            value: !!results.some(result => !!result.result),
            result: results,
         };
      } else {
         verificationResult['receipt_notarization'] = {
            value: false,
            result: [],
         };
      }

      // Set status: valid, validating, invalid
      let status = 'invalid';
      let statusResult = true;

      if (hasDataHash) {
         // Data hash status
         statusResult = statusResult && verificationResult['data_hash'].value;
      }
      // Signature and receipt statuses
      statusResult = statusResult && verificationResult['signature'].value && verificationResult['receipt'].value;

      if (statusResult) status = verificationResult['receipt_notarization'].value ? 'valid' : 'validating';

      // Attach results to the object
      verificationResult.status = status;
      console.log('Verification: ', JSON.stringify(verificationResult, null, 3));

      verificationResult.hasDataHash = hasDataHash;
      verificationResult.object = copy(object);

      object.verification = verificationResult;

      return object;
   } catch (error) {
      console.log(error);
      return object;
   }
};
