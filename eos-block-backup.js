#!/usr/bin/env node

/**
 * @author UMU618 <umu618@hotmail.com>
 * @copyright MEET.ONE 2019
 * @description Use npm-coding-style.
 * yarn add @google-cloud/storage
 */

'use strict'

const fs = require('fs')
const path = require('path')
const moment = require('moment')

const pkg = require('./package.json')
const stg = require('./storage.js')

let source = pkg.eos_block_backup.block_path
let destination = source + '_' + moment().format('YYYY-MM-DD[T]HH-mm-ss.SSS[Z]ZZ')
fs.copyFile(source, destination, (err) => {
  if (err) throw err
  console.log(source + ' was copied to ' + destination)
  stg.compressFileThenUpload(pkg.eos_block_backup.project_id
    , pkg.eos_block_backup.key_filename
    , pkg.eos_block_backup.bucket_name, destination)
})
