// eslint-disable-next-line max-classes-per-file
const { Server } = require('http')
const { clearInterval } = require('timers')
const { portNumbers } = require('../../../../utils/portFindHelper')
const { Locked, getLocalHosts, getAvailablePort } = require('./utils')

class LockAndAssignPorts {
  constructor() {
    this.emPortFromEnv = parseInt(process.env.BB_EM_PORT, 10) || null
    this.elePortFromEnv = parseInt(process.env.BB_ELEMENTS_PORT, 10) || null
    this.containerPortFromEnv = parseInt(process.env.BB_CONTAINER_PORT, 10) || null

    this.lockedPorts = {
      old: new Set(),
      young: new Set(),
    }

    this.interval = setInterval(() => {
      this.lockedPorts.old = this.lockedPorts.young
      this.lockedPorts.young = new Set()
    }, 1000 * 15)

    this.map = {
      'ui-container': this.elePortFromEnv ? [this.elePortFromEnv, this.elePortFromEnv + 10] : [3000, 3999],
      'ui-elements': this.containerPortFromEnv
        ? [this.containerPortFromEnv, this.containerPortFromEnv + 10]
        : [3000, 3999],
      function: this.emPortFromEnv ? [this.emPortFromEnv, this.emPortFromEnv + 10] : [5000, 6000],
    }
  }

  /**
   * Yields port numbers not present in cache, to avoid checking locked ports
   * @param {Array} ports
   */
  *portCheckSequence(ports) {
    if (ports) {
      for (const p of ports) {
        if (!this.lockedPorts.young.has(p)) yield p
      }
    }
    yield 0 // Fall back to 0 if anything else failed
  }

  async getPorts(options) {
    let ports

    if (options) {
      ports = typeof options.port === 'number' ? [options.port] : options.port
    }

    const hosts = getLocalHosts()

    for (const port of this.portCheckSequence(ports)) {
      try {
        let availablePort = await getAvailablePort({ ...options, port }, hosts) // eslint-disable-line no-await-in-loop
        while (this.lockedPorts.old.has(availablePort) || this.lockedPorts.young.has(availablePort)) {
          if (port !== 0) {
            throw new Locked(port)
          }

          availablePort = await getAvailablePort({ ...options, port }, hosts) // eslint-disable-line no-await-in-loop
        }
        this.lockedPorts.young.add(availablePort)
        // lock & key
        const server = new Server()
        server.on('error', (err) => {
          throw err
        })

        const controller = new AbortController()
        server.listen({
          port: availablePort,
          host: '127.0.0.1',
          signal: controller.signal,
        })
        server.unref()
        return { availablePort, key: controller }
      } catch (error) {
        if (!['EADDRINUSE', 'EACCES'].includes(error.code) && !(error instanceof Locked)) {
          throw error
        }
      }
    }

    throw new Error('No available ports found')
  }

  async getLockedPorts(blocksList, type) {
    const res = []
    /**
     * If block type is function, we dont need ports for all functions,
     * only one for emulator & add that to all fn block data & early return
     */
    if (type === 'function') {
      // TODO: different langs might need different port, node-5000, all pythons at 5001 etc
      // add a plugin before this plugin, and convert function from array to object,
      // and check if object here..if yes, lock ports for diff langs
      const g = await this.getPorts({ port: portNumbers(...this.map[type]) })
      for (let i = 0; i < blocksList.length; i += 1) {
        res.push({ ...blocksList[i], ...g })
      }
      return res
    }
    for (let i = 0; i < blocksList.length; i += 1) {
      const g = await this.getPorts({ port: blocksList[i].meta.port || portNumbers(...this.map[type]) })
      res.push({ ...blocksList[i], ...g })
    }
    return res
  }

  apply(StartCore) {
    StartCore.hooks.afterGroupingBlocks.tapPromise('LockAndAssignPorts', async (passedValues) => {
      const { core, config, blockGroups } = passedValues
      for (const { type, blocks } of blockGroups) {
        // eslint-disable-next-line no-continue
        if (!this.map[type]) continue
        core.blockGroups[type] = await this.getLockedPorts(blocks, type)
        // console.log(core.blockGroups)
      }
      clearInterval(this.interval)
      return { core, config, blockGroups: core.blockGroups }
    })
  }
}

module.exports = LockAndAssignPorts
