import type {Str} from '~/type'

/**
 * @example { "48": "images/icon-48.png", "128": "images/icon-128.png" }
 */
type IconPair = Record<`${number}`, string>

export type Match = '<all_urls>'|'file:///'|'https://*/*'|'https://*/'|Str
export type Matches = Match[]

export const permissions = [
  'activeTab',
  'alarms',
  'audio',
  'background',
  'bookmarks',
  'browsingData',
  'certificateProvider',
  'clipboardRead',
  'clipboardWrite',
  'contentSettings',
  'contextMenus',
  'cookies',
  'debugger',
  'declarativeContent',
  'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess',
  'declarativeNetRequestFeedback',
  'dns',
  'desktopCapture',
  'documentScan',
  'downloads',
  'downloads.open',
  'downloads.ui',
  'enterprise.deviceAttributes',
  'enterprise.hardwarePlatform',
  'enterprise.networkingAttributes',
  'enterprise.platformKeys',
  'favicon',
  'fileBrowserHandler',
  'fileSystemProvider',
  'fontSettings',
  'gcm',
  'geolocation',
  'history',
  'identity',
  'identity.email',
  'idle',
  'loginState',
  'management',
  'nativeMessaging',
  'notifications',
  'offscreen',
  'pageCapture',
  'platformKeys',
  'power',
  'printerProvider',
  'printing',
  'printingMetrics',
  'privacy',
  'processes',
  'proxy',
  'readingList',
  'runtime',
  'scripting',
  'search',
  'sessions',
  'sidePanel',
  'storage',
  'system.cpu',
  'system.display',
  'system.memory',
  'system.storage',
  'tabCapture',
  'tabGroups',
  'tabs',
  'topSites',
  'tts',
  'ttsEngine',
  'unlimitedStorage',
  'vpnProvider',
  'wallpaper',
  'webAuthenticationProxy',
  'webNavigation',
  'webRequest',
  'webRequestBlocking',
  'accessibilityFeatures.modify',
  'accessibilityFeatures.read',
  
] as const
type Permission = Str & typeof permissions[number]

type MaybeScriptString = string|String

