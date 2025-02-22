/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { mkdirSync, writeFileSync } = require('fs')
const { generateGitIgnore } = require('../../../templates/createTemplates/function-templates')
const {
  generateUiElementWebpack,
  generateUiElementsReadme,
  generateUiElementsEsLintRc,
  generateUiElementIndexHtml,
  generateUiElementsPrettierRc,
  generateUiElementPackageJson,
  generateUiElementsCommitlintRc,
} = require('../../../templates/createTemplates/uiElement-templates')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleUIDependency {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.beforeConfigUpdate.tapPromise(
      'handleUIDependency',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { type } = core.cmdOpts
        if (type !== 8) return

        const { blockName } = core.cmdArgs

        core.blockDetails.language = core.blockDetails.language || 'js'
        core.blockDetails.start = core.blockDetails.start || 'npx webpack-dev-server'
        core.blockDetails.build = core.blockDetails.build || 'npx webpack'

        const indexHtmlString = generateUiElementIndexHtml(blockName)
        const webpackConfigString = generateUiElementWebpack(blockName)
        const gitignore = generateGitIgnore()
        const readmeString = generateUiElementsReadme(blockName)
        const packageJsonString = generateUiElementPackageJson(blockName)
        const eslintrcString = generateUiElementsEsLintRc()
        const commitLintRcString = generateUiElementsCommitlintRc()
        const prettierrcString = generateUiElementsPrettierRc()

        mkdirSync(`${core.blockFolderPath}/public`, { recursive: true })
        mkdirSync(`${core.blockFolderPath}/src`, { recursive: true })

        writeFileSync(`${core.blockFolderPath}/public/index.html`, indexHtmlString)
        writeFileSync(`${core.blockFolderPath}/src/index.js`, '')
        writeFileSync(`${core.blockFolderPath}/package.json`, packageJsonString)
        writeFileSync(`${core.blockFolderPath}/README.md`, readmeString)
        writeFileSync(`${core.blockFolderPath}/webpack.config.js`, webpackConfigString)
        writeFileSync(`${core.blockFolderPath}/.gitignore`, gitignore)
        writeFileSync(`${core.blockFolderPath}/.eslintrc.json`, eslintrcString)
        writeFileSync(`${core.blockFolderPath}/.prettierrc.json`, prettierrcString)
        writeFileSync(`${core.blockFolderPath}/.commitlintrc.json`, commitLintRcString)

        const fedExpose = Object.keys(JSON.parse(packageJsonString).dependencies).reduce((acc, dep) => {
          acc[`./${dep}`] = dep
          return acc
        }, {})

        writeFileSync(
          `${core.blockFolderPath}/federation-expose.js`,
          `export default ${JSON.stringify(fedExpose, null, 2)}`
        )

        const viewBlocks = [...core.appConfig.uiBlocks]
        const elementBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-elements')
        elementBlocks.forEach((b) => {
          const bName = b.meta.name
          const bDep = b.meta.blockDependencies || []
          const blockDependencies = [...bDep, { block_name: blockName }]
          core.appConfig.updateBlock(bName, { blockDependencies })
        })
      }
    )
  }
}
module.exports = handleUIDependency
