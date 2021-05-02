import EventEmitter from 'events';
import {GameProtocolTransformer} from './GameProtocolTransformer.mjs';
import * as net from 'net';
const room = new EventEmitter();
/*
 * We accept messages like this:
 *  PlayerID: Info\n
 *
 */

/*
 * The server of typing-elite.
 * How to make sure we built a connection to a client:
 * 0. This server get TOKEN for each client.
 * 1. Ask Authentication Server about the TOKEN.
 * 2. Decide whether to accept this client or not.
 */

/*
 * Everything clients send should be sent to server.
 * Everything clients receive should be sent by server.
 */

room.clients = Object.create(null);//Plain object without '__proto__'


room.on('serverJoined', function (server) {
    this.gameServer = server;
    //send http request to service server.
});


room.on('playerJoined', function (id, client) {
    this.clients[id] = client;
    room.emit('send2server', `${id}:Hello 0,0`);
});

room.on('broadcast', function (msg) {
    console.log('broadcast: ' + msg);
    for (const clientId in this.clients) {
        this.clients[clientId].write(msg + '\n');
    }
});

room.on('send2sb', function (sb, msg) {
    console.log(`send2sb sb:${sb} msg:${msg}`);
    this.clients[sb].write(msg + '\n');
});

room.on('send2server', function (msg) {
    this.gameServer.write(msg + '\n');
});

room.on('leave', function (id) {
    delete this.clients[id];
    this.emit('broadcast', `${id}:left.`);
});

function clientIdIsValid(client, id) {
    if (id.length >= 10) {
        client.write("Username too long. Please reenter:\n")
        return false
    }
    if (room.clients[id]) {
        client.write("Username has existed:\n");
        return false;
    }
    return true;
}

const gatewayServer = net.createServer(client => {
    const protoStream = client.pipe(new GameProtocolTransformer);

    let clientId;
    let clientStatus = 'registering';

    function tempFunc(data) {
        const dataStr = data.toString();
        if (clientStatus === 'registering') {
            //第一次client来信息
            clientId = dataStr;
            if (!clientIdIsValid(client, clientId)) {
                return;
            }
            //client.write(`Welcome, ${clientId}\n`);

            clientStatus = 'logined';
            room.emit('playerJoined', clientId, client);
            client.on('close', () => {
                room.emit('leave', clientId);
            });
        } else if (clientStatus === 'logined') {//第二次及之后的client来信息
            const msg = `${clientId}:${data}`;
            room.emit('send2server', msg);
            //room.clients[clientId].write(msg);
            return;
        } else {
            throw `Bad clientStatus:${clientStatus}`;
        }
    }
    protoStream.on('data', tempFunc);//每个client来信息都会调用tempFunc

    client.on('error', err => {
        protoStream.end();
        console.log(err);
    });
});

/*
 * 1. Make sure server for gameServer is established.
 * 2. Creating gatewayServer for clients
 */
const gameServerHandler = net.createServer(server => {
    if (gatewayServer.listening) {
        console.log(`Bad server: ${server.remoteAddress}`);
        return;
    }
    console.log('Server Created');
    room.emit('serverJoined', server);
    gatewayServer.listen(8888);

    const inputStream = server.pipe(new GameProtocolTransformer);
    inputStream.on('data', raw => {
        const msg = '' + raw.toString();
        console.log(msg);
        if (msg.charAt(0) == ':') {
            room.emit('broadcast', msg.slice(1));
        } else {
            const colonIdx = msg.indexOf(':');
            const id = msg.slice(0, colonIdx);
            const info = msg.slice(colonIdx + 1);
            room.emit('send2sb', id, info);
        }
    });
});

gameServerHandler.listen(9909);
