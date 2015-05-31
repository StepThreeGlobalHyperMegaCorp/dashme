
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
// Misc Helpers
//------------------------------------------------------------------------------
var getUsername = function() {
  return $('#username').val();
};

//------------------------------------------------------------------------------
// main
//------------------------------------------------------------------------------
$( document ).ready(function () {
  var $sb = $('#set-location-btn');
  $sb.click(function (event) {
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
    });
});
