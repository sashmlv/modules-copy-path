'use strict';

const fs    = require( 'fs' ),
      util  = require( 'util' ),
      { COPYFILE_EXCL } = fs.constants,
      path  = require( 'path' ),
      {log, exists} = require( 'maintenance' ),
      ModuleError = require( 'module-error' ),
      copyFile = util.promisify( fs.copyFile ),
      unlink = util.promisify( fs.unlink ),
      rmdir = util.promisify( fs.rmdir ),
      mkdir = util.promisify( fs.mkdir ),
      readdir = util.promisify( fs.readdir ),
      lstat = util.promisify( fs.lstat );

/**
 * Copy path, with optional content translate
 * TODO: content transform in file
 * @param {string} from
 * @param {string} to
 * @param {regex|function} filter - filter for copying paths
 * @param {boolean} force - overwrite files
 * @param {boolean} log
 * @param {boolean} dry - do not copy files (for testing)
 * @return {undefined} Return removed paths
 **/
async function copyPath( opts = {}) {

   try {

      const { from, to, filter, force, silent, log, dry, } = opts;

      /* check params */
      switch ( true ) {

      case ! from:

         throw new ModuleError({ message: `Please provide 'from' path, provided: ${ from }`, code: 'EMPTY_FROM', });

      case typeof from !== 'string':

         throw new ModuleError({ message: `Parameter 'from' must to be a string, provided: ${ typeof from }`, code: 'NOT_VALID_FROM', });

      case ! to:

         throw new ModuleError({ message: `Please provide 'to' path, provided: ${ from }`, code: 'EMPTY_TO', });

      case typeof to !== 'string':

         throw new ModuleError({ message: `Parameter 'to' must to be a string, provided: ${ typeof to }`, code: 'NOT_VALID_TO', });
      }

      let fromExists = await exists( from ),
          fromIsDir,
          fromIsFile,
          toExists   = await exists( to ),
          toIsDir,
          toIsFile,
          toHasLastSlash = ( typeof to === 'string' ) && ( to.slice( -1 ) === '/' );

      if( fromExists ) {

         const fromStat = await lstat( from );
         fromIsDir  = fromStat.isDirectory();
         fromIsFile = fromStat.isFile();
      }

      if( toExists ) {

         const toStat = await lstat( to );
         toIsDir  = toStat.isDirectory();
         toIsFile = toStat.isFile();
      }

      /* module logic */
      switch ( true ) {

      case ! fromExists:

         throw new ModuleError({ message: `Path 'from' not exists: ${ from }`, code: 'FROM_NOT_EXISTS', });
         break;

      case fromIsFile && toIsFile && ! force:

         throw new ModuleError({ message: `Destination file already exists: ${ to }`, code: 'DEST_FILE_EXISTS', });
         break;

      case fromIsFile && toIsFile && force:

         await unlink( to );
         await copyFile( from, to );
         break;

      case fromIsFile && toIsDir && ! force: {

         const toPath = path.resolve( `${ to }/${ path.basename( from )}` );

         if( await exists( toPath )){

            throw new ModuleError({ message: `Destination already exists: ${ toPath }`, code: 'DEST_EXISTS', });
         };

         await copyFile( from, toPath );
         break;
      };

      case fromIsFile && toIsDir && force: {

         const toPath = path.resolve( `${ to }/${ path.basename( from )}` );

         if( await exists( toPath )){

            const toPathStat = await lstat( toPath );

            if( toPathStat.isDirectory()){

               await rmdir( toPath );
            }
            else if( toPathStat.isFile()){

               await unlink( toPath );
            };
         };

         await copyFile( from, toPath );
         break;
      };

      case fromIsFile && ! toExists && ! toHasLastSlash:

         await copyFile( from, to );
         break;

      case fromIsFile && ! toExists && toHasLastSlash: {

         const toPath = path.resolve( `${ to }/${ path.basename( from )}` );
         await mkdir( to, { recursive: true });
         await copyFile( from, toPath );
         break;
      };
      case fromIsDir && toIsFile && ! force:

         throw new ModuleError({ message: `Destination already exists: ${ to }`, code: 'DEST_EXISTS', });
         break;

      case fromIsDir && toIsFile && force: {

         await unlink( to );
         await mkdir( to, { recursive: true });

         const paths = ( await readdir( from ))
               .map( v => path.resolve( `${ from }/${ v }` ));

         for( let i = 0; i < paths.length; i++ ) {

            await copyPath( Object.assign({}, opts, {

               from: paths[ i ]
            }));
         };
         break;
      };
      case fromIsDir && toIsDir: {

         const paths = ( await readdir( from ))
               .map( v => path.resolve( `${ from }/${ v }` ));

         /* copy each path separately */
         for( let i = 0; i < paths.length; i++ ){

            const pathStat = await lstat( paths[ i ]);

            if( pathStat.isDirectory()){

               const toPath = path.resolve( `${ to }/${ path.basename( paths[ i ])}` );

               /* create directory if no exists in target dir */
               if( ! await exists( toPath )) {

                  await mkdir( toPath, { recursive: true });
               }

               /* copy into exists nested directory */
               await copyPath( Object.assign({}, opts, {

                  from: paths[ i ],
                  to: toPath,
               }));
            }
            else if( pathStat.isFile()){

               await copyPath( Object.assign({}, opts, {

                  from: paths[ i ],
               }));
            };
         };
         break;
      };
      case fromIsDir && ! toExists && ! toHasLastSlash:
      case fromIsDir && ! toExists && toHasLastSlash:
      }
   }
   catch( e ) {

      log.red( e );
      throw e;
   }
}

module.exports = {

   copyPath
};
