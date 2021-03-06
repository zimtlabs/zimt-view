/*
 * Copyright (c) ZIMT AG - All Rights Reserved 2020
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Contact: tech@zimt.co
 */

class ZIMTService {
   sdk;
   utils;

   constructor() {
      this.init();
   }

   init() {
      const apiKey = CONFIG.api_key;

      this.sdk = new ZIMTHubSDK({
         api_key: apiKey,
         api: {
            core: CONFIG.api.core,
         },
      });
      console.log('SDK instance: ', this.sdk);

      this.utils = ZIMTHubSDK.utils;
   }

   async ready() {
      const token = await this.sdk.ready();
      CONFIG.token = token;
   }
}

class AssetService {
   cache = {};

   clear() {
      this.cache = {};
   }

   async create(data) {
      await zimtService.ready();

      const asset = await zimtService.sdk.assets.create(data || zimtService.sdk.assets.generateAsset());

      return asset.response;
   }

   async get(id, options = { info: true }) {
      await zimtService.ready();

      const asset = await zimtService.sdk.assets.get(id, options);

      return asset.response;
   }

   async getMany(pagination, options = { info: true, parse: true }) {
      await zimtService.ready();

      const assets = await zimtService.sdk.assets.getMany(pagination, options);

      return assets;
   }

   async search(query, options = { info: true, parse: true }) {
      await zimtService.ready();

      const assets = await zimtService.sdk.assets.search(query, options);

      return assets;
   }

}

class EventService {
   cache = {};

   clear() {
      this.cache = {};
   }

   async create(asset_id, data) {
      await zimtService.ready();

      const event = await zimtService.sdk.events.createEvent(asset_id, data);

      return event.response;
   }

   async get(asset_id, event_id, options = { queryParams: { proof: true } }) {
      await zimtService.ready();

      const event = await zimtService.sdk.events.getEvent(asset_id, event_id, options);

      return event.response;
   }

   async getMany(asset_id, pagination) {
      await zimtService.ready();

      const events = await zimtService.sdk.events.getEvents(asset_id, pagination);

      return events;
   }

   async search(asset_id, query) {
      await zimtService.ready();

      const events = await zimtService.sdk.events.searchEvents(asset_id, query);

      return events;
   }

}