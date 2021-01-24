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
    return new Promise((resolve, reject) => {
        request.get(top_artists_options, function(error, response, body) {
            if (error) {
                reject(response.statusCode);
            }
            else {
                resolve(body);
            }
        });
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
    return new Promise((resolve, reject) => {
        request.get(top_tracks_options, function(error, response, body) {
            if (error) {
                reject(response.statusCode);
            }
            else {
                resolve(body);
            }
        });
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
    var append = "";
    console.log(seeds);
    if (seeds.seed_artists != "") {
        //console.log(seeds.seed_artists);
        append += "seed_artists=" + seeds.seed_artists;
    }
    if (seeds.seed_genres != "") {
        if (append.length > 0) {
            append += '&';
        }
        //console.log(seeds.seed_genres);
        append += "seed_genres=" + seeds.seed_genres;
    }
    if (seeds.seed_tracks != "") {
        if (append.length > 0) {
            append += '&';
        }
        //console.log(seeds.seed_tracks);
        append += "seed_tracks=" + seeds.seed_tracks;
    }
    
    var options = {
        url: 'https://api.spotify.com/v1/recommendations?' + append,
        headers: { 'Authorization': 'Bearer ' + accessToken },
        json: true
    };
    console.log("Retrieving recommendations");
    console.log(options);
    return new Promise((resolve, reject) => {
        request.get(options, function(error, response, body) {
            if (error) {
                reject(response.statusCode);
            }
            else {
                resolve(body);
            }
        });
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
        headers: { 'Authorization': 'Bearer ' + accessToken },
        json: true
      };
      // Send playlist creation request
      return new Promise((resolve, reject) => {
        request.post(playlist_options, function(error, response, body) {
            if (error) {
                console.log(error);
                console.log(response);
                console.log(body);
                reject(response.statusCode);
            }
            else {
                resolve(body);
            }
        });
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
    console.log(s_options);
    request.post(s_options, function(error, response, body) {
        console.log(body);
        return body;
    });
};

// When called, creates and populates playlist based on recommendations
// userID: the spotify id of the user for whom the playlist is being made
// accessToken: security token allowing access to the web api
exports.createGroovyPlaylist = async function (userID, accessToken) {

    return new Promise((resolve, reject) => {

        // Get top tracks
        let top_tracks = module.exports.getTopTracks(userID, accessToken);

        top_tracks.then((res) => {
            console.log("Got top tracks");
            var t_tracks = JSON.parse(res);
            //console.log(t_tracks);

            top_tracks_body = JSON.parse(res);
            //console.log(res);

            // Get recommendations, use top tracks as seed
            var seeds = {
                seed_artists: '',
                seed_genres: '',
                seed_tracks: top_tracks_body.items[0].id + ','
                        + top_tracks_body.items[1].id + ','
                        + top_tracks_body.items[2].id + ','
                        + top_tracks_body.items[3].id + ','
                        + top_tracks_body.items[4].id
            };
            let recommendations = module.exports.getRecommendations(seeds, accessToken);

            recommendations.then((res) => {
                console.log("Got recommendations");
                var rec_tracks = res;//JSON.parse(res);
                console.log(rec_tracks);

                // Create playlist
                var playlistInfo = {
                    name: "New Playlist",
                    description: "New playlist description",
                    public: false
                };
                let playlist = module.exports.createPlaylist(playlistInfo, userID, accessToken);

                playlist.then((res) => {
                    console.log("Created playlist");
                    playlist_res = res;
                    
                    // Populate playlist with recommendations
                    var rec_s = [];
                    for (var i = 0; i < rec_tracks.tracks.length; i++) {
                        rec_s.push(rec_tracks.tracks[i].uri)
                    }
                    module.exports.addToPlaylist(playlist_res.id, rec_s, accessToken);

                    resolve(playlist_res.id);

                });
            });

        });

    });
};