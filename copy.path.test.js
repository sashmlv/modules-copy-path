'use strict';

const path = require( 'path' ),
   fs = require( 'fs' ),
   TMP = path.resolve( `${ __dirname }/tmp` ),
   shell = require( 'shelljs' ),
   test = require( 'ava' ),
   sinon = require( 'sinon' ),
   rewire = require( 'rewire' ),
   { exists } = require( 'snippets' ),
   mod = rewire( './index' ),
   {
      copyPath,
   } = mod,
   copyFileChange = sinon.spy( mod.__get__( 'copyFileChange' ));

mod.__set__( 'copyFileChange', copyFileChange );
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
   copyFileChange.resetHistory();
});

test.serial.after( t => shell.rm( '-rf', TMP ));

test( `params should contan 'src' parameter`, async t => {

   const params = {},
      error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'EMPTY_SRC' );
   t.deepEqual( copyFileChange.callCount, 0 );
});

test( `params should contan 'dest' parameter`, async t => {

   const params = { src: '/tmp' },
      error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'EMPTY_DEST' );
   t.deepEqual( copyFileChange.callCount, 0 );
});

test( `error if 'src' path not exists`, async t => {

   const params = {
         src: `${ TMP }/not-exists`,
         dest: `${ TMP }/test-dest`
      },
      error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'SRC_NOT_EXISTS' );
   t.deepEqual( copyFileChange.callCount, 0 );
});

test( `copy file into exists file whithout force`, async t => {

   const src = path.resolve( `${ TMP }/test-src/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/file_2` );

   const params = { force: false, src, dest, };

   shell.touch( src );
   shell.ShellString( 'file_1 content' ).to( src );
   shell.touch( dest );
   shell.ShellString( 'file_2 content' ).to( dest );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( dest ), true );

   t.deepEqual( shell.cat( src ).stdout, 'file_1 content' );
   t.deepEqual( shell.cat( dest ).stdout, 'file_2 content' );

   const error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( shell.cat( dest ).stdout, 'file_2 content' );
   t.deepEqual( error.code, 'DEST_FILE_EXISTS' );
   t.deepEqual( copyFileChange.callCount, 0 );
});

