#!/usr/bin/env node

var WebSocketServer = require('websocket').server;
var http = require('http');

var nextId = 1;

function log(text) {
    function fix(num) {
        if (num.length == 1)
            return '0' + num;
        else
            return num;
    }

    var now = new Date();
    console.log(now.getUTCFullYear().toString() + '-' + fix(now.getUTCMonth().toString()) + '-' + fix(now.getUTCDate().toString())
     + ' ' + fix(now.getUTCHours().toString()) + ':' + fix(now.getUTCMinutes().toString()) + ':' + fix(now.getUTCSeconds().toString())
     + ' UTC: ' + text);
}


var users = {};
var waiting = [];

function pack(object) {
    return JSON.stringify(object);
}

function send(connection, type, data) {
    if (data == undefined)
        connection.sendUTF(pack({type: type}));
    else
        connection.sendUTF(pack({type: type, data: data}));
}

function addUser(connection) {
    var user = {
    name: 'Anonymous',
    other: null,
    lastSeen: new Date().getTime(),
    connection: connection,
    havePinged: false
    };
    users[connection.id] = user;
}

function connectUsers(a, b) {
    a.other = b;
    b.other = a;
    send(a.connection, 'start', b.name);
    send(b.connection, 'start', a.name);
    log(nameConnection(a.connection) + ' and ' + nameConnection(b.connection) + ' are now talking');
}

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
log('PORT=' + port + ' IP=' + ip);
var server = http.createServer(function(request, response) {
    log('Received request for ' + request.url);
    response.writeHead(404);
    response.end();
}, port, ip);

server.listen(port, ip, function() {
    log('Server is listening on port ' + port);
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

function nameConnection(connection) {
    return connection.remoteAddress + '[' + id + '](' + users[connection.id].name + ')';
}

function endChat(id) {
    if (users[id].other != null) {
        log(nameConnection(users[id].connection) + ' and ' + nameConnection(users[id].other.connection) + ' ended their chat');
        send(users[id].other.connection, 'end');
        users[id].other.other = null;
        users[id].other = null;
    }
}

function removeUser(id) {
    if (users[id].other != null)
        endChat(id); //se till att avsluta chatten om user pratar med någon
    delete users[id];
    var pos = waiting.indexOf(id);
    if (pos > -1)
        waiting.splice(pos, 1);
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        log('Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var connection = request.accept(null, request.origin);
    connection.id = nextId;
    nextId++;
    addUser(connection);
    log(connection.remoteAddress + ' connected');

    connection.on('message', function(message) {
        id = connection.id;
        if (id in users == -1)
            return;

        users[id].lastSeen = new Date().getTime();

        if (message.type == 'utf8') {
            var msg = JSON.parse(message.utf8Data);
            if (msg.type == 'new') {
                if (waiting.indexOf(id) == -1)
                    waiting.push(id);

                if (waiting.length >= 2) {
                    connectUsers(users[waiting[0]], users[waiting[1]]);
                    waiting.splice(0, 2);
                }
            }
            else if (msg.type == 'name') {
                users[id].name = msg.data;
                log(nameConnection(connection) + ' is now known as ' + msg.data);
            }
            else if (msg.type == 'end') {
                endChat(id);
            }
            else if (msg.type == 'disconnect') {
                connection.close();
            }
            else if (msg.type == 'msg') {
                if (users[id].other != null) {
                    send(users[id].other.connection, 'msg', msg.data);
                }
            }
            else if (msg.type == 'ping') {
                send(users[id].connection, 'pong');
            }
        }
    });
    connection.on('close', function(reasonCode, description) {
        log(nameConnection(connection) + ' disconnected: ' + description);
        removeUser(id);
    });
});
