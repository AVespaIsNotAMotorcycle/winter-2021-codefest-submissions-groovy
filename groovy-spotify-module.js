var request = require('request'); // "Request" library
var fs = require('fs'); //"File System" library
const { resolve } = require('path');

// Fetches the top artists of a user
// accessToken: security token allowing access to the web api
exports.getTopArtists = async function (accessToken) {
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
exports.getTopTracks = async function (accessToken) {
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
    var append = "limit=50";                            // Amount of tracks to fetch. Later calls are limited to 50, we only fetch 50
    if (seeds.seed_artists != "") {
        if (append.length > 0) {
            append += '&';
        }
        append += "seed_artists=" + seeds.seed_artists;
    }
    if (seeds.seed_genres != "") {
        if (append.length > 0) {
            append += '&';
        }
        append += "seed_genres=" + seeds.seed_genres;
    }
    if (seeds.seed_tracks != "") {
        if (append.length > 0) {
            append += '&';
        }
        append += "seed_tracks=" + seeds.seed_tracks;
    }

    var options = {
        url: 'https://api.spotify.com/v1/recommendations?' + append,
        headers: { 'Authorization': 'Bearer ' + accessToken },
        json: true
    };

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
                            resolve(body.items[i]);
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

// Returns array of artists whose folower count is below followerThreshold
// artistIDs: array of artist IDs
// followerThreshold: integer maximum number of followers
exports.isUnderground = async function (artistIDs, followerThreshold, accessToken) {
    return new Promise((resolve, reject) => {
        // Write address
        var address = "https://api.spotify.com/v1/artists?ids=" + artistIDs.join(',');
        var options = {
            url: address,
            headers: { 'Authorization': 'Bearer ' + accessToken },
            json: true
        }
        request.get(options, function(error, response, body) {
            if (error) {
                console.log(error);
                console.log(response);
                console.log(body);
                reject(response.statusCode);
            }
            else {
                // Return only artists that are below followerThreshold
                var jsonBody = body;
                var toReturn = [];
                for (var i = 0; i < jsonBody.artists.length; i++) {
                    if (jsonBody.artists[i].followers.total < followerThreshold) {
                        toReturn.push(jsonBody.artists[i]);
                    }
                }
                resolve(toReturn);
            }
        });
    });
  };

// Populates a playlist with tracks
// playlistID: spotify ID of the playlist being modified
// tracks: array of track URIs
// accessToken: security token allowing access to the web api
exports.addToPlaylist = async function (playlistID, tracks, accessToken) {
    s_options = {
        url: 'https://api.spotify.com/v1/playlists/' + playlistID + '/tracks?'
          + 'uris=' + tracks.join(','),
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        }
    }
    request.post(s_options, function(error, response, body) {
        return body;
    });
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
// clearNumber: number of tracks to remove
exports.clearPlaylist = async function (accessToken, playlistID, clearNumber = -1) {
    return new Promise((resolve, reject) => {
        // Get tracks in the playlist
        let playlistTracks = module.exports.getPlaylist(accessToken, playlistID);
        playlistTracks.then((res) => {

            // If no positive number give, remove all tracks
            if (clearNumber < 0) {
                clearNumber = res.tracks.length;
            }

            // Make array of URIs
            console.log("CREATING ARRAY OF TRACKS");
            var del_tracks = '{"tracks":[';
            for (var i = 0; i < res.tracks.items.length && i < clearNumber ; i++) {
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
                    reject(response.statusCode);
                }
                else {
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
        let top_tracks = module.exports.getTopTracks(accessToken);

        top_tracks.then((res) => {
            console.log("Got top tracks");
            var top_tracks_body = JSON.parse(res);

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
                var rec_tracks = res;

                var recArtists = [];
                for (var i = 0; i < rec_tracks.tracks.length; i++) {
                    if (!recArtists.includes(rec_tracks.tracks[i].artists[0].id)) {
                        recArtists.push(rec_tracks.tracks[i].artists[0].id.replace(/\W/g, ''));
                    }
                }

                let recsAreUnderground = module.exports.isUnderground(recArtists, 15000, accessToken);
                recsAreUnderground.then((res) => {
                    console.log("Eliminated popular artists");
                    var undergroundRecs = [];
                    for (var i = 0; i < rec_tracks.tracks.length; i++) {
                        for (var j = 0; j < res.length; j++) {
                            for (var k = 0; k < rec_tracks.tracks[i].artists.length; k++) {
                                if (rec_tracks.tracks[i].artists[k].id == res[j].id) {
                                    undergroundRecs.push(rec_tracks.tracks[i]);
                                }
                            }
                        } 
                    } 

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
                                for (var i = 0; i < undergroundRecs.length; i++) {
                                    rec_s.push(undergroundRecs[i].uri)
                                }
                                module.exports.addToPlaylist(playlist_res.id, rec_s, accessToken);

                                if (rec_s.length < 20) {
                                    module.exports.createGroovyPlaylist(userID, accessToken);
                                    resolve(playlist_res.id);
                                }
                                else {
                                    resolve(playlist_res.id);
                                }

                            });
                        }
                        // If that playlist does exist
                        else {
                            console.log("Updating Existing playlists");

                            var plID = res.id;

                            // Clear playlist
                            module.exports.clearPlaylist(accessToken, plID, res.tracks.total - 20);

                            // Populate playlist with recommendations
                            var rec_s = [];
                            for (var i = 0; i < undergroundRecs.length; i++) {
                                rec_s.push(undergroundRecs[i].uri)
                            }
                            module.exports.addToPlaylist(plID, rec_s, accessToken);

                            if (rec_s.length + res.tracks.total < 20) {
                                module.exports.createGroovyPlaylist(userID, accessToken);
                                resolve(plID);
                            }
                            else {
                                resolve(plID);
                            }
                        }

                    });
                });
            });

        });

    });
};
