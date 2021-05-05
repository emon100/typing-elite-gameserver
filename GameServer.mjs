import {ProtoStream} from './GameProtocolTransformer.mjs'
import * as net from 'net';
import * as readline from 'readline';


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'GAMESERVER> '
});

rl.on('line', (line) => {
    switch (line.trim()) {
        case 'r':
            createServer();
            break;
        case 'c':
            allMsgs = [];
            break;
        default:
            console.log(`Say what? I might have heard '${line.trim()}'`);
            break;
    }
    rl.prompt();
}).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
});

function randomWord() {
    let str = "";
    for (let i = 0; i < 3; ++i) {
        str += String.fromCharCode(97 + Math.floor(Math.random() * 26))
    }
    return str;
}

function randomCoord(){
    return `${Math.floor(Math.random()*19)*50} ${Math.floor(Math.random()*19)*50}`;
}


let allMsgs = [];

function handleJoin(stream,id,msg){
    allMsgs.forEach(v => stream.write(`${id}:${v}`));
    const joinMsg = msg + ` ${randomWord()}`
    stream.write(":" + joinMsg);
    allMsgs.push(joinMsg);
    const spawnMsg = `${id}:SPAWN ${randomCoord()}`;
    stream.write(":" + spawnMsg);
    allMsgs.push(spawnMsg);
}

function handleKill(stream, msg, info) {
    stream.write(`:${msg}\n`);
    allMsgs.push(msg);
    setTimeout(() => {
        const spawnid = info.split(' ')[1];
        const spawnMsg = `${spawnid}:SPAWN ${randomCoord()}`;
        stream.write(":" + spawnMsg);
        allMsgs.push(spawnMsg);
    }, 1000);
}

function createServer() {
    const outside = net.createConnection(9909);

    const stream = ProtoStream(outside);//outside.pipe(new GameProtocolTransformer);

    outside.on('error', err => {
        console.log(err);
        stream.end();
    });

    outside.on('connect', () => {
        console.log("GameServer connected");
        rl.prompt();
    });



    stream.on('data', raw => {
        const msg = "" + raw.toString();
        console.log(msg);
        const colonIdx = msg.indexOf(':');
        const id = msg.slice(0, colonIdx);
        const info = msg.slice(colonIdx + 1);

        if (info.includes("JOIN")) {
            handleJoin(stream,id,msg);
        } else if(info.includes("KILL")){
            handleKill(stream, msg, info);
        }else{
            stream.write(`:${msg}`)
            allMsgs.push(msg);
        }
    });
}

createServer();

