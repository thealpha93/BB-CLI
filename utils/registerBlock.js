/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable camelcase */
const axios = require('axios')
const { spinnies } = require('../loader')
const { appBlockRegister } = require('./api')
const { getShieldHeader } = require('./getHeaders')

/**
 *
 * @param {Number} block_type 1 or 2 or 3
 * @param {String} block_name Long name of block
 * @param {String} block_short_name Preferred short name of block
 * @param {Boolean} is_public Visibility of repo
 * @param {String} github_url Github repo url
 * @param {String} block_desc Description same as github repo description
 * @param {String} job_config Configuration for job
 */
// eslint-disable-next-line consistent-return
async function registerBlock(
  block_type,
  block_name,
  block_short_name,
  is_public,
  github_url,
  block_desc,
  // eslint-disable-next-line default-param-last
  job_config = {},
  package_block_id
) {
  spinnies.add('register', { text: `Registering ${block_name}` })

  const postData = {
    block_type,
    block_name,
    block_short_name,
    is_public,
    block_desc,
    github_url,
  }

  if (package_block_id) {
    postData.package_block_id = package_block_id
  }

  if (block_type !== 1 && !package_block_id) {
    throw new Error('Cannot create block without package block')
  }

  if (block_type === 7) {
    postData.job_config = job_config
  }

  try {
    const res = await axios.post(appBlockRegister, postData, {
      headers: getShieldHeader(),
    })

    spinnies.succeed('register', { text: `${block_name} registered successfully` })
    spinnies.remove('register')

    return res.data
  } catch (err) {
    spinnies.fail('register', { text: `${block_name} registeration failed` })
    spinnies.remove('register')
    throw err
  }
}

module.exports = registerBlock
