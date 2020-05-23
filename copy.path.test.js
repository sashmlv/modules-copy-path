'use strict';

const path = require( 'path' ),
   fs = require( 'fs' ),
   TMP = path.resolve( `${ __dirname }/tmp` ),
   shell = require( 'shelljs' ),
   test = require( 'ava' ),
   sinon = require( 'sinon' ),
   rewire = require( 'rewire' ),
   { exists } = require( 'maintenance' ),
   mod = rewire( './index' ),
   {
      copyPath,
   } = mod,
   copyFile = sinon.spy( mod.__get__( 'copyFile' ));

mod.__set__( 'copyFile', copyFile );
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
   copyFile.resetHistory();
});

test.serial.after( t => shell.rm( '-rf', TMP ));

test( `params should contan 'from' parameter`, async t => {

   const params = {},
      error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'EMPTY_FROM' );
   t.deepEqual( copyFile.callCount, 0 );
});

test( `params should contan 'to' parameter`, async t => {

   const params = { from: '/tmp' },
      error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'EMPTY_TO' );
   t.deepEqual( copyFile.callCount, 0 );
});

test( `error if 'from' path not exists`, async t => {

   const params = {
         from: `${ TMP }/not-exists`,
         to: `${ TMP }/test-to`
      },
      error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'FROM_NOT_EXISTS' );
   t.deepEqual( copyFile.callCount, 0 );
});

test( `copy file into exists file whithout force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
      to = path.resolve( `${ TMP }/test-to/file_2` );

   const params = { force: false, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content' ).to( from );
   shell.touch( to );
   shell.ShellString( 'file_2 content' ).to( to );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   t.deepEqual( shell.cat( from ).stdout, 'file_1 content' );
   t.deepEqual( shell.cat( to ).stdout, 'file_2 content' );

   const error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( shell.cat( to ).stdout, 'file_2 content' );
   t.deepEqual( error.code, 'DEST_FILE_EXISTS' );
   t.deepEqual( copyFile.callCount, 0 );
});

test( `copy file into exists file whith force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
      to = path.resolve( `${ TMP }/test-to/file_2` );

   const params = { force: true, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );
   shell.touch( to );
   shell.ShellString( 'file_2 content').to( to );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   t.deepEqual( shell.cat( from ).stdout, 'file_1 content' );
   t.deepEqual( shell.cat( to ).stdout, 'file_2 content' );

   await copyPath( params );

   t.deepEqual( shell.cat( to ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy file into exists dir, into exist place, without force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
      to = path.resolve( `${ TMP }/test-to/` ),
      takenTo = path.resolve( `${ to }/file_1` );

   const params = { force: false, from, to, };

   shell.touch( from );
   shell.touch( takenTo );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( takenTo ), true );

   const toStat = fs.lstatSync( takenTo );

   t.deepEqual( toStat.isFile(), true );

   const error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'DEST_EXISTS' );
   t.deepEqual( copyFile.callCount, 0 );
});

