
//------------------------------------------------------------------------------
// AJAX Helpers
//------------------------------------------------------------------------------
var ajaxHelper = function(jqxhr, opt_cb, opt_fail_cb) {
  jqxhr.done(function (res) {
    if (res.success) {
      console.log(this.url + " success");
      if (opt_cb) { opt_cb(res); }
    }
    else {
      console.log("Failed: " + this.url);
      if (opt_fail_cb) { opt_fail_cb(jqxhr); }
    }
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
      getJson("/setPlace/" + getUsername() + "/work",
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
      getJson("/gps/" + getUsername(),
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

//------------------------------------------------------------------------------
// On document ready.
//------------------------------------------------------------------------------
$( document ).ready(function () {
  $('#set-location-btn').click(setWorkLocation);
  $('#post-cur-location-btn').click(postCurrentLocation);

  // Get context with jQuery - using jQuery's .get() method.
  var ctx = $("#myChart").get(0).getContext("2d");
  // This will get the first returned node in the jQuery collection.
  var myNewChart = new Chart(ctx);

  var data = {
    labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    datasets: [
      {
        label: "Week 1",
        fillColor: "rgba(220,220,220,0.5)",
        strokeColor: "rgba(220,220,220,0.8)",
        highlightFill: "rgba(220,220,220,0.75)",
        highlightStroke: "rgba(220,220,220,1)",
        data: [65, 59, 80, 81, 56, 55, 40]
      },
      {
        label: "Week 2",
        fillColor: "rgba(151,187,205,0.5)",
        strokeColor: "rgba(151,187,205,0.8)",
        highlightFill: "rgba(151,187,205,0.75)",
        highlightStroke: "rgba(151,187,205,1)",
        data: [28, 48, 40, 19, 86, 27, 90]
      }
    ]
  };

  var myBarChart = new Chart(ctx).Bar(data);
});