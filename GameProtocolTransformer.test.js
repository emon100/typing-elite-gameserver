import {GameProtocolReadTransformer, ProtoStream} from './GameProtocolTransformer.mjs';
import {describe, expect, test, jest} from '@jest/globals';
import {Duplex, PassThrough, Writable} from 'stream';
import duplexify from 'duplexify';

describe('Test GameProtocolReadTransformer', () => {
    it('constructs and pipes.',() => {
        const newS = new PassThrough();
        const transformer = new GameProtocolReadTransformer();
        const destination = newS.pipe(transformer);

        expect(transformer).toBeInstanceOf(GameProtocolReadTransformer);
        expect(destination).toBeInstanceOf(GameProtocolReadTransformer);
        expect(destination).toBeInstanceOf(Writable);
    });

    it('ignores empty line.', done=> {
        const newStream = new PassThrough();
        const transformer = newStream.pipe(new GameProtocolReadTransformer);
        const buf = Buffer.from("abc:cc\n\n\n:gg\n\n");
        const fn = jest.fn();

        newStream.write(buf);
        transformer.on('data', fn);

        transformer.on('end', ()=>{
            try{
                expect(fn).toBeCalledTimes(2);
                expect(fn).toHaveBeenNthCalledWith(1,"abc:cc");
                expect(fn).toHaveBeenNthCalledWith(2,":gg");
                done()
            }catch(e){
                done(e);
            }
        });

        newStream.end();
    });

    test('can receive 3 lines of good data.', done => {
        const newStream = new PassThrough();
        const transformer = newStream.pipe(new GameProtocolReadTransformer);
        const fn = jest.fn();


        transformer.on('data',fn);
        newStream.write("abc:JOIN\n");
        newStream.write(":MAP 2 2 hello game gg yes\n");
        newStream.write("c:LEAVE\n");

        transformer.on('end', ()=>{
            try{
                expect(fn).toBeCalledTimes(3);
                expect(fn).toHaveBeenNthCalledWith(1,"abc:JOIN");
                expect(fn).toHaveBeenNthCalledWith(2,":MAP 2 2 hello game gg yes");
                expect(fn).toHaveBeenNthCalledWith(3,"c:LEAVE");
                done()
            }catch(e){
                done(e);
            }
        });
        newStream.end();
    });

    test('consumes a huge chunks of data without ending delimiter.', done => {
        const newStream = new PassThrough();
        const transformer = newStream.pipe(new GameProtocolReadTransformer);
        const fn = jest.fn();


        transformer.on('data',fn);
        transformer.on('close',()=>done());
        newStream.write("abc:JOIN\n:MAP 2 2 hello game gg yes\n\n\nc:LEAVE\n:gg");
        newStream.end();
        transformer.once('end', ()=>{
            try{
                expect(fn).toBeCalledTimes(3);
                expect(fn).toHaveBeenNthCalledWith(1,"abc:JOIN");
                expect(fn).toHaveBeenNthCalledWith(2,":MAP 2 2 hello game gg yes");
                expect(fn).toHaveBeenNthCalledWith(3,"c:LEAVE");
                done();
            }catch(e){
                done(e);
            }
        });
    });

    it('consume a huge chunk of data with ending delimiter.',done=>{
        const newStream = new PassThrough();
        const transformer = newStream.pipe(new GameProtocolReadTransformer);
        const fn = jest.fn();


        transformer.on('data',fn);
        transformer.on('close',()=>done());
        newStream.write("abc:JOIN\n:MAP 2 2 hello game gg yes\n\n\nc:LEAVE\n:gg");
        newStream.write('\n');
        newStream.end();

        transformer.on('end', ()=>{
            try{
                expect(fn).toBeCalledTimes(4);
                expect(fn).toHaveBeenNthCalledWith(1,"abc:JOIN");
                expect(fn).toHaveBeenNthCalledWith(2,":MAP 2 2 hello game gg yes");
                expect(fn).toHaveBeenNthCalledWith(3,"c:LEAVE");
                expect(fn).toHaveBeenNthCalledWith(4,":gg");
                done()
            }catch(e){
                done(e);
            }
        });
    });


});

describe('Test ProtoStream.',()=>{
    it('constructs.', ()=>{
        const mockTcp = new PassThrough();
        ProtoStream(mockTcp,mockTcp);
    });

    it('can be read.',done=>{
        const writable = new PassThrough();
        const readable = new PassThrough();
        const mockTcp = new duplexify(writable, readable);
        const transformer = new ProtoStream(mockTcp);

        const fn = jest.fn();

        transformer.on('data',fn);

        readable.write("abc:JOIN\n");
        readable.write(":MAP 2 2 hello game gg yes\n");
        readable.write("c:LEAVE\n");

        transformer.on('end', ()=>{
            try{
                expect(fn).toBeCalledTimes(3);
                expect(fn).toHaveBeenNthCalledWith(1,"abc:JOIN");
                expect(fn).toHaveBeenNthCalledWith(2,":MAP 2 2 hello game gg yes");
                expect(fn).toHaveBeenNthCalledWith(3,"c:LEAVE");
                done()
            }catch(e){
                done(e);
            }
        });
        readable.end();
    });

    it('can be read.',done=>{
        const writable = new PassThrough();
        const readable = new PassThrough();
        const mockTcp = new duplexify(writable, readable);
        const transformer = new ProtoStream(mockTcp);

        const fn = jest.fn();

        writable.on('data',fn);

        transformer.write("abc:JOIN");
        transformer.write(":MAP 2 2 hello game gg yes");
        transformer.write("c:LEAVE");

        writable.on('end', ()=>{
            try{
                expect(fn).toBeCalledTimes(3);
                expect(fn).toHaveBeenNthCalledWith(1,Buffer.from("abc:JOIN\n"));
                expect(fn).toHaveBeenNthCalledWith(2,Buffer.from(":MAP 2 2 hello game gg yes\n"));
                expect(fn).toHaveBeenNthCalledWith(3,Buffer.from("c:LEAVE\n"));
                done()
            }catch(e){
                done(e);
            }
        });
        transformer.end();
    });

    it('can be written to.',done=>{
        const writable = new PassThrough();
        const readable = new PassThrough();
        const mockTcp = new duplexify(writable, readable);
        const transformer = new ProtoStream(mockTcp);

        const fn = jest.fn();

        transformer.on('data',fn);

        readable.write("abc:JOIN\n");
        readable.write(":MAP 2 2 hello game gg yes\n");
        readable.write("c:LEAVE\n");

        transformer.on('end', ()=>{
            try{
                expect(fn).toBeCalledTimes(3);
                expect(fn).toHaveBeenNthCalledWith(1,"abc:JOIN");
                expect(fn).toHaveBeenNthCalledWith(2,":MAP 2 2 hello game gg yes");
                expect(fn).toHaveBeenNthCalledWith(3,"c:LEAVE");
                done()
            }catch(e){
                done(e);
            }
        });
        readable.end();
    });
});
