const fs = require('fs')
const path = require('path')

module.exports = {
  compressFileThenUpload: function(projectId, keyFilename, bucketName, filename)
  {
    fs.existsSync(filename) && fs.access(filename, fs.constants.R_OK, (err) => {
      if (err) {
        console.log(filename + ' is not readable!')
      } else {
        const zlib = require('zlib')
        const gzip = zlib.createGzip()
        const inp = fs.createReadStream(filename)
        const compressed_filename = filename + '.gz'
        const out = fs.createWriteStream(compressed_filename)

        console.log('Compressing `' + filename + '\'...')
        inp.pipe(gzip).pipe(out)
        out.on('close', () => {
          console.log('Compressed file is `' + compressed_filename + '\'.')
          fs.unlinkSync(filename)
          console.log('Deleted `' + filename + '\'.')
          this.uploadFile(projectId, keyFilename, bucketName, compressed_filename)
        })
      }
    })
  },

  uploadFile: function(projectId, keyFilename, bucketName, filename) {
    const {Storage} = require('@google-cloud/storage')
    const storage = new Storage({
      projectId: projectId,
      keyFilename: path.resolve(__dirname, keyFilename)
    })

    const uploadFilename = path.basename(filename)

    storage
      .bucket(bucketName)
      .upload(filename)
      .then(() => {
        console.log(`${filename} is uploaded.`)
        fs.unlinkSync(filename)
        console.log(`${filename} is deleted.`)
        this.makePublic(storage, bucketName, uploadFilename)
      })
      .catch(err => {
        console.error('ERROR:', err)
      })
  },

  makePublic: function(storage, bucketName, uploadFilename) {
    storage
      .bucket(bucketName)
      .file(uploadFilename)
      .makePublic()
      .then(() => {
        console.log(`${uploadFilename} is maked public.`)
        this.deleteOldestFile(storage, bucketName)
      })
      .catch(err => {
        console.error('ERROR:', err)
      })
  },

  deleteOldestFile: function(storage, bucketName) {
    storage
      .bucket(bucketName)
      .getFiles()
      .then(async (results) => {
        let arr = []
        let i = 0
        const files = results[0]
        for (let file of files) {
          //console.error('' + i + ' ' + file.name)
          const [m] = await file.getMetadata()
          arr[i++] = {name: file.name, updated: new Date(m.updated)}
        }
        // sort by updated, newer first
        arr.sort((a, b) => {
          if (a.updated < b.updated) return 1;
          if (a.updated > b.updated) return -1;
          return 0;
        })

        // for (let a of arr) {
        //   console.log('' + a.updated + ' ' + a.name)
        // }
        let to_be_deleted = arr.slice(5)
        for (let a of to_be_deleted) {
          storage
          .bucket(bucketName)
          .file(a.name)
          .delete()
          .then(() => {
            console.log(a.name + ' deleted.')
          })
          .catch(err => {
            console.error('ERROR:', err);
          });
          //console.log('' + a.updated + ' ' + a.name)
        }
      })
      .catch(err => {
        console.error('ERROR:', err)
      })
  }
};
