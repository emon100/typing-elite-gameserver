import {Transform} from 'stream';

export class GameProtocolTransformer extends Transform {
    //Limit the length of a part.
    //If raw become too long, deal with it:
    //1. Disconnect? (Believe to be the best idea.)
    //2. Drop the part?
    constructor(options){
        super(options);
        this.raw='';
    }
    _transform(chunk,encod,callback){
        this.raw += chunk.toString();
        if(this.raw.indexOf('\n')===-1)
            return;

        const stringParts = this.raw.split('\n');
        for(let i=0;i<stringParts.length-1;++i){
            this.push(stringParts[i]);
        }
        this.raw = stringParts[stringParts.length-1];
        callback();
    }
}
