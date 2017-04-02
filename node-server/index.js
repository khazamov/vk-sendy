var config = require('config');
var async = require('async');
var request = require('request');
var qs = require('qs');
var express = require('express')
var firebase = require('firebase');
var VK = require('vksdk');
var path = require("path");
var bodyParser = require('body-parser');
var sleep = require('system-sleep');
var app = express();
var globalSocket;
var globalStop = false;
var dbConfig = {
    apiKey: "YOUR_DB_KEY",
    authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
    databaseURL: "YOUR_FIREBASE_DB_URL"
};
var limit_msg_num = 15;
firebase.initializeApp(dbConfig);
console.log(firebase.app().name);
var rootRef = firebase.database().ref();
var userBase = rootRef.child('users');

var notOkCount = 0;
var counter = 0;




var vk = new VK({
    'appId': "YOUR_VK_APP_ID",
    'appSecret': "YOUR_VK_APP_SECRET",
    'language': "ru"
});

var input = '';
app.set('views', __dirname);
app.use(bodyParser.json());

vk.setSecureRequests(true);
vk.setVersion('5.62');


vk.on('http-error', function(_e) {
    console.log('http-error: ' + _e);
});

vk.on('parse-error', function(_e) {
    console.log("parse-error" + _e);
});




function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function vkSendMsg(vkId, msgbody, callback) {
    vk.request('messages.send', {
        user_id: vkId,
        message: msgbody
    }, function(post) {
        counter += 1;


        if (post) {
            console.log('POST MSG:', post);
            if (post['response']) {
                msg = 'OK';
            } else if (post['error'] && post['error']['error_code'] == 902) {
                msg = '902'
            } else
            if (post['error'] && post['error']['error_code'] != 902) {
                notOkCount += 1;
                console.log('notokcount ' + notOkCount)
                msg = 'NOT OK'

            }
            update_node = {}
            update_node[vkId] = 'OK'
            userBase.update(update_node);




        };
    });
};

app.get('/msgnow', function(req, res) {
    var access_token = req.query['at'];
    vk.setToken(access_token);



    array_message = [
        "Здравствуйте! Мы заметили, что вы любите спорт и предлагаем вам оценить уникальный проект  https://vk.com/workoutaholic. Я готов ответить на любые вопросы. ",
        "Добрый день! Спорт - это то, что нас объединяет. Мне ведь не показалось? Оцените наш супер проект - https://vk.com/workoutaholic. Готов ответить на любые возникшие вопросы.",
        "Привет, друг! Мы тут решили запустить проект по оздоровлению нации застрявших вконтакте :) Гляньте на наш проект https://vk.com/workoutaholic и поделитесь мыслями. Я всегда рад услышать вас ",
        "Алле, гараж? Мы тут пашем - https://vk.com/workoutaholic, а вы? Отвечу на любые вопросы.",
        "Ребята, вступайте в группу - https://vk.com/workoutaholic, обещаем лучшую инфу по теме! Отвечу на любые вопросы.",
        "Привет! Мы незнакомы, но все же хочу рассказать вам об одной уникальной группе вконтакте, которая поможет вам держать себя в форме и даст кучу полезных советов. https://vk.com/workoutaholic. Отвечу на любые вопросы."
    ];




    notOkCount = 0;
    counter = 0;


    userBase.orderByValue().equalTo('unprocessed').limitToFirst(limit_msg_num).once("value", function(snapshot) {
        if (counter >= limit_msg_num) {
            globalSocket.emit('message', {
                message: 'Рассылка закончена'
            });
            res.end();
        }
        snapshot.forEach(function(childSnapshot) {
            var vkId = childSnapshot.key;
            var value = childSnapshot.val();
            console.log('Snapshot each: ' + vkId);
            console.log('Snapshot value each: ' + value);
            var msgStatus = value;

            if (msgStatus == 'NOT OK' || msgStatus == 'unprocessed')

            {


                console.log('ID: = ' + vkId);
                var msg = '';
                sleep(4 * 1000);

                var random_index = getRandomInt(0, array_message.length);
                console.log('random index: ' + random_index);


                msgbody = array_message[random_index];
                console.log('msgbody: ' + msgbody);
                vkSendMsg(vkId, msgbody);
                console.log('emmiting message');
                message_txt = 'Обрабатываем vk.com/id' + vkId;
                if (globalSocket) {
                    globalSocket.emit('message', {
                        message: message_txt
                    });
                };

            };

        });

    });



});


app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});



var io = require('socket.io').listen(app.listen((process.env.PORT || 5000)));
io.sockets.on('connection', function(socket) {
    globalSocket = socket;
    globalSocket.emit('message', {
        message: 'Сюда будут приходить результаты'
    });
});

io.sockets.on('message', function(data) {
    if (data.message && data.message == 'stop') {
        globalStop = true;
    }
});