export type ChromeBrowserManifest = {
  /**
   * An integer specifying the version of the manifest
   * file format that your extension uses. The only
   * supported value is 3
   */
  manifest_version: 3

  /**
   * A string that identifies the extension in the 
   * [Chrome Web Store](https://chrome.google.com/webstore),
   * the install dialog, and the user's Chrome Extensions
   * page (chrome://extensions). The maximum length is 75
   * characters. For information on using locale-specific
   * names, see [Internationalization](https://developer.chrome.com/docs/extensions/reference/api/i18n).
   *
   * @example "name": "amber"
   */
  name: string
  
  /**
   * A string containing a shortened version of the extension's
   * name to be used when character space is limited. The maximum
   * length is 12 characters. If this is undefined, a truncated
   * version of the "name" key displays instead.  
   */
  short_name?: string 

  /**
   * A string that identifies the extension's version number.
   * For information on version number formatting, see [Version](https://developer.chrome.com/docs/extensions/reference/manifest/version)
   *
   * @example "version": "1.2.0"
   */
  version: string
  
  /**
   * A string describing the extension's version. Examples include
   * "1.0 beta" and "build rc2". If this is unspecified, the "version"
   * value displays on the extension management page instead.
   */
  version_name?: string

  /**
   * A string that describes the extension on both the Chrome
   * Web Store and the user's extension management page. The
   * maximum length is 132 characters. For information on
   * localizing descriptions, see [Internationalization](https://developer.chrome.com/docs/extensions/reference/api/i18n).
   */
  description: string

  /**
   * One or more icons that represent your extension. For
   * information about best practices, see [Icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons).
   *
   */
  icons: IconPair

  /**
   * Specifies the email address of the account that was used
   * to create the extension.
   */
  author?: string

  /**
   * Defines the appearance and behavior of the extension's
   * icon in the Google Toolbar. For more information, see
   * [chrome.action](https://developer.chrome.com/docs/extensions/reference/api/action)
   */
  action?: Partial<{
    default_icon: IconPair,

    /**
     * @example { "default_title": "Click me!" }
     */
    default_title: string,
    
    /**
     * @example { "default_popup": "src/popup.html"  }
     */
    default_popup: MaybeScriptString
  }>

  /**
   * Specifies the JavaScript file containing the extension's
   * service worker, which acts as an event handler. For more
   * information, see [About extension service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers).
   */
  background?: {
    /**
     * Path to file service worker
     */
    service_worker: string
    
    /**
     * To use the `import` statement, add the "type" field to your
     * manifest and specify "module"
     */
    type?: 'module'
  }

  /**
   * Specifies JavaScript or CSS files to be used when the user opens certain web pages
   * @see [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
   */
  content_scripts?: Array<{
    /**
     * Specifies which pages this content script will be injected into.
     * See [Match Patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns) for details on the syntax of these strings and
     * [Match patterns and globs](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#matchAndGlob) for information on how to exclude URLs.
     */
    matches: Matches

    /**
     * The list of CSS files to be injected into matching pages. These
     * are injected in the order they appear in this array, before any
     * DOM is constructed or displayed for the page.
     */
    css?: string[]
    
    /**
     * The list of JavaScript files to be injected into matching pages.
     * Files are injected in the order they appear in this array. Each
     * string in this list must contain a relative path to a resource
     * in the extension's root directory. Leading slashes (`/`) are
     * automatically trimmed.
     */
    js?: string[]
    
    /**
     * Specifies when the script should be injected into the page.
     *
     * @default document_idle
     * @see [RunAt](https://developer.chrome.com/docs/extensions/reference/api/extensionTypes#type-RunAt)
     */
    run_at?: 'document_start'|'document_end'|'document_idle'
    
    /**
     * Whether the script should inject into an about:blank frame
     * where the parent or opener frame matches one of the patterns
     * declared in matches.
     *
     * @default false
     */
    match_about_blank?: boolean

    /**
     * Whether the script should inject in frames that were created
     * by a matching origin, but whose URL or origin may not directly
     * match the pattern. These include frames with different schemes,
     * such as `about:`, `data:`, `blob:`, and `filesystem:`.
     *
     * @see [Injecting in related frames](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#injecting-in-related-frames)
     */
    match_origin_as_fallback?: boolean
    
    /**
     * The JavaScript world for a script to execute within
     *
     * @see [Work in isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#isolated_world)
     * @default ISOLATED
     */
    world?: 'ISOLATED'|'MAIN'
  }>

  /**
   * Defines restrictions on the scripts, styles, and other resources an extension can use.
   *
   * @see [Content security policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
   */
  content_security_policy?: {
    extension_pages: string
    sandbox?: string
  }
  
  /**
   * A string that defines the default language of an extension that supports multiple locales.
   * Examples include "en" and "pt_BR". This key is required in localized extensions, and must
   * not be used in extensions that aren't localized.
   * 
   * @see [Internationalization](https://developer.chrome.com/docs/extensions/reference/api/i18n)
   */
  default_locale?: string

  /**
   * A string specifying a URL for the extension's homepage. If this is undefined,
   * the homepage defaults to the extension's Chrome Web Store page. This field is
   * particularly useful if you host the extension on your own site.
   *
   * @see [Host the extension](https://developer.chrome.com/docs/extensions/how-to/distribute/host-extensions)
   */
  homepage_url?: string
  
  /**
   * Defines how the extension behaves in incognito mode.
   *
   * @see [Incognito](https://developer.chrome.com/docs/extensions/reference/manifest/incognito)
   */
  incognito?: 'spanning'|'split'|'not_allowed'
  
  /**
   * Specifies your extension's ID for various development use cases.
   *
   * @see [Key](https://developer.chrome.com/docs/extensions/reference/manifest/key)
   */
  key?: string
  
  /**
   * Defines the oldest Chrome version that can install your extension. The value must be
   * a substring of an existing Chrome browser version string, such as "107" or "107.0.5304.87".
   *
   * Users with versions of Chrome older than the minimum version see a "Not compatible" warning
   * in the Chrome Web Store, and are unable to install your extension.
   *
   * If you add this to an existing extension, users whose Chrome version is older won't receive
   * automatic updates to your extension. This includes business users in ephemeral mode.
   */
  minimum_chrome_version?: string
  
  /**
   * Defines pages that use the DevTools APIs.
   * @see [DevTools API](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools)
   */
  devtools_page?: string
  
  /**
   * Specifies a value for the Cross-Origin-Embedder-Policy HTTP header,
   * which configures embedding of cross-origin resources in an extension page.
   */
  cross_origin_embedder_policy?: unknown
  
  /**
   * Specifies a value for the Cross-Origin-Opener-Policy HTTP header, which
   * lets you ensure that a top-level extension page doesn't share a browsing
   * context group with cross-origin documents.
   */
  cross_origin_opener_policy?: unknown
  
  /**
   * Allows resources to be exported from the extension.
   * @see [Export](https://developer.chrome.com/docs/extensions/reference/manifest/shared-modules#export)
   */
  export?: {
    /**
     * Optional list of extension IDs explicitly allowed to import this Shared Module's resources.
     * If no allowlist is given, all extensions are allowed to import it.
     *
     * Note: no permissions are allowed in Shared Modules
     */
    allowlist?: string[]
  }

  /**
   * Specifies what other pages and extensions can connect to your extensions.
   *
   * @see [Externally connectable](https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable)
   */
  externally_connectable?: unknown
  
  /**
   * Enables use of particular extension APIs. See Permissions for a general explanation. Reference pages for individual APIs list the permissions they require.
   * @see [Permissions](https://developer.chrome.com/docs/extensions/reference/permissions)
   */
  permissions?: Permission[]
  
  /**
   * Lists the web pages your extension is allowed to interact with, defined using URL match patterns.
   * User permission for these sites is requested at install time.
   *
   * @see [Host permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
   */
  host_permissions?: Matches
  
  /**
   * Declares optional host permissions for your extension.
   */
  optional_host_permissions?: Matches
  
  /**
   * Declares optional permissions for your extension.
   */
  optional_permissions?: Permission[]
  
  /**
   * Specifies a path to an HTML file that lets a user change extension options from the Chrome Extensions page.
   *
   * @see [Embedded options](https://developer.chrome.com/docs/extensions/develop/ui/options-page#embedded_options)
   */
  options_ui?: MaybeScriptString
  
  /**
   * Specifies a path to an options.html file for the extension to use as an options page.
   *
   * @see [Give users options](https://developer.chrome.com/docs/extensions/develop/ui/options-page)
   */
  options_page?: MaybeScriptString
  
  /**
   * Identifies an HTML file to display in a sidePanel.
   *
   * @see [Side panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
   */
  side_panel?: { default_path: MaybeScriptString }
  
  /**
   * Lists technologies required to use the extension. For a list of supported requirements, see Requirements.
   */
  requirements?: unknown
  
  /**
   * Declares a JSON schema for the managed storage area. For more information, see Manifest for storage areas.
   */
  storage?: unknown
  
  /**
   * Registers the extension as a text to speech engine. For more information, see the ttsEngine API.
   */
  tts_engine?: unknown
  
  /**
   * A string containing the URL of the extension's updates page.
   * Use this key if you're hosting your extension outside the Chrome Web Store.
   */
  update_url?: string
  
  /**
   * Defines a set of extension pages that don't have access to extension APIs or direct access to non-sandboxed pages. For more information, see Sandbox.
   */
  sandbox?: unknown
  
  /**
   * Defines files within the extension that can be accessed by web pages or other extensions.
   *
   * @see [Web Accessible Resources](https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources)
   */
  web_accessible_resources?: Array<{
    matches: Matches,
    resources: ('*'|Str)[]
    extension_ids?: string[]
  }>
  
  /**
   * Defines keyboard shortcuts within the extension. For more
   * information, see [chrome.commands](https://developer.chrome.com/docs/extensions/reference/api/commands).
   */
  commands?: Record<string, Partial<{
    suggested_key: { default: string } & Record<string, string>
    description: string
    global: boolean
  }>>
  
  /**
   * Defines overrides for default Chrome pages. For more
   * information, see [Override Chrome pages](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages).
   */
  chrome_url_overrides?: Record<'bookmarks'|'history'|'newtab'|Str, string>

  chrome_settings_overrides?: Partial<{
    homepage: string
    startup_pages: string[]
    search_provider: Partial<{
      name: string
      keyword: string
      search_url: string
      favicon_url: string
      suggest_url: string
      instant_url: string
      image_url: string
      search_url_post_params: string
      suggest_url_post_params: string
      instant_url_post_params: string
      image_url_post_params: string
      alternate_urls: string[]
      encoding: 'UTF-8'|Str
      is_default: boolean
    }>
  }>
}