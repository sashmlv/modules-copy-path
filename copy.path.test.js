'use strict';

const path = require( 'path' ),
      fs = require( 'fs' ),
      TMP = path.resolve( `${ __dirname }/tmp` ),
      shell = require( 'shelljs' ),
      test = require( 'ava' ),
      sinon = require( 'sinon' ),
      rewire = require( 'rewire' ),
      {exists} = require( 'maintenance' ),
      mod = rewire( './index' ),
      {
         copyPath
      } = mod;

mod.__set__( 'log', { // disable logger
   red: _=>_,
});

test.before( t => {

   shell.rm( '-rf', TMP );
   shell.mkdir( '-p', TMP );
   shell.mkdir( '-p', path.resolve( `${ TMP }/test-from` ));
   shell.mkdir( '-p', path.resolve( `${ TMP }/test-to` ));
});

test.beforeEach( t => {

   shell.rm( '-rf', path.resolve( `${ TMP }/test-from/*` ));
   shell.rm( '-rf', path.resolve( `${ TMP }/test-to/*` ));
});

// test.serial.after( t => shell.rm( '-rf', TMP ));

test( `1. opts should contan 'from' option`, async t => {

   const opts = {},
         error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( error.code, 'EMPTY_FROM' );
});


test( `2. option 'from' must to be a string`, async t => {

   const opts = { from: [ 'data' ]},
         error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( error.code, 'NOT_VALID_FROM' );
});


test( `3. opts should contan 'to' option`, async t => {

   const opts = { from: '/tmp' },
         error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( error.code, 'EMPTY_TO' );
});


test( `4. option 'to' must to be a string`, async t => {

   const opts = { from: 'data', to: [ 'data' ]},
         error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( error.code, 'NOT_VALID_TO' );
});


test( `5. error if 'from' path not exists`, async t => {

   const opts = {
      from: `${ TMP }/not-exists`,
      to: `${ TMP }/test-to`
   },
         error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( error.code, 'FROM_NOT_EXISTS' );
});


test( `6. copy file into exists file whithout force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
         to = path.resolve( `${ TMP }/test-to/file_2` );

   const opts = { force: false, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content' ).to( from );
   shell.touch( to );
   shell.ShellString( 'file_2 content' ).to( to );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   t.deepEqual( shell.cat( from ).stdout, 'file_1 content' );
   t.deepEqual( shell.cat( to ).stdout, 'file_2 content' );

   const error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( shell.cat( to ).stdout, 'file_2 content' );
   t.deepEqual( error.code, 'DEST_FILE_EXISTS' );
});


test( `7. copy file into exists file whith force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
         to = path.resolve( `${ TMP }/test-to/file_2` );

   const opts = { force: true, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );
   shell.touch( to );
   shell.ShellString( 'file_2 content').to( to );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   t.deepEqual( shell.cat( from ).stdout, 'file_1 content' );
   t.deepEqual( shell.cat( to ).stdout, 'file_2 content' );

   await copyPath( opts );

   t.deepEqual( shell.cat( to ).stdout, 'file_1 content' );
});


test( `8. copy file into exists dir, into exist place, without force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
         to = path.resolve( `${ TMP }/test-to/` ),
         takenTo = path.resolve( `${ to }/file_1` );

   const opts = { force: false, from, to, };

   shell.touch( from );
   shell.touch( takenTo );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( takenTo ), true );

   const toStat = fs.lstatSync( takenTo );

   t.deepEqual( toStat.isFile(), true );

   const error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( error.code, 'DEST_EXISTS' );
});


test( `9. copy file into exists clear dir`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
         to = path.resolve( `${ TMP }/test-to/` );

   const opts = { force: false, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isDirectory(), true );

   await copyPath( opts );

   t.deepEqual( shell.cat( path.resolve( `${ to }/file_1` )).stdout, 'file_1 content' );
});


test( `10. copy file into exists dir, into exist place taken with file, with force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
         to = path.resolve( `${ TMP }/test-to/` ),
         takenTo = path.resolve( `${ to }/file_1` );

   const opts = { force: true, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );
   shell.touch( takenTo );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( takenTo ), true );

   const toStat = fs.lstatSync( takenTo );

   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( takenTo ).stdout, '' );

   await copyPath( opts );

   t.deepEqual( shell.cat( takenTo ).stdout, 'file_1 content' );
});


