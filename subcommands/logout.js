/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { configstore } = require('../configstore')
const { spinnies } = require('../loader')
const { appBlockLogout } = require('../utils/api')
const { feedback } = require('../utils/cli-feedback')
const { getShieldHeader } = require('../utils/getHeaders')

/**
 * To logout from shield
 * @returns
 */
const logout = async () => {
  if (!configstore.get('appBlockUserToken', '')) {
    feedback({ type: 'info', message: 'no user logged in' })
    return
  }
  spinnies.add('logout', { text: 'Starting..' })
  try {
    spinnies.update('logout', { text: 'Connecting to shield..' })
    const {
      data: { success, message },
    } = await axios.post(
      appBlockLogout,
      {},
      {
        headers: getShieldHeader(),
      }
    )
    if (success) {
      spinnies.succeed('logout', { text: 'Logged out of shield' })
      configstore.delete('appBlockUserName')
      configstore.delete('appBlockUserToken')
      configstore.delete('currentSpaceId')
      configstore.delete('currentSpaceName')
      configstore.delete('awsCredConfig')
      return
    }
    spinnies.fail('logout', { text: 'Error logging out of shield' })
    feedback({ type: 'info', message })
  } catch (err) {
    spinnies.fail('logout', { text: 'Failed to logout' })
    feedback({ type: 'info', message: err.message })
  }
}

module.exports = logout
