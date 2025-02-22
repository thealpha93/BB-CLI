/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const axios = require('axios')
const chalk = require('chalk')
const inquirer = require('inquirer')
const { Observable } = require('rxjs')

/* eslint-disable no-unused-vars */
// below imports only used for jsDoc type
const { Subscriber } = require('rxjs')
/* eslint-enable no-unused-vars */

const { appBlockCheckBlockNameAvailability } = require('./api')
const { isValidBlockName } = require('./blocknameValidator')
const { feedback } = require('./cli-feedback')
const { getShieldHeader } = require('./getHeaders')

/**
 * @type {Subscriber}
 */
let Emitter

const validateFn = function test(ans1) {
  if (isValidBlockName(ans1)) {
    return true
  }
  return 'Only snake case with numbers is valid'
}

const stream = new Observable((obs) => {
  Emitter = obs
  obs.next({
    type: 'input',
    name: 'blockName',
    message: 'Enter a new block name',
    validate: validateFn,
  })
})

// eslint-disable-next-line consistent-return
async function check(name) {
  try {
    const res = await axios.post(
      appBlockCheckBlockNameAvailability,
      {
        block_name: name,
      },
      { headers: getShieldHeader() }
    )
    return !res.data.err
  } catch (err) {
    feedback({ type: 'error', message: 'in blockname availability check' })
    feedback({ type: 'error', message: err.message })
    return false
  }
}
/**
 *
 * @param {String} passedName Name to check
 * @param {Boolean} bypassInitialCheck To bypass initial check and ask for a new name
 * @returns {Promise<String>} An available name
 */
async function checkBlockNameAvailability(passedName, bypassInitialCheck) {
  if (!bypassInitialCheck) {
    const a1 = await check(passedName)
    if (a1) return passedName
    console.log(chalk.red(`Name(${passedName}) not available!`))
  }
  // TODO -- change this to async/await
  return new Promise((res, rej) => {
    let availableName
    inquirer.prompt(stream).ui.process.subscribe({
      next: async (ans) => {
        const { answer } = ans
        // console.log(ans)
        const a = await check(answer)
        if (a) {
          availableName = answer
          Emitter.complete()
        } else {
          console.log(chalk.red(`Name(${passedName}) not available!`))
          Emitter.next({
            type: 'input',
            name: 'blockName',
            message: 'Enter another block name',
            askAnswered: true,
            validate: validateFn,
          })
        }
      },

      error: (err) => {
        console.log('Error: ', err)
        rej(passedName)
      },
      complete: () => {
        res(availableName)
      },
    })
  })
}

module.exports = checkBlockNameAvailability