test( `11. copy file into exists dir, into exist place taken with dir, with force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
         to = path.resolve( `${ TMP }/test-to/` ),
         takenTo = path.resolve( `${ to }/file_1` );

   const opts = { force: true, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );
   shell.mkdir( takenTo );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( takenTo ), true );

   const toStat = fs.lstatSync( takenTo );

   t.deepEqual( toStat.isDirectory(), true );

   await copyPath( opts );

   t.deepEqual( shell.cat( takenTo ).stdout, 'file_1 content' );
});


test( `12. copy file into not exists dir, without slash at end`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
         to = path.resolve( `${ TMP }/test-to/test` );

   const opts = { from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), false );

   await copyPath( opts );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( to ).stdout, 'file_1 content' );
});


test( `13. copy file into not exists dir, with slash at end`, async t => {

   const from = path.resolve( `${ TMP }/test-from/test_1` ),
         fromFile = path.resolve( `${ TMP }/test-from/test_1/file_1` ),
         to = `${ path.resolve( `${ TMP }/test-to/test_1/test_2/test_3` )}${ path.sep }`,
         toFile = path.resolve( `${ to }/file_1` );

   const opts = { from: fromFile, to, };

   shell.mkdir( from );
   shell.touch( fromFile );
   shell.ShellString( 'file_1 content').to( fromFile );

   t.deepEqual( await exists( fromFile ), true );
   t.deepEqual( await exists( to ), false );

   await copyPath( opts );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isDirectory(), true );
   t.deepEqual( shell.cat( toFile ).stdout, 'file_1 content' );
});


test( `14. copy dir into into exists file, without force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/test_1/` ),
         to = path.resolve( `${ TMP }/test-to/test_1` );

   const opts = { from, to, };

   shell.mkdir( from );
   shell.touch( to );
   shell.ShellString( 'test_1 content').to( to );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   let toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( to ).stdout, 'test_1 content' );

   const error = await t.throwsAsync( copyPath( opts ));

   t.deepEqual( error.code, 'DEST_EXISTS' );

   toStat = fs.lstatSync( to );
   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( to ).stdout, 'test_1 content' );
});


test( `15. copy dir into exists file, with force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/test_1/` ),
         fromFile = path.resolve( `${ TMP }/test-from/test_1/file_1` ),
         to = path.resolve( `${ TMP }/test-to/test_1` ),
         toFile = path.resolve( `${ TMP }/test-to/test_1/file_1` );

   const opts = { force: true, from, to, };

   shell.mkdir( from );
   shell.touch( fromFile );
   shell.ShellString( 'file_1 content').to( fromFile );
   shell.touch( to );

   t.deepEqual( await exists( fromFile ), true );
   t.deepEqual( await exists( to ), true );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isFile(), true );

   await copyPath( opts );

   t.deepEqual( await exists( toFile ), true );

   t.deepEqual( shell.cat( toFile ).stdout, 'file_1 content' );
});


test( `16. copy dir into exists dir`, async t => {

   const paths = [

      { dir: path.resolve( `${ TMP }/test-from/test_1/` )},
      { dir: path.resolve( `${ TMP }/test-from/test_1/test_11` )},
      { dir: path.resolve( `${ TMP }/test-from/test_2/` )},
      { dir: path.resolve( `${ TMP }/test-from/test_3/` )},
      { file: path.resolve( `${ TMP }/test-from/test_1/file_1` )},
      { file: path.resolve( `${ TMP }/test-from/test_1/test_11/file_11` )},
      { file: path.resolve( `${ TMP }/test-from/test_2/file_2` )},
   ],
         from = path.resolve( `${ TMP }/test-from/` ),
         to = path.resolve( `${ TMP }/test-to/test/` );

   const opts = { from, to, };

   for( let i = 0; i < paths.length; i++ ) {

      if( paths[ i ].dir ) {

         shell.mkdir( paths[ i ].dir );
      }
   }

   for( let i = 0; i < paths.length; i++ ) {

      if( paths[ i ].file ) {

         shell.touch( paths[ i ].file );
         shell.ShellString( 'file content').to( paths[ i ].file );
      }
   }

   shell.mkdir( to );

   const toStat = fs.lstatSync( to );
   t.deepEqual( toStat.isDirectory(), true );

   await copyPath( opts );

   for( let i = 0; i < paths.length; i++ ) {

      if( paths[ i ].dir ) {

         t.deepEqual(
            await exists( paths[ i ].dir.replace( 'test-from', 'test-to/test' )),
            true
         );
      }

      if( paths[ i ].file ) {

         t.deepEqual(
            shell.cat( paths[ i ].file.replace( 'test-from', 'test-to/test' )).stdout,
            'file content'
         );
      }
   }
});


test( `17. copy dir into not exists dir`, async t => {

   const paths = [

      { dir: path.resolve( `${ TMP }/test-from/test_1/` )},
      { dir: path.resolve( `${ TMP }/test-from/test_1/test_11` )},
      { dir: path.resolve( `${ TMP }/test-from/test_2/` )},
      { dir: path.resolve( `${ TMP }/test-from/test_3/` )},
      { file: path.resolve( `${ TMP }/test-from/test_1/file_1` )},
      { file: path.resolve( `${ TMP }/test-from/test_1/test_11/file_11` )},
      { file: path.resolve( `${ TMP }/test-from/test_2/file_2` )},
   ],
         from = path.resolve( `${ TMP }/test-from/` ),
         to = path.resolve( `${ TMP }/test-to/test` );

   const opts = { from, to, };

   for( let i = 0; i < paths.length; i++ ) {

      if( paths[ i ].dir ) {

         shell.mkdir( paths[ i ].dir );
      }
   }

   for( let i = 0; i < paths.length; i++ ) {

      if( paths[ i ].file ) {

         shell.touch( paths[ i ].file );
         shell.ShellString( 'file content').to( paths[ i ].file );
      }
   }

   t.deepEqual( await exists( to ), false );

   await copyPath( opts );

   for( let i = 0; i < paths.length; i++ ) {

      if( paths[ i ].dir ) {

         t.deepEqual(
            await exists( paths[ i ].dir.replace( 'test-from', 'test-to/test' )),
            true
         );
      }

      if( paths[ i ].file ) {

         t.deepEqual(
            shell.cat( paths[ i ].file.replace( 'test-from', 'test-to/test' )).stdout,
            'file content'
         );
      }
   }
});