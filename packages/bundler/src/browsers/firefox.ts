/**
 * Manifest shape after serialization (components already converted via `toJSON`).
 */
export type JsonManifest = Record<string, any>

const removePermission = (list: unknown, permission: string) => {
  return Array.isArray(list) ? list.filter(item => item !== permission) : list
}

/**
 * Convert a serialized Chrome MV3 manifest to the Firefox MV3 dialect.
 * Returns a new object; the input is never mutated.
 *
 * - `background.service_worker` becomes `background.scripts` (event page),
 *   existing `scripts` are preserved.
 * - `web_accessible_resources[].use_dynamic_url` is dropped.
 * - `side_panel.default_path` becomes `sidebar_action.default_panel` unless
 *   `sidebar_action` is already declared; `side_panel` and the `sidePanel`
 *   permission are dropped.
 */
export const toFirefoxManifest = (manifest: JsonManifest): JsonManifest => {
  const output: JsonManifest = structuredClone(manifest)

  const background = output.background
  if (background && typeof background.service_worker === 'string') {
    background.scripts ??= [background.service_worker]
    delete background.service_worker
  }

  if (Array.isArray(output.web_accessible_resources)) {
    for (const resource of output.web_accessible_resources) {
      delete resource.use_dynamic_url
    }
  }

  if ('side_panel' in output) {
    const path = output.side_panel?.default_path

    if (path && !output.sidebar_action) {
      output.sidebar_action = { default_panel: path }
    }

    delete output.side_panel
  }

  if (output.permissions) {
    output.permissions = removePermission(output.permissions, 'sidePanel')
  }

  if (output.optional_permissions) {
    output.optional_permissions = removePermission(output.optional_permissions, 'sidePanel')
  }

  return output
}

/**
 * AMO requires `browser_specific_settings.gecko.id` to sign MV3 add-ons.
 */
export const hasGeckoId = (manifest: JsonManifest) => {
  return Boolean(manifest.browser_specific_settings?.gecko?.id)
}
