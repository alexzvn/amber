import ContentModulePolyfill from '~/bundler/plugins/ContentModulePolyfill.ts'
import ManifestWriter from '~/bundler/plugins/ManifestWriter.ts'
import InjectWorkerHMR from '~/bundler/plugins/InjectWorkerHMR.ts'
import InlineScriptPolyfill from '~/bundler/plugins/InlineScriptPolyfill.ts'
import ResolveAlias from './ResolveAlias'
import ImportViaURL from './ImportViaURL'
import EmitTypeEnvironment from './EmitTypeEnvironment'
import AutoRestart from './AutoRestart'
import type {GeneralManifest} from '~/bundler/browsers/manifest.ts'
import type {AmberOptions} from '~/bundler/configure.ts'

export default (manifest: GeneralManifest, amber: AmberOptions = {}) => [
  ResolveAlias(),
  InjectWorkerHMR(manifest, amber),
  ContentModulePolyfill(amber),
  ManifestWriter(manifest, amber),
  InlineScriptPolyfill(),
  ImportViaURL(),
  EmitTypeEnvironment(),
  AutoRestart(),
]