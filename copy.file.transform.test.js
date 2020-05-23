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
      copyFileTransform,
   } = mod,
   copyFile  = sinon.spy( mod.__get__( 'copyFile' )),
   readFile  = sinon.spy( mod.__get__( 'readFile' )),
   writeFile = sinon.spy( mod.__get__( 'writeFile' ));

mod.__set__( 'copyFile',  copyFile );
mod.__set__( 'readFile',  readFile );
mod.__set__( 'writeFile', writeFile );
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
      error = await t.throwsAsync( copyFileTransform( params ));

   t.deepEqual( error.code, 'EMPTY_FROM' );
   t.deepEqual( copyFile.callCount, 0 );
   t.deepEqual( readFile.callCount, 0 );
   t.deepEqual( writeFile.callCount, 0 );
});

test( `params should contan 'to' parameter`, async t => {

   const params = {

         from: '/tmp'
      },
      error = await t.throwsAsync( copyFileTransform( params ));

   t.deepEqual( error.code, 'EMPTY_TO' );
   t.deepEqual( copyFile.callCount, 0 );
   t.deepEqual( readFile.callCount, 0 );
   t.deepEqual( writeFile.callCount, 0 );
});

test( `copy file without content transform`, async t => {

   const params = {

      from: path.resolve( `${ TMP }/test-from/file_1` ),
      to:   path.resolve( `${ TMP }/test-to/file_1` ),
   };

   shell.touch( params.from );
   shell.ShellString( 'file_1 content').to( params.from );

   t.deepEqual( await exists( params.from ), true );
   t.deepEqual( await exists( params.to ), false );

   await copyFileTransform( params );

   t.deepEqual( shell.cat( params.to ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
   t.deepEqual( readFile.callCount, 0 );
   t.deepEqual( writeFile.callCount, 0 );
});

test( `copy file with content transform`, async t => {

   const params = {

      from: path.resolve( `${ TMP }/test-from/file_1` ),
      to:   path.resolve( `${ TMP }/test-to/file_1` ),
      transform: {

         find: /file_1/,
         replace: 'new',
      },
   };

   shell.touch( params.from );
   shell.ShellString( 'file_1 content').to( params.from );

   t.deepEqual( await exists( params.from ), true );
   t.deepEqual( await exists( params.to ), false );

   await copyFileTransform( params );

   t.deepEqual( shell.cat( params.to ).stdout, 'new content' );
   t.deepEqual( copyFile.callCount, 0 );
   t.deepEqual( readFile.callCount, 1 );
   t.deepEqual( writeFile.callCount, 1 );
});
