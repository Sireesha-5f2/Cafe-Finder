var darkMode = false; // tracks dark mode state

// Dark map style array
var darkMapStyle = [
  { elementType: 'geometry', stylers: [{color: '#242f3e'}] },
  { elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}] },
  { elementType: 'labels.text.fill', stylers: [{color: '#746855'}] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{color: '#d59563'}]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{color: '#d59563'}]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{color: '#263c3f'}]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{color: '#38414e'}]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{color: '#212a37'}]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{color: '#9ca5b3'}]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{color: '#17263c'}]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{color: '#515c6d'}]
  }
];

function toggleDarkMode() {
    darkMode = !darkMode;
    map.setOptions({ styles: darkMode ? darkMapStyle : [] });
}
var map;
var markers = [];
var cafeList = document.getElementById("cafe-list");

// initialize map
function initMap(){

map = new google.maps.Map(document.getElementById("map"),{

center:{lat:20,lng:78},
zoom:5

});

}


// distance function
function distance(lat1,lon1,lat2,lon2){

var R = 6371;

var dLat=(lat2-lat1)*Math.PI/180;
var dLon=(lon2-lon1)*Math.PI/180;

var a=
Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*Math.sin(dLon/2);

var c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

return (R*c).toFixed(2);

}


// search place
function searchPlace() {
    var place = document.getElementById("searchBox").value;
    if (!place) {
        alert("Enter a city or place");
        return;
    }

    // First, get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                // Now fetch the city coordinates
                var url = "https://nominatim.openstreetmap.org/search?format=json&q=" +
                    encodeURIComponent(place);

                fetch(url)
                    .then(res => res.json())
                    .then(data => {
                        if (data.length == 0) {
                            alert("Place not found");
                            return;
                        }

                        var cityLat = parseFloat(data[0].lat);
                        var cityLon = parseFloat(data[0].lon);

                        map.setCenter({ lat: cityLat, lng: cityLon });
                        map.setZoom(13);

                        // Pass user's location to loadCafes
                        loadCafes(cityLat, cityLon, userLat, userLon);
                        loadCafeRatings(cityLat, cityLon); // Ratings stay same
                    });
            },
            function (error) {
                console.warn("Geolocation failed, using city center only.");
                // fallback to city center only
                var url = "https://nominatim.openstreetmap.org/search?format=json&q=" +
                    encodeURIComponent(place);
                fetch(url)
                    .then(res => res.json())
                    .then(data => {
                        if (data.length == 0) {
                            alert("Place not found");
                            return;
                        }

                        var cityLat = parseFloat(data[0].lat);
                        var cityLon = parseFloat(data[0].lon);

                        map.setCenter({ lat: cityLat, lng: cityLon });
                        map.setZoom(13);

                        loadCafes(cityLat, cityLon); // without user location
                        loadCafeRatings(cityLat, cityLon);
                    });
            }
        );
    } else {
        alert("Geolocation not supported by this browser.");
    }
}
// load cafes
// load cafes
function loadCafes(cityLat, cityLon, userLat = null, userLon = null) {
    cafeList.innerHTML = "";
    markers.forEach(m => m.setMap(null));
    markers = [];

    var radius = 15000;

    var query = `
    [out:json][timeout:25];
    (
        node["amenity"="cafe"](around:${radius},${cityLat},${cityLon});
        node["shop"="coffee"](around:${radius},${cityLat},${cityLon});
        node["shop"="bakery"](around:${radius},${cityLat},${cityLon});
    );
    out;
    `;

    var url = "https://overpass-api.de/api/interpreter?data=" +
        encodeURIComponent(query);

    fetch(url)
        .then(res => res.json())
        .then(data => {
            data.elements.forEach(place => {
                var name = place.tags?.name || "Cafe";
               var address = "";
                if (place.tags) {
                    if (place.tags.addr_street) address += place.tags.addr_street;
                    if (place.tags.addr_city) address += (address ? ", " : "") + place.tags.addr_city;
                }
                if (!address) address = "Address not available";
                // Use user location if available, otherwise city center
                const dist = (userLat != null && userLon != null)
                    ? distance(userLat, userLon, place.lat, place.lon)
                    : distance(cityLat, cityLon, place.lat, place.lon);
                // Marker
                var marker = new google.maps.Marker({
                    position: { lat: place.lat, lng: place.lon },
                    map: map,
                    title: name,
                    icon: {
                        url: "https://maps.google.com/mapfiles/kml/shapes/coffee.png",
                        scaledSize: new google.maps.Size(32, 32)
                    }
                });

                var infoWindow = new google.maps.InfoWindow({
                    content: `<b>${name}</b><br>${address}<br>
                              <a target='_blank' href='https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}'>Route</a>`
                });

                marker.addListener("click", function () {
                    infoWindow.open(map, marker);
                });

                markers.push(marker);

                // Sidebar
                var li = document.createElement("li");
                li.innerHTML = `<b onclick='alert("${address || "Address not available"}")' 
                                style='cursor:pointer; color:blue;'>${name}</b><br>
                                Address: ${address || "Not available"}<br>
                                Distance: ${dist} km`;
                li.onclick = function () {
                    map.setCenter({ lat: place.lat, lng: place.lon });
                    map.setZoom(17);
                    infoWindow.open(map, marker);
                };
                cafeList.appendChild(li);
            });
        })
        .catch(err => {
            console.log(err);
            alert("Server busy, try again");
        });
}