import ContentModulePolyfill from '~/bundler/plugins/ContentModulePolyfill.ts'
import InjectClientHMR from "~/bundler/plugins/InjectClientHMR.ts";
import ManifestWriter from "~/bundler/plugins/ManifestWriter.ts";
import type {GeneralManifest} from "~/bundler/browsers/manifest.ts";
import InjectWorkerHMR from "~/bundler/plugins/InjectWorkerHMR.ts";

export default (manifest: GeneralManifest) => [
  InjectClientHMR(),
  InjectWorkerHMR(),
  ContentModulePolyfill(),
  ManifestWriter(manifest),
]