test( `copy file into exists clear dir`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
      to = path.resolve( `${ TMP }/test-to/` );

   const params = { force: false, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isDirectory(), true );

   await copyPath( params );

   t.deepEqual( shell.cat( path.resolve( `${ to }/file_1` )).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy file into exists dir, into exist place taken with file, with force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
      to = path.resolve( `${ TMP }/test-to/` ),
      takenTo = path.resolve( `${ to }/file_1` );

   const params = { force: true, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );
   shell.touch( takenTo );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( takenTo ), true );

   const toStat = fs.lstatSync( takenTo );

   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( takenTo ).stdout, '' );

   await copyPath( params );

   t.deepEqual( shell.cat( takenTo ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy file into exists dir, into exist place taken with dir, with force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
      to = path.resolve( `${ TMP }/test-to/` ),
      takenTo = path.resolve( `${ to }/file_1` );

   const params = { force: true, from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );
   shell.mkdir( takenTo );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( takenTo ), true );

   const toStat = fs.lstatSync( takenTo );

   t.deepEqual( toStat.isDirectory(), true );

   await copyPath( params );

   t.deepEqual( shell.cat( takenTo ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy file into not exists dir, without slash at end`, async t => {

   const from = path.resolve( `${ TMP }/test-from/file_1` ),
      to = path.resolve( `${ TMP }/test-to/test` );

   const params = { from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), false );

   await copyPath( params );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( to ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy file into not exists dir, with slash at end`, async t => {

   const from = path.resolve( `${ TMP }/test-from/test_1` ),
      fromFile = path.resolve( `${ TMP }/test-from/test_1/file_1` ),
      to = `${ path.resolve( `${ TMP }/test-to/test_1/test_2/test_3` )}${ path.sep }`,
      toFile = path.resolve( `${ to }/file_1` );

   const params = { from: fromFile, to, };

   shell.mkdir( from );
   shell.touch( fromFile );
   shell.ShellString( 'file_1 content').to( fromFile );

   t.deepEqual( await exists( fromFile ), true );
   t.deepEqual( await exists( to ), false );

   await copyPath( params );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isDirectory(), true );
   t.deepEqual( shell.cat( toFile ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy dir into into exists file, without force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/test_1/` ),
      to = path.resolve( `${ TMP }/test-to/test_1` );

   const params = { from, to, };

   shell.mkdir( from );
   shell.touch( to );
   shell.ShellString( 'test_1 content').to( to );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );

   let toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( to ).stdout, 'test_1 content' );

   const error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'DEST_EXISTS' );

   toStat = fs.lstatSync( to );
   t.deepEqual( toStat.isFile(), true );
   t.deepEqual( shell.cat( to ).stdout, 'test_1 content' );
   t.deepEqual( copyFile.callCount, 0 );
});

test( `copy dir into exists file, with force`, async t => {

   const from = path.resolve( `${ TMP }/test-from/test_1/` ),
      fromFile = path.resolve( `${ TMP }/test-from/test_1/file_1` ),
      to = path.resolve( `${ TMP }/test-to/test_1` ),
      toFile = path.resolve( `${ TMP }/test-to/test_1/file_1` );

   const params = { force: true, from, to, };

   shell.mkdir( from );
   shell.touch( fromFile );
   shell.ShellString( 'file_1 content').to( fromFile );
   shell.touch( to );

   t.deepEqual( await exists( fromFile ), true );
   t.deepEqual( await exists( to ), true );

   const toStat = fs.lstatSync( to );

   t.deepEqual( toStat.isFile(), true );

   await copyPath( params );

   t.deepEqual( await exists( toFile ), true );
   t.deepEqual( shell.cat( toFile ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy dir into exists dir`, async t => {

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

   const params = { from, to, };

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         shell.mkdir( paths[ i ].dir );
      }
   }

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].file ){

         shell.touch( paths[ i ].file );
         shell.ShellString( 'file content').to( paths[ i ].file );
      }
   }

   shell.mkdir( to );

   const toStat = fs.lstatSync( to );
   t.deepEqual( toStat.isDirectory(), true );

   await copyPath( params );

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         t.deepEqual(
            await exists( paths[ i ].dir.replace( 'test-from', 'test-to/test' )),
            true
         );
      }

      if( paths[ i ].file ){

         t.deepEqual(
            shell.cat( paths[ i ].file.replace( 'test-from', 'test-to/test' )).stdout,
            'file content'
         );
      }
   }
   t.deepEqual( copyFile.callCount, 3 );
});

test( `copy dir into not exists dir`, async t => {

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

   const params = { from, to, };

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         shell.mkdir( paths[ i ].dir );
      }
   }

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].file ){

         shell.touch( paths[ i ].file );
         shell.ShellString( 'file content').to( paths[ i ].file );
      }
   }

   t.deepEqual( await exists( to ), false );

   await copyPath( params );

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         t.deepEqual(
            await exists( paths[ i ].dir.replace( 'test-from', 'test-to/test' )),
            true
         );
      }

      if( paths[ i ].file ){

         t.deepEqual(
            shell.cat( paths[ i ].file.replace( 'test-from', 'test-to/test' )).stdout,
            'file content'
         );
      }
   }
   t.deepEqual( copyFile.callCount, 3 );
});

