/*
 * Copyright (c) ZIMT AG - All Rights Reserved 2020
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Contact: tech@zimt.co
 */

const CONFIG = {
   api: {
      // https://hub.test.zi.mt or https://hub.zi.mt
      core: 'https://hub.test.zi.mt',
   },
   // ENTER YOUR OWN ORGANIZATION API KEY HERE
   api_key: '',
   token: '',
};

// Global vars
let sdk;
let values = {};
const elements = {};
let zimtService;
let assetService;
let eventService;
