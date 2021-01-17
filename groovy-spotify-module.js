var request = require('request'); // "Request" library

// Fetches the top artists of a user
// accessToken: security token allowing access to the web api
exports.getTopArtists = async function (userID, accessToken) {
    var top_artists_options = {
        url: 'https://api.spotify.com/v1/me/top/artists',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
    }
    request.get(top_artists_options, function(error, response, body) {
        console.log(JSON.parse(body));
        return JSON.parse(body);
    });
};

// Fetches the top tracks of a user
// accessToken: security token allowing access to the web api
exports.getTopTracks = async function (userID, accessToken) {
    var top_tracks_options = {
        url: 'https://api.spotify.com/v1/me/top/tracks',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
    }
    request.get(top_tracks_options, function(error, response, body) {
        //console.log(JSON.parse(body));
        if (error) {
            console.log("Returning error to promise");
            return "Error";
        }
        else {
            console.log("Returning success to promise");
            return JSON.parse(body);
        }
    });
};

// Generates recommendations based on seeds
// seeds: JSON object of the form
//      seeds = {
//          seed_artists: $artist_id_one$, $artist_id_two$, etc
//          seed_genres:  $genre_name_one$, $genre_name_two$, etc 
//          seed_tracks:  $track_id_one$, $track_id_two$, etc
//      }
//      with up to 5 total objects split across those three categories
// accessToken: security token allowing access to the web api
exports.getRecommendations = async function (seeds, accessToken) {
    var options = {
        url: 'https://api.spotify.com/v1/recommendations?' + data,
        body: seeds,
        headers: { 'Authorization': 'Bearer ' + accessToken },
        json: true
    };
    request.get(options, function(error, response, body) {
        return body;
    });
};

// Creates a playlist for a user
// userID: the spotify id of the user for whom the playlist is being made
// accessToken: security token allowing access to the web api
// playlistInfo: JSON object of the form
//      playlistInfo = {
//          'name': string
//          'description': string (optional)
//          'public': bool (optional)
//      }
exports.createPlaylist = async function (playlistInfo, userID, accessToken) {
    var playlist_options = {
        url: 'https://api.spotify.com/v1/users/' + userID + '/playlists',
        body: playlistInfo,
        dataType:'json',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
        }
      };
      // Send playlist creation request
      request.post(playlist_options, function(error, response, p_body) {
        return body;
      });
};

// Populates a playlist with tracks
// playlistID: spotify ID of the playlist being modified
// tracks: array of track URIs
// accessToken: security token allowing access to the web api
exports.addToPlaylist = async function (playlistID, tracks, accessToken) {
    var tracksList = tracks[0];
    if (tracks.length > 1) {
        for (var i = 0; i < tracks.length; i++) {
            tracksList += "," + tracks[i];
        }
    }
    s_options = {
        url: 'https://api.spotify.com/v1/playlists/' + playlistID + '/tracks?'
          + 'uris=' + tracksList,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        }
    }
    request.post(s_options, function(error, response, body) {
        return body;
    });
};

// When called, creates and populates playlist based on recommendations
// userID: the spotify id of the user for whom the playlist is being made
// accessToken: security token allowing access to the web api
exports.createGroovyPlaylist = async function (userID, accessToken) {

    // Get top tracks
    let top_tracks = new Promise((resolve, reject) => {
        let answer = module.exports.getTopTracks(userID, accessToken);
    
        if (typeof answer !== 'undefined') {
            if (answer == "Error") {
                reject("Promise resolved unsuccessfully");
            }
            else {
                console.log("Recieved success, printing:");
                console.log(answer);
                resolve(answer);
            }
        }
    });

    top_tracks.then((message) => {
        console.log(message);
    });

    /*
    // Get recommendations, use top tracks as seed
    var seeds = {
        seed_artists: '',
        seed_genres: '',
        seed_tracks: top_tracks.items[0].id + ','
                   + top_tracks.items[1].id + ','
                   + top_tracks.items[2].id + ','
                   + top_tracks.items[3].id + ','
                   + top_tracks.items[4].id
    };
    var recommendations = module.exports.getRecommendations(seeds, accessToken);

    // Create playlist
    var playlistInfo = {
        'name': "Groovy Recommendations"
    }
    var playlist = module.exports.createPlaylist(playlistInfo, userID, accessToken);

    // Populate playlist with recommendations

    */
};
