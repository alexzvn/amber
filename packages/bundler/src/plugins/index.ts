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
import type {AmberOptions} from '~//configure'

export default (manifest: GeneralManifest, amber: AmberOptions = {}) => [
  ResolveAlias(),
  InjectWorkerHMR(manifest, amber),
  ContentModulePolyfill(amber),
  ManifestWriter(manifest, amber),
  InlineScriptPolyfill(),
  ImportViaURL(),
  EmitTypeEnvironment(),
  AutoRestart(),
  AmberWelcomePage(),
  IconProcessor()
]