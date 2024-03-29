/*
 * Copyright (c) ZIMT AG - All Rights Reserved 2020
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Contact: tech@zimt.co
 */

async function init() {
   // Initiate services
   zimtService = new ZIMTService();
   assetService = new AssetService();
   eventService = new EventService();

   // Get HTML element refs
   elements['input'] = document.getElementById('input');
   elements['button'] = document.getElementById('button');
   elements['error'] = document.getElementById('error');
   elements['asset'] = document.getElementById('asset');
}

// Initiate app dependencies on load
window.addEventListener('load', function () {
   init();
});

function clear() {
   elements['input'].value = '';
   values = {};
}

function loading(value = true) {
   elements['button'].disabled = value;
}

function setError(text, show = true) {
   elements.error.innerText = text;
   elements.error.style.display = show ? 'block' : 'none';
}

function setAsset(asset, events) {
   elements.asset.innerHTML = '';
   elements.asset.style.display = 'none';

   parseEventProperties(asset);

   const images = getImages(asset);

   if (images && images.length) {
      const image = document.createElement('img');
      image.src = getDocumentURL(images[0]);
      image.alt = 'Asset';
      elements.asset.appendChild(image);
   }

   const title = document.createElement('h1');

   title.innerText = asset.data.name;
   elements.asset.appendChild(title);

   const desc = getObjectPropertyValue(asset, 'data.properties.description', 'properties.description', 'description');

   if (desc) {
      const description = document.createElement('p');
      description.className = 'description';
      description.innerText = desc;
      elements.asset.appendChild(description);
   }

   if (Object.keys(asset.parsed.simple).length) {
      const properties = document.createElement('div');
      properties.className = 'properties';

      const subtitle = document.createElement('h3');
      subtitle.innerText = 'Properties';
      subtitle.style.marginTop = '35px';
      subtitle.style.marginBottom = '25px';
      properties.appendChild(subtitle);

      Object.keys(asset.parsed.simple).forEach(key => {
         const item = document.createElement('p');
         item.className = 'property';
         item.innerHTML = `<b>${key}</b>: ${asset.parsed.simple[key]}`;
         properties.appendChild(item);
      });

      elements.asset.appendChild(properties);
   }

   if (events && events.response.length) {
      const timeline = document.createElement('div');
      timeline.className = 'timeline';

      const subtitle = document.createElement('h2');
      subtitle.innerText = 'Events';
      subtitle.style.marginBottom = '34px';
      subtitle.style.fontWeight = 500;
      timeline.appendChild(subtitle);

      const _events = document.createElement('div');
      _events.className = 'events';
      timeline.appendChild(_events);

      events.response.forEach(_event => {
         const data = getObjectPropertyValue(_event, 'object.data', 'data');

         const event = document.createElement('div');
         event.className = 'event';

         const eventType = document.createElement('p');
         eventType.className = 'type';
         eventType.innerText = data.type;
         event.appendChild(eventType);

         const eventTitle = document.createElement('p');
         eventTitle.className = 'title';
         eventTitle.innerText = data.name;
         event.appendChild(eventTitle);

         _events.appendChild(event);
      });

      elements.asset.appendChild(timeline);
   }

   elements.asset.style.display = 'flex';
}

async function onSubmit(event) {
   try {
      event.preventDefault();
      const id = values.asset_id;

      if (id && id.trim()) {
         loading();
         setError('', false);

         // Get the asset with info event attached
         const asset = await assetService.get(id);
         console.log('Asset: ', asset);

         // Get events
         const events = await eventService.search(asset.id, {});
         console.log('Events: ', events);

         clear();
         loading(false);
         setAsset(asset, events);
      }

   } catch (error) {
      loading(false);
      console.error('Search: ', error);
      setError(error.data.meta.message);
   }
}

function onChange(event) {
   event.preventDefault();
   const { value, name } = event.target;

   values[name] = value;
}