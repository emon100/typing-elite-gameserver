import {GameProtocolTransformer} from './GameProtocolTransformer.mjs'
import * as net from 'net';
import * as readline from 'readline';

let allMsgs = [];


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


function createServer() {
    const outside = net.createConnection(9909);

    const inputStream = outside.pipe(new GameProtocolTransformer);

    outside.on('error', err => {
        console.log(err);
        inputStream.end();
    });

    outside.on('connect', () => {
        console.log("GameServer connected");
        rl.prompt();
    });

    function randomWord() {
        let str = "";
        for (let i = 0; i < 3; ++i) {
            str += String.fromCharCode(97 + Math.floor(Math.random() * 26))
        }
        return str;
    }


    inputStream.on('data', raw => {
        const msg = "" + raw.toString();
        console.log(msg);
        const colonIdx = msg.indexOf(':');
        const id = msg.slice(0, colonIdx);
        const info = msg.slice(colonIdx + 1);

        if (info.includes("JOIN")) {
            allMsgs.forEach(v => outside.write(`${id}:${v}\n`));
            const joinMsg = msg + ` ${randomWord()}`
            outside.write(":" + joinMsg + '\n');
            allMsgs.push(msg);
            const spawnMsg = `${id}:SPAWN 0 0`;
            outside.write(":" + spawnMsg + '\n');
            allMsgs.push(spawnMsg);
        } else {
            outside.write(`:${msg}\n`)
            allMsgs.push(msg);
        }
    });
}

createServer();
