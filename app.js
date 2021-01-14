/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

global.XMLHttpRequest = require('xhr2');
var https = require('https')
var SpotifyWebApi = require('spotify-web-api-node');
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '62e70be4a3884d40b81f927e1dd0e7ee'; // Your client id
var client_secret = '35024b6079c549dd9409356c2945ab8e'; // Your secret
var redirect_uri = 'http://groovy.samuelmebersole.com/callback'; // Your redirect uri
//var redirect_uri = 'localhost:8080/callback';

var spotifyApi = new SpotifyWebApi({
  clientId: client_id,
  clientSecret: client_secret,
  redirectUri: redirect_uri
});
///var xhr = new XMLHttpRequest();
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-read-playback-state user-top-read playlist-modify-public playlist-modify-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
    console.log(state);
    console.log(storedState);
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        spotifyApi.access_token = access_token;

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/recs', function(req, res){

  var userid = req.query.user_id;

  // Get top artists
  var t_artists = "";
  var top_artists_options = {
    url: 'https://api.spotify.com/v1/me/top/artists',
    headers: {
      'Authorization': 'Bearer ' + spotifyApi.access_token
    }
  }
  request.get(top_artists_options, function(error, response, body) {
    t_artists = JSON.parse(body);
    //console.log(t_artists);
  });

  // Get top tracks
  var t_tracks = "";
  var top_tracks_options = {
    url: 'https://api.spotify.com/v1/me/top/tracks',
    headers: {
      'Authorization': 'Bearer ' + spotifyApi.access_token
    }
  }
  request.get(top_tracks_options, function(error, response, body) {
    t_tracks = JSON.parse(body);
    console.log(t_tracks.items[2]);
  });

  // Data & Options for Spotify recommendations request
  var data = querystring.stringify({
    //seed_artists: '',
    seed_tracks: t_tracks.items[0].id + ","
               + t_tracks.items[1].id + ","
               + t_tracks.items[2].id + ","
               + t_tracks.items[3].id + ","
               + t_tracks.items[4].id
  });
  var options = {
    url: 'https://api.spotify.com/v1/recommendations?' + data,
    headers: { 'Authorization': 'Bearer ' + spotifyApi.access_token },
    json: true
  };
  //console.log(options);

  // Send recommendations request
  request.get(options, function(error, response, body) {
    //console.log(body);

    var recommendations = body;

    // Options for playlist creations request
    options = {
      url: 'https://api.spotify.com/v1/users/' + userid + '/playlists',
      body: JSON.stringify({
          'name': Date.now(),
          'public': false
      }),
      dataType:'json',
      headers: {
          'Authorization': 'Bearer ' + spotifyApi.access_token,
          'Content-Type': 'application/json',
      }
    };
    // Send playlist creation request
    request.post(options, function(error, response, p_body) {

      var playlist = JSON.parse(p_body);
      //console.log(playlist);

      // Iterate through songs in recommendations object, post to playlist
      for(var i = 0; i < recommendations.tracks.length; i++) {
        var obj = recommendations.tracks[i];

        s_options = {
          url: 'https://api.spotify.com/v1/playlists/' + playlist.id + '/tracks?'
            + 'uris=' + obj.uri,
          headers: {
            'Authorization': 'Bearer ' + spotifyApi.access_token,
            'Content-Type': 'application/json',
          }
        }
        request.post(s_options, function(error, response, body) {
          //console.log(s_options);
          //console.log(body);
        });
      }

    });

    
  });

});

process.on('uncaughtException', function (err) {
  console.log(err);
}); 

console.log('Listening on 8080');
app.listen(8080);
