var request = require('request'); // "Request" library
var fs = require('fs'); //"File System" library
const { resolve } = require('path');

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

// Checks if a playlist ID is in the list of Groovy playlists
// playlistID : the id of the playlist
exports.isPlaylistGroovy = function (playlistID) {
    // read contents of the file
    const data = fs.readFileSync('playlist_log.txt', 'UTF-8');

    // split the contents by new line
    const lines = data.split('\n');

    // search all lines
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] == playlistID) {
            console.log("MATCH");
            return true;
        }
    }
    return false;
}

// Checks if a user has a playlist with a given name
// userID: the spotify id of the user for whom the playlist is being made
// accessToken: security token allowing access to the web api
// playlistName: the name to look for
exports.findPlaylist = async function (userID, accessToken, playlistName) {
    var options = {
        url: 'https://api.spotify.com/v1/users/' + userID + '/playlists?limit=50&offset=0',
        headers: { 'Authorization': 'Bearer ' + accessToken },
        json: true
    };
    return new Promise((resolve, reject) => {
        request.get(options, function(error, response, body) {
            if (error) {
                console.log(error);
                console.log(response);
                console.log(body);
                reject(response.statusCode);
            }
            else {
                for (var i = 0; i < body.items.length; i++) {
                    console.log("Existing playlist: " + body.items[i].name + " " + body.items[i].id);
                    if (body.items[i].name == playlistName) {
                        // check if it's made by groovy
                        var isGroovy = module.exports.isPlaylistGroovy(body.items[i].id);
                        if (isGroovy) {
                            resolve(body.items[i].id);
                            return;
                        }
                    }
                }
                resolve("false");
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

// Returns true if song's artist has below a certain number of followers
// songURI: URI of the song to check
// followerThreshold: integer maximum number of followers
exports.isUnderground = async function (songURI, followerThreshold, accessToken) {
    return new Promise((resolve, reject) => {
        var track = module.exports.getTrack(songURI.substring(14,36), accessToken);
        track.then((res) => {
          var track_body = JSON.parse(res);
          return track_body.artists[0].id;
        })
        .then((artist_id) => {
            var track_artist = module.exports.getArtist(artist_id, accessToken);
            track_artist.then((res) => {
              var artist_body = JSON.parse(res);
              if (artist_body.followers.total < followerThreshold) {
                  resolve (songURI);
              }
              else {
                  resolve(false);
              }
            })
        })
    });
  };

// Populates a playlist with tracks
// playlistID: spotify ID of the playlist being modified
// tracks: array of track URIs
// accessToken: security token allowing access to the web api
exports.addToPlaylist = async function (playlistID, tracks, accessToken) {
    console.log("ADDING TRACKS TO PLAYLIST");
    console.log("CHECKING SONG ARTIST LISTERNER COUNT");
    for (var i = 0; i < tracks.length; i++) {
        let isUnder = module.exports.isUnderground(tracks[i], 15000, accessToken);
        isUnder.then((res) => {
            if (res) {
                console.log("TRACK IS UNDERGROUND");
                s_options = {
                    url: 'https://api.spotify.com/v1/playlists/' + playlistID + '/tracks?'
                      + 'uris=' + res,
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
            }
            else {
                console.log("TRACK NOT UNDERGROUND");
            }
        });
    }
};

// Fetches catalog information of a track
// trackID: unique URI of a track
// accessToken: security token allowing access to the web api
exports.getTrack = async function (trackID, accessToken){
    var track_options = {
      url: 'https://api.spotify.com/v1/tracks/' + trackID,
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    };
    return new Promise((resolve, reject) => {
        request.get(track_options, function(error, response, body) {
            if (error) {
                reject(response.statusCode);
            }
            else {
                resolve(body);
            }
        });
    });
};

// Fetches catalog information of an artist
// artistID: unique ID of an artist
// accessToken: security token allowing access to the web api
exports.getArtist = async function (artistID, accessToken){
    var artist_options = {
      url: 'https://api.spotify.com/v1/artists/' + artistID,
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    }
    return new Promise((resolve, reject) => {
        request.get(artist_options, function(error, response, body) {
            if (error) {
                reject(response.statusCode);
            }
            else {
                resolve(body);
            }
        });
    });
};

// Finds and returns a playlist object based on a given ID
// accessToken: security token allowing access to the web api
// playlistID: Spotify ID of the playlist to be fetched
exports.getPlaylist = async function (accessToken, playlistID) {
    var cur_track_options = {
        url: 'https://api.spotify.com/v1/playlists/' + playlistID,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }
    return new Promise((resolve, reject) => {
        request.get(cur_track_options, function(error, response, body) {
            if (error) {
                reject(response.statusCode);
            }
            else {
                resolve(JSON.parse(body));
            }
        });
    });
}

// Deletes all songs in a playlist
// accessToken: security token allowing access to the web api
// playlistID: Spotify ID of the playlist to be cleared
exports.clearPlaylist = async function (accessToken, playlistID) {
    console.log("CLEARING PLAYLIST OF TRACKS");
    return new Promise((resolve, reject) => {
        // Get tracks in the playlist
        let playlistTracks = module.exports.getPlaylist(accessToken, playlistID);
        playlistTracks.then((res) => {
            console.log("CURRENT TRACKS ON PLAYLIST:");
            console.log(res.tracks);

            // Make array of URIs
            console.log("CREATING ARRAY OF TRACKS");
            var del_tracks = '{"tracks":[';
            for (var i = 0; i < res.tracks.items.length; i++) {
                if (i > 0) {
                    del_tracks += ',';
                }
                del_tracks += '{"uri":"' + res.tracks.items[i].track.uri + '"}';
            }
            del_tracks += ']}';
            console.log(del_tracks);

            // Send DELETE request
            console.log("SENDING DELETE REQUEST");
            var clear_options = {
                url: 'https://api.spotify.com/v1/playlists/' + playlistID + '/tracks',
                headers: {
                'Authorization': 'Bearer ' + accessToken
                },
                body: del_tracks
            }
            request.delete(clear_options, function(error, response, body) {
                if (error) {
                    console.log(response.statusCode);
                    reject(response.statusCode);
                }
                else {
                    console.log(body);
                    resolve(body);
                }
            });
        });
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
                //console.log(rec_tracks);

                // Check if Groovy playlist exists
                console.log("Checking log")
                let playlistExists = module.exports.findPlaylist(userID, accessToken, 'Groovy');

                playlistExists.then((res) => {

                    // No such playlist exists
                    if (res == "false") {
                        console.log("No existing playlist");

                        // Create playlist
                        var playlistInfo = {
                            name: "Groovy",
                            description: "",
                            public: false
                        };
                        let playlist = module.exports.createPlaylist(playlistInfo, userID, accessToken);

                        playlist.then((res) => {
                            console.log("Created playlist");
                            playlist_res = res;
                            
                            // Log playlist ID
                            fs.appendFile('playlist_log.txt', playlist_res.id + '\n', (err) => {
                                if (err) {
                                    throw err;
                                }
                                console.log("Log is updated.");
                            });

                            // Populate playlist with recommendations
                            var rec_s = [];
                            for (var i = 0; i < rec_tracks.tracks.length; i++) {
                                rec_s.push(rec_tracks.tracks[i].uri)
                            }
                            module.exports.addToPlaylist(playlist_res.id, rec_s, accessToken);

                            resolve(playlist_res.id);

                        });
                    }
                    // If that playlist does exist
                    else {
                        console.log("Updating Existing playlists");

                        var plID = res;

                        // Clear playlist
                        module.exports.clearPlaylist(accessToken, plID);

                        // Populate playlist with recommendations
                        var rec_s = [];
                        for (var i = 0; i < rec_tracks.tracks.length; i++) {
                            rec_s.push(rec_tracks.tracks[i].uri)
                        }
                        module.exports.addToPlaylist(plID, rec_s, accessToken);

                        resolve(plID);
                    }

                });

            });

        });

    });
};