test( `copy file into exists file whith force`, async t => {

   const src = path.resolve( `${ TMP }/test-src/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/file_2` );

   const params = { force: true, src, dest, };

   shell.touch( src );
   shell.ShellString( 'file_1 content').to( src );
   shell.touch( dest );
   shell.ShellString( 'file_2 content').to( dest );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( dest ), true );

   t.deepEqual( shell.cat( src ).stdout, 'file_1 content' );
   t.deepEqual( shell.cat( dest ).stdout, 'file_2 content' );

   await copyPath( params );

   t.deepEqual( shell.cat( dest ).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy file into exists dir, into exist place, without force`, async t => {

   const src = path.resolve( `${ TMP }/test-src/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/` ),
      takenDest = path.resolve( `${ dest }/file_1` );

   const params = { force: false, src, dest, };

   shell.touch( src );
   shell.touch( takenDest );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( takenDest ), true );

   const destStat = fs.lstatSync( takenDest );

   t.deepEqual( destStat.isFile(), true );

   const error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'DEST_EXISTS' );
   t.deepEqual( copyFileChange.callCount, 0 );
});

test( `copy file into exists clear dir`, async t => {

   const src = path.resolve( `${ TMP }/test-src/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/` );

   const params = { force: false, src, dest, };

   shell.touch( src );
   shell.ShellString( 'file_1 content').to( src );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( dest ), true );

   const destStat = fs.lstatSync( dest );

   t.deepEqual( destStat.isDirectory(), true );

   await copyPath( params );

   t.deepEqual( shell.cat( path.resolve( `${ dest }/file_1` )).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy file into exists dir, into exist place taken with file, with force`, async t => {

   const src = path.resolve( `${ TMP }/test-src/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/` ),
      takenDest = path.resolve( `${ dest }/file_1` );

   const params = { force: true, src, dest, };

   shell.touch( src );
   shell.ShellString( 'file_1 content').to( src );
   shell.touch( takenDest );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( takenDest ), true );

   const destStat = fs.lstatSync( takenDest );

   t.deepEqual( destStat.isFile(), true );
   t.deepEqual( shell.cat( takenDest ).stdout, '' );

   await copyPath( params );

   t.deepEqual( shell.cat( takenDest ).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy file into exists dir, into exist place taken with dir, with force`, async t => {

   const src = path.resolve( `${ TMP }/test-src/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/` ),
      takenDest = path.resolve( `${ dest }/file_1` );

   const params = { force: true, src, dest, };

   shell.touch( src );
   shell.ShellString( 'file_1 content').to( src );
   shell.mkdir( takenDest );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( takenDest ), true );

   const destStat = fs.lstatSync( takenDest );

   t.deepEqual( destStat.isDirectory(), true );

   await copyPath( params );

   t.deepEqual( shell.cat( takenDest ).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy file into not exists dir, without slash at end`, async t => {

   const src = path.resolve( `${ TMP }/test-src/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/test` );

   const params = { src, dest, };

   shell.touch( src );
   shell.ShellString( 'file_1 content').to( src );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( dest ), false );

   await copyPath( params );

   const destStat = fs.lstatSync( dest );

   t.deepEqual( destStat.isFile(), true );
   t.deepEqual( shell.cat( dest ).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy file into not exists dir, with slash at end`, async t => {

   const src = path.resolve( `${ TMP }/test-src/test_1` ),
      srcFile = path.resolve( `${ TMP }/test-src/test_1/file_1` ),
      dest = `${ path.resolve( `${ TMP }/test-dest/test_1/test_2/test_3` )}${ path.sep }`,
      destFile = path.resolve( `${ dest }/file_1` );

   const params = { src: srcFile, dest, };

   shell.mkdir( src );
   shell.touch( srcFile );
   shell.ShellString( 'file_1 content').to( srcFile );

   t.deepEqual( await exists( srcFile ), true );
   t.deepEqual( await exists( dest ), false );

   await copyPath( params );

   const destStat = fs.lstatSync( dest );

   t.deepEqual( destStat.isDirectory(), true );
   t.deepEqual( shell.cat( destFile ).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy dir into into exists file, without force`, async t => {

   const src = path.resolve( `${ TMP }/test-src/test_1/` ),
      dest = path.resolve( `${ TMP }/test-dest/test_1` );

   const params = { src, dest, };

   shell.mkdir( src );
   shell.touch( dest );
   shell.ShellString( 'test_1 content').to( dest );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( dest ), true );

   let destStat = fs.lstatSync( dest );

   t.deepEqual( destStat.isFile(), true );
   t.deepEqual( shell.cat( dest ).stdout, 'test_1 content' );

   const error = await t.throwsAsync( copyPath( params ));

   t.deepEqual( error.code, 'DEST_EXISTS' );

   destStat = fs.lstatSync( dest );
   t.deepEqual( destStat.isFile(), true );
   t.deepEqual( shell.cat( dest ).stdout, 'test_1 content' );
   t.deepEqual( copyFileChange.callCount, 0 );
});

test( `copy dir into exists file, with force`, async t => {

   const src = path.resolve( `${ TMP }/test-src/test_1/` ),
      srcFile = path.resolve( `${ TMP }/test-src/test_1/file_1` ),
      dest = path.resolve( `${ TMP }/test-dest/test_1` ),
      destFile = path.resolve( `${ TMP }/test-dest/test_1/file_1` );

   const params = { force: true, src, dest, };

   shell.mkdir( src );
   shell.touch( srcFile );
   shell.ShellString( 'file_1 content').to( srcFile );
   shell.touch( dest );

   t.deepEqual( await exists( srcFile ), true );
   t.deepEqual( await exists( dest ), true );

   const destStat = fs.lstatSync( dest );

   t.deepEqual( destStat.isFile(), true );

   await copyPath( params );

   t.deepEqual( await exists( destFile ), true );
   t.deepEqual( shell.cat( destFile ).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy dir into exists dir`, async t => {

   const paths = [

         { dir: path.resolve( `${ TMP }/test-src/test_1/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_1/test_11` )},
         { dir: path.resolve( `${ TMP }/test-src/test_2/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_3/` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/file_1` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/test_11/file_11` )},
         { file: path.resolve( `${ TMP }/test-src/test_2/file_2` )},
      ],
      src = path.resolve( `${ TMP }/test-src/` ),
      dest = path.resolve( `${ TMP }/test-dest/test/` );

   const params = { src, dest, };

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

   shell.mkdir( dest );

   const destStat = fs.lstatSync( dest );
   t.deepEqual( destStat.isDirectory(), true );

   await copyPath( params );

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         t.deepEqual(
            await exists( paths[ i ].dir.replace( 'test-src', 'test-dest/test' )),
            true
         );
      }

      if( paths[ i ].file ){

         t.deepEqual(
            shell.cat( paths[ i ].file.replace( 'test-src', 'test-dest/test' )).stdout,
            'file content'
         );
      }
   }
   t.deepEqual( copyFileChange.callCount, 3 );
});

test( `copy dir into not exists dir`, async t => {

   const paths = [

         { dir: path.resolve( `${ TMP }/test-src/test_1/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_1/test_11` )},
         { dir: path.resolve( `${ TMP }/test-src/test_2/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_3/` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/file_1` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/test_11/file_11` )},
         { file: path.resolve( `${ TMP }/test-src/test_2/file_2` )},
      ],
      src = path.resolve( `${ TMP }/test-src/` ),
      dest = path.resolve( `${ TMP }/test-dest/test` );

   const params = { src, dest, };

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

   t.deepEqual( await exists( dest ), false );

   await copyPath( params );

   for( let i = 0; i < paths.length; i++ ){

      if( paths[ i ].dir ){

         t.deepEqual(
            await exists( paths[ i ].dir.replace( 'test-src', 'test-dest/test' )),
            true
         );
      }

      if( paths[ i ].file ){

         t.deepEqual(
            shell.cat( paths[ i ].file.replace( 'test-src', 'test-dest/test' )).stdout,
            'file content'
         );
      }
   }
   t.deepEqual( copyFileChange.callCount, 3 );
});

test( `copy dir with regex filter`, async t => {

   const paths = [

         { dir: path.resolve( `${ TMP }/test-src/test_1/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_1/test_11` )},
         { dir: path.resolve( `${ TMP }/test-src/test_2/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_3/` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/file_1` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/test_11/file_11` )},
         { file: path.resolve( `${ TMP }/test-src/test_2/file_2` )},
      ],
      src = path.resolve( `${ TMP }/test-src/` ),
      dest = path.resolve( `${ TMP }/test-dest/` );

   const srcRegex = /test-src\/test_1|test-src\/?$/,
      destRegex = /test-dest\/test_1|test-dest\/?$/,
      params = { filter: srcRegex, src, dest, };

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
         .replace( 'test-src', 'test-dest' );

      t.deepEqual(
         await exists( path ),
         destRegex.test( path )
      );
   }
   t.deepEqual( copyFileChange.callCount, 2 );
});

test( `copy dir with array of regex filters`, async t => {

   const paths = [

         { dir: path.resolve( `${ TMP }/test-src/test_1/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_1/test_11` )},
         { dir: path.resolve( `${ TMP }/test-src/test_2/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_3/` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/file_1` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/test_11/file_11` )},
         { file: path.resolve( `${ TMP }/test-src/test_2/file_2` )},
      ],
      src = path.resolve( `${ TMP }/test-src/` ),
      dest = path.resolve( `${ TMP }/test-dest/` );

   const arrSrc = [
         /test-src\/test_1/,
         /test-src\/?$/,
      ],
      arrDest = [
         /test-dest\/test_1/,
         /test-dest\/?$/,
      ],
      params = { filter: arrSrc, src, dest, };

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
         .replace( 'test-src', 'test-dest' );

      t.deepEqual(
         await exists( path ),
         Boolean( arrDest.find( r => r.test( path )))
      );
   }
   t.deepEqual( copyFileChange.callCount, 2 );
});

test( `copy dir with function filter`, async t => {

   const paths = [

         { dir: path.resolve( `${ TMP }/test-src/test_1/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_1/test_11` )},
         { dir: path.resolve( `${ TMP }/test-src/test_2/` )},
         { dir: path.resolve( `${ TMP }/test-src/test_3/` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/file_1` )},
         { file: path.resolve( `${ TMP }/test-src/test_1/test_11/file_11` )},
         { file: path.resolve( `${ TMP }/test-src/test_2/file_2` )},
      ],
      src = path.resolve( `${ TMP }/test-src/` ),
      dest = path.resolve( `${ TMP }/test-dest/` ),
      params = {
         filter: path => path.endsWith( '/test-src' ) || path.includes( '1' ),
         src,
         dest,
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
         .replace( 'test-src', 'test-dest' );

      t.deepEqual(
         await exists( path ),
         path.includes( '1' ),
      );
   }
   t.deepEqual( copyFileChange.callCount, 2 );
});

