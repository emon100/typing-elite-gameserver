import EventEmitter from 'events';
import {GameProtocolReadTransformer} from './GameProtocolTransformer.mjs';
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
    room.emit('send2server', `${id}:JOIN`);
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
    this.emit('send2server', `${id}:LEAVE`);
});

function auth(authData){
    return authData;
}

const gatewayServer = net.createServer(client => {
    const protoStream = client.pipe(new GameProtocolReadTransformer);


    let handler = handleFirstTime;
    function temp(data){
        handler(data);
    }

    let clientId=null;
    function handleFirstTime(data) {//第一次client来信息
        const dataStr = data.toString();
        clientId = auth(dataStr);
        room.emit('playerJoined', clientId, client);
        client.on('close', () => {
            room.emit('leave', clientId);
        });
        handler = handleSecondTime;
    }
    function handleSecondTime(data){
        const dataStr = data.toString();
        const msg = `${clientId}:${dataStr}`;
        room.emit('send2server', msg);
    }
    protoStream.on('data', temp);//每个client来信息都会调用tempFunc

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

    const inputStream = server.pipe(new GameProtocolReadTransformer);
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

    server.on('error',(err)=>{
        inputStream.end();
        gatewayServer.close();
        console.log(err);
    });
});

gameServerHandler.listen(9909);