test( `copy dir with regex filter`, async t => {

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
      to = path.resolve( `${ TMP }/test-to/` );

   const fromRegex = /test-from\/test_1|test-from\/?$/,
      toRegex = /test-to\/test_1|test-to\/?$/,
      params = { filter: fromRegex, from, to, };

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         shell.mkdir( paths[ i ].dir );
      }
   }

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].file ){

         shell.touch( paths[ i ].file );
      }
   }

   await copyPath( params );

   for( let i = 0; i < paths.length; i++ ){

      const path = ( paths[ i ].dir || paths[ i ].file )
         .replace( 'test-from', 'test-to' );

      t.deepEqual(
         await exists( path ),
         toRegex.test( path )
      );
   }
   t.deepEqual( copyFile.callCount, 2 );
});

test( `copy dir with array of regex filters`, async t => {

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
      to = path.resolve( `${ TMP }/test-to/` );

   const arrFrom = [
         /test-from\/test_1/,
         /test-from\/?$/,
      ],
      arrTo = [
         /test-to\/test_1/,
         /test-to\/?$/,
      ],
      params = { filter: arrFrom, from, to, };

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         shell.mkdir( paths[ i ].dir );
      }
   }

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].file ){

         shell.touch( paths[ i ].file );
      }
   }

   await copyPath( params );

   for( let i = 0; i < paths.length; i++ ){

      const path = ( paths[ i ].dir || paths[ i ].file )
         .replace( 'test-from', 'test-to' );

      t.deepEqual(
         await exists( path ),
         Boolean( arrTo.find( r => r.test( path )))
      );
   }
   t.deepEqual( copyFile.callCount, 2 );
});

test( `copy dir with function filter`, async t => {

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
      to = path.resolve( `${ TMP }/test-to/` ),
      params = {
         filter: path => path.endsWith( '/test-from' ) || path.includes( '1' ),
         from,
         to,
      };

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         shell.mkdir( paths[ i ].dir );
      }
   }

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].file ){

         shell.touch( paths[ i ].file );
      }
   }

   await copyPath( params );

   for( let i = 0; i < paths.length; i++ ){

      const path = ( paths[ i ].dir || paths[ i ].file )
         .replace( 'test-from', 'test-to' );

      t.deepEqual(
         await exists( path ),
         path.includes( '1' ),
      );
   }
   t.deepEqual( copyFile.callCount, 2 );
});

test( `copy file whith relative path`, async t => {

   const from = `tmp/test-from/file_1`,
      to = `./tmp/test-to`,
      toFile = `./tmp/test-to/file_1`;

   const params = { from, to, };

   shell.touch( from );
   shell.ShellString( 'file_1 content').to( from );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );
   t.deepEqual( await exists( toFile ), false );
   t.deepEqual( shell.cat( from ).stdout, 'file_1 content' );

   await copyPath( params );

   t.deepEqual( shell.cat( toFile ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
});

test( `copy file whith content transform`, async t => {

   const from = `tmp/test-from/file_1`,
      to = `./tmp/test-to`,
      toFile = `./tmp/test-to/file_1`;

   const params = {

      from,
      to,
      transform: {

         find: 'some',
         replace: 'just',
      }
   };

   shell.touch( from );
   shell.ShellString( 'file_1 some content').to( from );

   t.deepEqual( await exists( from ), true );
   t.deepEqual( await exists( to ), true );
   t.deepEqual( await exists( toFile ), false );
   t.deepEqual( shell.cat( from ).stdout, 'file_1 some content' );

   await copyPath( params );

   t.deepEqual( shell.cat( toFile ).stdout, 'file_1 just content' );
   t.deepEqual( copyFile.callCount, 1 );
});