test( `copy file whith relative path`, async t => {

   const src = `tmp/test-src/file_1`,
      dest = `./tmp/test-dest`,
      destFile = `./tmp/test-dest/file_1`;

   const params = { src, dest, };

   shell.touch( src );
   shell.ShellString( 'file_1 content').to( src );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( dest ), true );
   t.deepEqual( await exists( destFile ), false );
   t.deepEqual( shell.cat( src ).stdout, 'file_1 content' );

   await copyPath( params );

   t.deepEqual( shell.cat( destFile ).stdout, 'file_1 content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});

test( `copy file whith content change`, async t => {

   const src = `tmp/test-src/file_1`,
      dest = `./tmp/test-dest`,
      destFile = `./tmp/test-dest/file_1`;

   const params = {

      src,
      dest,
      change: {

         find: 'some',
         replace: 'just',
      }
   };

   shell.touch( src );
   shell.ShellString( 'file_1 some content').to( src );

   t.deepEqual( await exists( src ), true );
   t.deepEqual( await exists( dest ), true );
   t.deepEqual( await exists( destFile ), false );
   t.deepEqual( shell.cat( src ).stdout, 'file_1 some content' );

   await copyPath( params );

   t.deepEqual( shell.cat( destFile ).stdout, 'file_1 just content' );
   t.deepEqual( copyFileChange.callCount, 1 );
});
