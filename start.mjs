import { createGameServer } from './GameServer.mjs';
import { room, gameServerHandler } from './GatewayServer.mjs';

const portForClients = process.env.portForClients;
const portForServer = process.env.portForServer;

if((portForServer ?? portForServer) == null){
    throw 'port failed';
}

const serversObj = gameServerHandler(portForClients,portForServer);
createGameServer(portForServer);

process.on('message',function(msg){
    if(msg=='count'){
        process.send(room.clientsCount);
    }else{
    }
});

setTimeout(()=>{
    serversObj.gameServerListener.close();
    serversObj.gatewayServer.close();
    process.send('QUIT');
    process.exit(0);
},50000);

