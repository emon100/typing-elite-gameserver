import {Transform} from 'stream';
import duplexify from 'duplexify';

/*
 *
 *   -------- _write  'data' ----------------------------- _write   'data'
 *->| duplex |------------->| GameProtocolReadTransformer |-------------->
 *  |        |'data'  _write|-----------------------------|'data'   write
 *<-|        |<-------------|  WriteToOutsideTransformer  |<--------------
 *   --------                -----------------------------
 *
 *
 */
export function ProtoStream(duplex) {
    const writeToOutsideTransformer = new Transform({
        encoding: 'utf8',
        transform(pkg, encoding, cb) {
            pkg = pkg.toString().trim();
            if (pkg.length > 0) this.push(pkg + '\n');
            cb();
        }
    });

    writeToOutsideTransformer.pipe(duplex);

    const readFromOutsideStream = duplex.pipe(new GameProtocolReadTransformer());

    return duplexify(
        writeToOutsideTransformer,
        readFromOutsideStream,
        {
            encoding: 'utf8',
        }
    );
}

export class GameProtocolReadTransformer extends Transform {
    //Limit the length of a part.
    //If raw become too long, deal with it:
    //1. Disconnect? (Believe to be the best idea.)
    //2. Drop the part?
    constructor(options) {
        super(options);
        this.raw = '';
        this.setEncoding('utf8');
    }

    _transform(chunk, encod, callback) {
        this.raw += chunk.toString();
        if (this.raw.indexOf('\n') === -1)
            return;

        const stringParts = this.raw.split('\n');
        for (let i = 0; i < stringParts.length - 1; ++i) {
            if (stringParts[i].length !== 0) {
                const ok = this.push(stringParts[i]);
                if (!ok) {
                    this.raw = stringParts.slice(i + 1).join('\n');
                    callback();
                    return;
                }
            }
        }
        this.raw = stringParts[stringParts.length - 1];
        callback();
    }
}
