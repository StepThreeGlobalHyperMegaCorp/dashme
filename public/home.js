
//------------------------------------------------------------------------------
// AJAX Helpers
//------------------------------------------------------------------------------
var ajaxHelper = function(jqxhr, opt_cb, opt_fail_cb) {
  jqxhr.done(function (res) {
    if (opt_cb) { opt_cb(res); }
  }).fail(function (jqxhr, txtStatus, err) {
    console.log("Req failed: ", txtStatus, err, this.url);
    if (jqxhr.status == 401) {
      alert("Auth failed.");
    }
    if (opt_fail_cb) { opt_fail_cb(jqxhr, txtStatus, err); }
  });
};

var getJson = function(url, opt_data, opt_cb, opt_fail_cb) {
  ajaxHelper($.getJSON(url, opt_data || {}), opt_cb, opt_fail_cb);
};

//------------------------------------------------------------------------------
// Core logic.
//------------------------------------------------------------------------------
var getUsername = function () {
  var username = $('#username').val();
  if (!username || username.length == 0) {
    alert("fill in your username, please");
    throw 1;
  }
  return username;
};

var setWorkLocation = function (click_event) {
  var $sb = $('#set-location-btn');
  $sb.button('loading');
  console.log("Requesting location...");
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      console.log(pos);
      getJson("/setPlace/work",
              { lat: pos.coords.latitude,
                lon: pos.coords.longitude },
              function() {
                $sb.button('reset');
              },
              function() {
                alert("Failed.");
                $sb.button('reset');
              });
    });
};

var postCurrentLocation = function (click_event) {
  var $b = $('#post-cur-location-btn');
  $b.button('loading');
  console.log("Requesting location...");
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      console.log(pos);
      getJson("/gps",
              { lat: pos.coords.latitude,
                lon: pos.coords.longitude },
              function() {
                $b.button('reset');
              },
              function() {
                alert("Failed.");
                $b.button('reset');
              });
    });
};

var renderMap = function() {
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;

      var $map = $('#map-container');
      var mapOptions = {
        center: { lat: lat, lng: lon },
        zoom: 13
      };
      var map = new google.maps.Map($map.get(0), mapOptions);

      getJson('/getAllLocations',
              function (locations) {
                console.log(locations);
                $.each(locations, function (idx, o) {
                  console.log(o);
                  var marker = new google.maps.Marker({
                    map: map,
                    title: o.key,
                    position: { lat: o.value.lat * 1.0, lng: o.value.lon * 1.0 },
                    visible: true
                  });
                  console.log(marker.getPosition().toString());
                });
              });
    });
};

//------------------------------------------------------------------------------
// On document ready.
//------------------------------------------------------------------------------
$( document ).ready(function () {
  $('#set-location-btn').click(setWorkLocation);
  $('#post-cur-location-btn').click(postCurrentLocation);

  renderMap();

  // Get context with jQuery - using jQuery's .get() method.
  var ctx = $("#myChart").get(0).getContext("2d");
  // This will get the first returned node in the jQuery collection.
  var myNewChart = new Chart(ctx);

  getJson("/getLocationData/work", {}, 
          function(events){
            // last7 = weights.slice(-7); // TODO we are getting last 7 events w/ no respect for date
            
            // For Each element in array add the minutes from SeenFirst to SeenLast to its start date
            var dateHash = {};
            for (var i = 0, l = events.length; i < l; i += 1) {
              var key = new Date(events[i].seenFirst).toDateString();
              if (!dateHash[key]) {dateHash[key] = 0;}
              
              dateHash[key] += new Date(events[i].seenLast) - new Date(events[i].seenFirst); // Store milliseconds checked in
            }
            
            // Get Dates for last 7 days
            var currentTime = new Date().getTime();
            
            var day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var labels = [];
            var data = [];
            
            // last 7 days
            for (var i = 0; i < 7; i += 1) {
              // Get date for i days ago
              var keyDate = new Date(currentTime - (6-i) * 24 * 60 * 60 * 1000); // Days in milliseconds
              
              labels[i] = day[keyDate.getDay()]; 
              if (dateHash[keyDate.toDateString()]) {
                data[i] = dateHash[keyDate.toDateString()] / (60 * 60 * 1000); // convert to hours
              } else {
                data[i] = 0;
              }
            }
            
            // Convert dates to Days
            var steps = Math.ceil(Math.max.apply(Math, data));
            
            var chartData = {
              //labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              labels: labels,
              datasets: [
              {
                label: "Week 1",
                fillColor: "rgba(151,187,205,0.5)",
                strokeColor: "rgba(151,187,205,0.8)",
                highlightFill: "rgba(151,187,205,0.75)",
                highlightStroke: "rgba(151,187,205,1)",
                //data: $.map(last7, function(val){return val.value || 0;})
                data: data
              }
              ]
            };

            var myBarChart = new Chart(ctx).Bar(chartData, {scaleOverride: true,
                                                            scaleSteps: steps,
                                                            scaleStepWidth: 1,
                                                            scaleStartValue: 0});
  });
});
