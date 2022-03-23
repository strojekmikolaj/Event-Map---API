const firebaseConfig = {
  apiKey: "AIzaSyDW6nswpztTczAmil90Wo1bu_UL3xm0thg",
  authDomain: "eventsmanagment-e2a29.firebaseapp.com",
  projectId: "eventsmanagment-e2a29",
  storageBucket: "eventsmanagment-e2a29.appspot.com",
  messagingSenderId: "745614319174",
  appId: "1:745614319174:web:c95852f0e67da6091cb447"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
db.settings({ timestampsInSnapshots: true }); 

mapboxgl.accessToken = 'pk.eyJ1IjoibHhyZCIsImEiOiJja292cjg1ZmcwYjczMm5yNHM3dGFibTcwIn0.Os_AYR9ZaeE2S4cZNv7JAw';
const infoForm = document.querySelector('#info_form');
const infoData = document.querySelector('#info_data');
const mapWrapper = document.querySelector('.map-wrapper');
const pageEntry = document.querySelector('#accept');

class MarkerData {
  constructor(id, name, time, info, lng, lat) {
    this.id = id;
    this.name = name;
    this.time = time;
    this.info = info;
    this.lng = lng;
    this.lat = lat;
  }
}

pageEntry.addEventListener('click', () => {
  document.querySelector('.page-info').style.display = 'none';
  document.querySelector('.info').style.display = 'block';
})

let markersArray = [];

// Obsługa markera na stronie

function createMarker(newMarker) {

  const el = document.createElement('img');
  el.src = 'pin.png';
  el.classList.add('pin');

  el.dataset.id = newMarker.id;

  const li = document.createElement('li');
  const h4 = document.createElement('h4');
  const time = document.createElement('time');
  const p = document.createElement('p');
  const deleteInfo = document.createElement('button');
  h4.innerHTML = newMarker.name;
  time.innerHTML = newMarker.time;
  p.innerHTML = newMarker.info;
  deleteInfo.innerHTML = 'Delete';
  infoData.appendChild(li);
  li.appendChild(h4);
  li.appendChild(time);
  li.appendChild(p);
  li.appendChild(deleteInfo);
  deleteInfo.dataset.id = newMarker.id;
  deleteInfo.addEventListener('click', deleteMarker)

  el.addEventListener('click', (e) => {

    console.log(el.dataset)

    const currentMarker = markersArray.find(el => el.id === e.target.dataset.id);
    map.flyTo({ center: [currentMarker.lng, currentMarker.lat], zoom: 15 });

  });
  
  const moveMarker = (marker) => {
    let counter = 0;
    let upInterval;
    let downInterval;
    upInterval = setInterval(() => {
      counter = counter  - 0.5;
      marker.setOffset([0,counter]);
      if(counter === -5){
        clearInterval(upInterval);

        downInterval = setInterval(() => {
          counter = counter + 0.5;
          marker.setOffset([0,counter]);
          if(counter === 0){
            clearInterval(downInterval);
          }
        }, 10)
      }
     
    }, 10);
  }

  const mapMarker = new mapboxgl.Marker(el)
    .setLngLat([newMarker.lng, newMarker.lat])
    .addTo(map);

    markersArray = markersArray.map(el => {
      if(el.id ===newMarker.id){
        return {...el, marker: mapMarker}
      }
      return el;
    })

    let moveMarkerInterval;

    li.addEventListener('mouseenter', () => {
        const marker = markersArray.find(el => el.id === newMarker.id).marker;
        moveMarker(marker)
        moveMarkerInterval = setInterval(() => moveMarker(marker), 500);       
    })

    li.addEventListener('mouseleave', () => {
      clearInterval(moveMarkerInterval);
    })

    li.addEventListener('click', () => {
      const marker = markersArray.find(el => el.id === newMarker.id).marker;
      console.log();
      map.flyTo({ center: [marker.getLngLat().lng, marker.getLngLat().lat], zoom: 10 });
    })
}

const deleteMarker = (e) => {
  e.stopPropagation();
  if(confirm('Czy na pewno chcesz usunąć ten event?')){
    db.collection('events').doc(e.target.dataset.id).delete().then(response => {
      const placeIndex = markersArray.findIndex(el => el.id === e.target.dataset.id);
      markersArray[placeIndex].marker.remove();
      e.target.closest('li').remove();
    })
  }
};

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [19.94, 50.03],
  zoom: 1,
});

map.getCanvas().style.cursor = 'default';
map.doubleClickZoom.disable();

//Dodawanie markera do bazy danych

map.on('dblclick', (e) => {
  const submit = document.querySelector('[data-active]');
  if (submit.dataset.active !== 'true') {
    return;
  }

  document.body.classList.remove('pointer-select');
  submit.dataset.active = false;


  if (confirm('Czy na pewno chcesz dodać ten znacznik?')) {
    const marker = new MarkerData(-1, document.querySelector('#place_name').value, document.querySelector('#place_time').value, document.querySelector('#additional_info').value, e.lngLat.lng, e.lngLat.lat);
  
    delete marker['id'];

    db.collection('events').add({ ...marker })
      .then((docRef) => {
        marker.id = docRef.id;
        markersArray.push(marker)
        createMarker(marker);

        const inputs = document.querySelectorAll('input, select');
        inputs.forEach((el) => {
          el = false;
          el.value = '';
        });    
      })   
  }
  map.getCanvas().style.cursor = 'default';
});

//Ładowanie elementów listy z bazy danych przy załadowaniu strony

document.addEventListener('DOMContentLoaded', () => {

  db.collection('events').get().then(response => {
    markersArray = response.docs.map(el => ({id: el.id, ...el.data()}));
     
    for (const el of markersArray) {
      createMarker(new MarkerData(el.id, el.name, el.time, el.info, el.lng, el.lat));
    }
  })

});

// Walidacja zawartości formularza oraz ukrycie go z widoku przed dodaniem markera na mapę

infoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputs = document.querySelectorAll('input, select');
  for (const el of inputs) {
    if (!el.value && el.id != 'additional_info') {
      return alert('Wprowadz odpowiednie dane!');
    }
  }
  e.target.dataset.active = true;
  for (const el of inputs) {
    el.disabled = true;
  }

  document.querySelector('#info_form').classList.remove('open');
  document.body.classList.remove('modal-open');
  document.body.classList.add('pointer-select');
  map.getCanvas().style.cursor = 'pointer';
});

const toggleVisbleForm = (e) => {
  e.preventDefault();
  document.body.classList.toggle('modal-open');
  document.querySelector('#info_form').classList.toggle('open');
};

document.querySelector('#show_form').addEventListener('click', toggleVisbleForm);
document.querySelector('#cancel_form').addEventListener('click', toggleVisbleForm);
