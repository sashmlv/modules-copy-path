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
      copyFileChange,
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
   shell.mkdir( '-p', path.resolve( `${ TMP }/test-src` ));
   shell.mkdir( '-p', path.resolve( `${ TMP }/test-dest` ));
});

test.beforeEach( t => {

   shell.rm( '-rf', path.resolve( `${ TMP }/test-src/*` ));
   shell.rm( '-rf', path.resolve( `${ TMP }/test-dest/*` ));
   copyFile.resetHistory();
});

test.serial.after( t => shell.rm( '-rf', TMP ));

test( `params should contan 'src' parameter`, async t => {

   const params = {},
      error = await t.throwsAsync( copyFileChange( params ));

   t.deepEqual( error.code, 'EMPTY_SRC' );
   t.deepEqual( copyFile.callCount, 0 );
   t.deepEqual( readFile.callCount, 0 );
   t.deepEqual( writeFile.callCount, 0 );
});

test( `params should contan 'dest' parameter`, async t => {

   const params = {

         src: '/tmp'
      },
      error = await t.throwsAsync( copyFileChange( params ));

   t.deepEqual( error.code, 'EMPTY_DEST' );
   t.deepEqual( copyFile.callCount, 0 );
   t.deepEqual( readFile.callCount, 0 );
   t.deepEqual( writeFile.callCount, 0 );
});

test( `copy file without content change`, async t => {

   const params = {

      src: path.resolve( `${ TMP }/test-src/file_1` ),
      dest:   path.resolve( `${ TMP }/test-dest/file_1` ),
   };

   shell.touch( params.src );
   shell.ShellString( 'file_1 content').to( params.src );

   t.deepEqual( await exists( params.src ), true );
   t.deepEqual( await exists( params.dest ), false );

   await copyFileChange( params );

   t.deepEqual( shell.cat( params.dest ).stdout, 'file_1 content' );
   t.deepEqual( copyFile.callCount, 1 );
   t.deepEqual( readFile.callCount, 0 );
   t.deepEqual( writeFile.callCount, 0 );
});

test( `copy file with content change`, async t => {

   const params = {

      src: path.resolve( `${ TMP }/test-src/file_1` ),
      dest:   path.resolve( `${ TMP }/test-dest/file_1` ),
      change: {

         find: /file_1/,
         replace: 'new',
      },
   };

   shell.touch( params.src );
   shell.ShellString( 'file_1 content').to( params.src );

   t.deepEqual( await exists( params.src ), true );
   t.deepEqual( await exists( params.dest ), false );

   await copyFileChange( params );

   t.deepEqual( shell.cat( params.dest ).stdout, 'new content' );
   t.deepEqual( copyFile.callCount, 0 );
   t.deepEqual( readFile.callCount, 1 );
   t.deepEqual( writeFile.callCount, 1 );
});
