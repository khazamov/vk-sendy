var firebase = require('firebase');
var config = require('config');
var dbConfig = {
    apiKey: config.vk.dbtoken,
    authDomain: config.vk.authDomain,
    databaseURL: config.vk.firebaseLink
};

firebase.initializeApp(dbConfig);
console.log(firebase.app().name);
var database = firebase.database().ref();

database.remove();

var database = firebase.database().ref('/users');

var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('retarget_ids')
});


lineReader.on('line', function(line) {

    console.log('Line from file:', line);
    i = 0;
    var update = {};
    update[line] = 'unprocessed';
    database.update(update, function(error) {
        if (error) {
            console.log("Error updating data:", error);
        }
    });

});