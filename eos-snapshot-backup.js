#!/usr/bin/env node

/**
 * @author UMU618 <umu618@hotmail.com>
 * @copyright MEET.ONE 2019
 * @description Use npm-coding-style.
 * yarn add @google-cloud/storage
 */

'use strict'

const fetch = require('node-fetch')

const pkg = require('./package.json')
const stg = require('./storage.js')

fetch(pkg.eos_snapshot_backup.snapshot_url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
}).then(function (res) {
  if (res.ok && res.status == 201) {
    return res.json()
  } else {
    console.log('status = ' + res.status)
  }
}, function (e) {
  console.log(e)
}).then(function (myJson) {
  //console.log(JSON.stringify(myJson));
  if (myJson.snapshot_name) {
    stg.compressFileThenUpload(pkg.eos_snapshot_backup.project_id
      , pkg.eos_snapshot_backup.key_filename
      , pkg.eos_snapshot_backup.bucket_name, myJson.snapshot_name)
  }
})
