import ContentModulePolyfill from '~/plugins/ContentModulePolyfill.ts'
import ManifestWriter from '~/plugins/ManifestWriter.ts'
import InjectWorkerHMR from '~/plugins/InjectWorkerHMR.ts'
import InlineScriptPolyfill from '~/plugins/InlineScriptPolyfill.ts'
import ResolveAlias from './ResolveAlias'
import ImportViaURL from './ImportViaURL'
import EmitTypeEnvironment from './EmitTypeEnvironment'
import AutoRestart from './AutoRestart'
import AmberWelcomePage from './AmberWelcomePage'
import IconProcessor from './IconProcessor'

import type {GeneralManifest} from '~/browsers/manifest.ts'
import type {PluginOptions} from '~//configure'
import HtmlPagePolyfill from './HtmlPagePolyfill'

export default (manifest: GeneralManifest, amber: PluginOptions = {}) => [
  ResolveAlias(),
  InjectWorkerHMR(manifest, amber),
  ContentModulePolyfill(amber),
  HtmlPagePolyfill(amber),
  ManifestWriter(manifest, amber),
  InlineScriptPolyfill(),
  ImportViaURL(),
  EmitTypeEnvironment(),
  AutoRestart(),
  AmberWelcomePage(),
  IconProcessor()
]
