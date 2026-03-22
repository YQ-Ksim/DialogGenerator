import * as core from '@spyglassmc/core'
import { BrowserExternals } from '@spyglassmc/core/lib/browser.js'
import * as json from '@spyglassmc/json'
import type { JsonNode } from '@spyglassmc/json'
import * as mcdoc from '@spyglassmc/mcdoc'
import * as zip from '@zip.js/zip.js'
import sparkmd5 from 'spark-md5'
import { TextDocument } from 'vscode-languageserver-textdocument'

export const CACHE_URI = 'file:///cache/'
export const ROOT_URI = 'file:///root/'
export const DEPENDENCY_URI = `${ROOT_URI}dependency/`
export const UNSAVED_URI = `${ROOT_URI}unsaved/`

const INITIAL_DIRS = [CACHE_URI, ROOT_URI, DEPENDENCY_URI, UNSAVED_URI]
const DIALOG_DEPENDENCY = '@dialog-mcdoc'

const builtinMcdoc = `
type Text = (
	string |
	struct {
		text?: string,
		translate?: string,
		with?: [Text],
		color?: string,
		bold?: boolean,
		italic?: boolean,
		underlined?: boolean,
		strikethrough?: boolean,
		obfuscated?: boolean,
		extra?: [Text],
	}
)

struct DialogAction {
	label: Text,
	width?: int @ 1..1024,
	tooltip?: Text,
	action?: any,
}

struct DialogBody {
	type: #[id] DialogBodyType,
	...dialog:dialog_body_type[[type]]
}

enum(string) DialogBodyType {
	PlainMessage = "minecraft:plain_message",
	PlainMessageShort = "plain_message",
	Item = "minecraft:item",
	ItemShort = "item",
}

dispatch dialog:dialog_body_type[minecraft:plain_message] to struct {
	width?: int @ 1..1024,
	contents: Text,
}

dispatch dialog:dialog_body_type[plain_message] to struct {
	width?: int @ 1..1024,
	contents: Text,
}

struct ItemStack {
	id: #[id="item"] string,
	count?: int @ 1..99,
}

dispatch dialog:dialog_body_type[minecraft:item] to struct {
	item: ItemStack,
	show_decorations?: boolean,
	show_tooltip?: boolean,
	width?: int @ 1..256,
	height?: int @ 1..256,
	description?: struct {
		width?: int @ 1..1024,
		contents: Text,
	},
}

dispatch dialog:dialog_body_type[item] to struct {
	item: ItemStack,
	show_decorations?: boolean,
	show_tooltip?: boolean,
	width?: int @ 1..256,
	height?: int @ 1..256,
	description?: struct {
		width?: int @ 1..1024,
		contents: Text,
	},
}

struct DialogInput {
	type: #[id] DialogInputType,
	...dialog:dialog_input_type[[type]]
}

enum(string) DialogInputType {
	Boolean = "minecraft:boolean",
	BooleanShort = "boolean",
	NumberRange = "minecraft:number_range",
	NumberRangeShort = "number_range",
	SingleOption = "minecraft:single_option",
	SingleOptionShort = "single_option",
	Text = "minecraft:text",
	TextShort = "text",
}

dispatch dialog:dialog_input_type[minecraft:boolean] to struct {
	label?: Text,
	label_visible?: boolean,
	initial?: boolean,
}

dispatch dialog:dialog_input_type[boolean] to struct {
	label?: Text,
	label_visible?: boolean,
	initial?: boolean,
}

dispatch dialog:dialog_input_type[minecraft:number_range] to struct {
	label?: Text,
	label_visible?: boolean,
	label_format?: string,
	width?: int @ 1..1024,
	start?: int,
	end?: int,
	initial?: int,
}

dispatch dialog:dialog_input_type[number_range] to struct {
	label?: Text,
	label_visible?: boolean,
	label_format?: string,
	width?: int @ 1..1024,
	start?: int,
	end?: int,
	initial?: int,
}

type DialogSingleOption = (
	string |
	struct {
		id: string,
		display?: Text,
		initial?: boolean,
	}
)

dispatch dialog:dialog_input_type[minecraft:single_option] to struct {
	label?: Text,
	label_visible?: boolean,
	width?: int @ 1..1024,
	options: [DialogSingleOption],
}

dispatch dialog:dialog_input_type[single_option] to struct {
	label?: Text,
	label_visible?: boolean,
	width?: int @ 1..1024,
	options: [DialogSingleOption],
}

dispatch dialog:dialog_input_type[minecraft:text] to struct {
	label?: Text,
	label_visible?: boolean,
	width?: int @ 1..1024,
	initial?: string,
	multiline?: struct {
		max_lines?: int @ 1..64,
		height?: int @ 1..512,
	},
}

dispatch dialog:dialog_input_type[text] to struct {
	label?: Text,
	label_visible?: boolean,
	width?: int @ 1..1024,
	initial?: string,
	multiline?: struct {
		max_lines?: int @ 1..64,
		height?: int @ 1..512,
	},
}

type DialogReference = (
	#[id(registry="dialog",tags="allowed")] string |
	struct {
		id?: #[id(registry="dialog")] string,
		title?: Text,
		external_title?: Text,
	}
)

struct Dialog {
	type: #[id] DialogType,
	title?: Text,
	body?: [DialogBody],
	inputs?: [DialogInput],
	...dialog:dialog_type[[type]]
}

enum(string) DialogType {
	Notice = "minecraft:notice",
	NoticeShort = "notice",
	Confirmation = "minecraft:confirmation",
	ConfirmationShort = "confirmation",
	MultiAction = "minecraft:multi_action",
	MultiActionShort = "multi_action",
	DialogList = "minecraft:dialog_list",
	DialogListShort = "dialog_list",
	ServerLinks = "minecraft:server_links",
	ServerLinksShort = "server_links",
}

dispatch dialog:dialog_type[minecraft:notice] to struct {
	action?: DialogAction,
}

dispatch dialog:dialog_type[notice] to struct {
	action?: DialogAction,
}

dispatch dialog:dialog_type[minecraft:confirmation] to struct {
	yes?: DialogAction,
	no?: DialogAction,
}

dispatch dialog:dialog_type[confirmation] to struct {
	yes?: DialogAction,
	no?: DialogAction,
}

dispatch dialog:dialog_type[minecraft:multi_action] to struct {
	columns?: int @ 1..12,
	actions?: [DialogAction],
	exit_action?: DialogAction,
}

dispatch dialog:dialog_type[multi_action] to struct {
	columns?: int @ 1..12,
	actions?: [DialogAction],
	exit_action?: DialogAction,
}

dispatch dialog:dialog_type[minecraft:dialog_list] to struct {
	columns?: int @ 1..12,
	button_width?: int @ 1..1024,
	dialogs?: (#[id(registry="dialog",tags="allowed")] string | [DialogReference]),
	exit_action?: DialogAction,
}

dispatch dialog:dialog_type[dialog_list] to struct {
	columns?: int @ 1..12,
	button_width?: int @ 1..1024,
	dialogs?: (#[id(registry="dialog",tags="allowed")] string | [DialogReference]),
	exit_action?: DialogAction,
}

dispatch dialog:dialog_type[minecraft:server_links] to struct {
	columns?: int @ 1..12,
	button_width?: int @ 1..1024,
	exit_action?: DialogAction,
}

dispatch dialog:dialog_type[server_links] to struct {
	columns?: int @ 1..12,
	button_width?: int @ 1..1024,
	exit_action?: DialogAction,
}
`

interface ClientDocument {
	doc: TextDocument
	undoStack: string[]
	redoStack: string[]
}

class MemoryFileSystem implements core.ExternalFileSystem {
	private readonly entries = new Map<string, { type: 'file' | 'directory', content?: Uint8Array<ArrayBuffer> }>()

	async chmod(_location: core.FsLocation, _mode: number): Promise<void> {
		return
	}

	async mkdir(location: core.FsLocation, _options?: { mode?: number | undefined, recursive?: boolean | undefined } | undefined): Promise<void> {
		const uri = ensureDirUri(location.toString())
		if (this.entries.has(uri)) {
			throw new Error(`EEXIST: ${uri}`)
		}
		this.entries.set(uri, { type: 'directory' })
	}

	async readdir(location: core.FsLocation): Promise<{ name: string, isDirectory(): boolean, isFile(): boolean, isSymbolicLink(): boolean }[]> {
		const prefix = ensureDirUri(location.toString())
		const result: { name: string, isDirectory(): boolean, isFile(): boolean, isSymbolicLink(): boolean }[] = []
		for (const [name, entry] of this.entries) {
			if (!name.startsWith(prefix) || name === prefix) {
				continue
			}
			result.push({
				name,
				isDirectory: () => entry.type === 'directory',
				isFile: () => entry.type === 'file',
				isSymbolicLink: () => false,
			})
		}
		return result
	}

	async readFile(location: core.FsLocation): Promise<Uint8Array<ArrayBuffer>> {
		const uri = location.toString()
		const entry = this.entries.get(uri)
		if (!entry) {
			throw new Error(`ENOENT: ${uri}`)
		}
		if (entry.type === 'directory') {
			throw new Error(`EISDIR: ${uri}`)
		}
		return cloneBytes(entry.content ?? createBytes(''))
	}

	async rm(location: core.FsLocation, options?: { recursive?: boolean | undefined } | undefined): Promise<void> {
		const uri = location.toString()
		const dirUri = ensureDirUri(uri)
		const direct = this.entries.get(uri)
		const directDir = this.entries.get(dirUri)
		if (!direct && !directDir) {
			throw new Error(`ENOENT: ${uri}`)
		}
		if (direct?.type === 'file') {
			this.entries.delete(uri)
			return
		}
		if (!options?.recursive) {
			throw new Error(`EISDIR: ${uri}`)
		}
		for (const key of [...this.entries.keys()]) {
			if (key === dirUri || key.startsWith(dirUri)) {
				this.entries.delete(key)
			}
		}
	}

	async showFile(_location: core.FsLocation): Promise<void> {
		throw new Error('showFile is not supported in browser memory file system')
	}

	async stat(location: core.FsLocation): Promise<{ isDirectory(): boolean, isFile(): boolean, isSymbolicLink(): boolean }> {
		const uri = location.toString()
		const file = this.entries.get(uri)
		if (file) {
			return {
				isDirectory: () => file.type === 'directory',
				isFile: () => file.type === 'file',
				isSymbolicLink: () => false,
			}
		}
		const directory = this.entries.get(ensureDirUri(uri))
		if (!directory) {
			throw new Error(`ENOENT: ${uri}`)
		}
		return {
			isDirectory: () => true,
			isFile: () => false,
			isSymbolicLink: () => false,
		}
	}

	async unlink(location: core.FsLocation): Promise<void> {
		await this.rm(location)
	}

	async writeFile(location: core.FsLocation, data: string | Uint8Array<ArrayBuffer>, _options?: { mode: number } | undefined): Promise<void> {
		const uri = location.toString()
		this.entries.set(uri, {
			type: 'file',
			content: typeof data === 'string' ? createBytes(data) : cloneBytes(data),
		})
	}
}

export class SpyglassClient {
	public static readonly FS = new MemoryFileSystem()
	public readonly fs = SpyglassClient.FS
	public readonly externals: core.Externals = {
		...BrowserExternals,
		archive: {
			...BrowserExternals.archive,
			decompressBall,
		},
		crypto: {
			...BrowserExternals.crypto,
			getSha1: async (data: string | Uint8Array<ArrayBuffer>) => {
				const bytes = typeof data === 'string' ? createBytes(data) : cloneBytes(data)
				return sparkmd5.ArrayBuffer.hash(bytes.buffer)
			},
		},
		fs: SpyglassClient.FS,
	}

	public readonly documents = new Map<string, ClientDocument>()

	public async createService(version = '1.21.6') {
		return SpyglassService.create(version, this)
	}
}

export class SpyglassService {
	private static activeServiceId = 1
	private readonly fileWatchers = new Map<string, ((docAndNode: core.DocAndNode) => void)[]>()

	private constructor(
		public readonly version: string,
		private readonly service: core.Service,
		private readonly client: SpyglassClient,
	) {
		service.project.on('documentUpdated', (event) => {
			const watchers = this.fileWatchers.get(event.doc.uri) ?? []
			for (const watcher of watchers) {
				watcher(event)
			}
		})
	}

	public getCheckerContext(doc?: TextDocument, errors?: core.LanguageError[]) {
		if (!doc) {
			doc = TextDocument.create('file:///unknown.json', 'json', 1, '')
		}
		const err = new core.ErrorReporter()
		if (errors) {
			err.errors = errors
		}
		return core.CheckerContext.create(this.service.project, { doc, err })
	}

	public async openFile(uri: string) {
		const lang = core.fileUtil.extname(uri)?.slice(1) ?? 'txt'
		const content = await this.readFile(uri)
		if (content === undefined) {
			return undefined
		}
		await this.service.project.onDidOpen(uri, lang, 1, content)
		const docAndNode = await this.service.project.ensureClientManagedChecked(uri)
		if (!docAndNode) {
			return undefined
		}
		if (!this.client.documents.has(uri)) {
			this.client.documents.set(uri, { doc: docAndNode.doc, undoStack: [], redoStack: [] })
		}
		return docAndNode
	}

	public async readFile(uri: string): Promise<string | undefined> {
		try {
			const buffer = await this.service.project.externals.fs.readFile(uri)
			return new TextDecoder().decode(buffer)
		} catch {
			return undefined
		}
	}

	private async notifyChange(doc: TextDocument) {
		if (this.service.project.getClientManaged(doc.uri)) {
			await this.service.project.onDidChange(doc.uri, [{ text: doc.getText() }], doc.version + 1)
		} else {
			await this.service.project.onDidOpen(doc.uri, doc.languageId, doc.version, doc.getText())
		}
		await this.service.project.ensureClientManagedChecked(doc.uri)
	}

	public async writeFile(uri: string, content: string) {
		const document = this.client.documents.get(uri)
		if (document) {
			document.undoStack.push(document.doc.getText())
			document.redoStack = []
			TextDocument.update(document.doc, [{ text: content }], document.doc.version + 1)
		}
		await this.service.project.externals.fs.writeFile(uri, content)
		if (document) {
			await this.notifyChange(document.doc)
		}
	}

	public async applyEdit(uri: string, edit: (node: core.FileNode<core.AstNode>) => void) {
		const document = this.client.documents.get(uri)
		if (!document) {
			throw new Error(`[Spyglass#applyEdit] Document doesn't exist: ${uri}`)
		}
		document.undoStack.push(document.doc.getText())
		document.redoStack = []
		const docAndNode = this.service.project.getClientManaged(uri)
		if (!docAndNode) {
			throw new Error(`[Spyglass#applyEdit] Cannot get doc and node: ${uri}`)
		}
		edit(docAndNode.node)
		const newText = this.service.format(docAndNode.node, docAndNode.doc, 2, true)
		TextDocument.update(document.doc, [{ text: newText }], document.doc.version + 1)
		await this.service.project.externals.fs.writeFile(uri, document.doc.getText())
		await this.notifyChange(document.doc)
	}

	public formatNode(node: JsonNode, uri: string) {
		const formatter = this.service.project.meta.getFormatter(node.type)
		const doc = TextDocument.create(uri, 'json', 1, '')
		const ctx = core.FormatterContext.create(this.service.project, { doc, tabSize: 2, insertSpaces: true })
		return formatter(node, ctx)
	}

	public async undoEdit(uri: string) {
		const document = this.client.documents.get(uri)
		if (!document) {
			throw new Error(`[Spyglass#undoEdit] Document doesn't exist: ${uri}`)
		}
		const previous = document.undoStack.pop()
		if (previous === undefined) {
			return
		}
		document.redoStack.push(document.doc.getText())
		TextDocument.update(document.doc, [{ text: previous }], document.doc.version + 1)
		await this.service.project.externals.fs.writeFile(uri, document.doc.getText())
		await this.notifyChange(document.doc)
	}

	public async redoEdit(uri: string) {
		const document = this.client.documents.get(uri)
		if (!document) {
			throw new Error(`[Spyglass#redoEdit] Document doesn't exist: ${uri}`)
		}
		const previous = document.redoStack.pop()
		if (previous === undefined) {
			return
		}
		document.undoStack.push(document.doc.getText())
		TextDocument.update(document.doc, [{ text: previous }], document.doc.version + 1)
		await this.service.project.externals.fs.writeFile(uri, document.doc.getText())
		await this.notifyChange(document.doc)
	}

	public getUnsavedDialogUri() {
		return `${UNSAVED_URI}dialog.json`
	}

	public watchFile(uri: string, handler: (docAndNode: core.DocAndNode) => void) {
		const watchers = getOrCreate(this.fileWatchers, uri, () => [])
		watchers.push(handler)
	}

	public unwatchFile(uri: string, handler: (docAndNode: core.DocAndNode) => void) {
		const watchers = getOrCreate(this.fileWatchers, uri, () => [])
		const index = watchers.findIndex((watcher) => watcher === handler)
		if (index >= 0) {
			watchers.splice(index, 1)
		}
	}

	public static async create(version: string, client: SpyglassClient) {
		SpyglassService.activeServiceId += 1
		const currentServiceId = SpyglassService.activeServiceId
		await Promise.allSettled(INITIAL_DIRS.map(async (uri) => {
			try {
				await client.externals.fs.mkdir(uri)
			} catch {
				// Directory already exists.
			}
		}))
		const logger = console
		const service = new core.Service({
			logger,
			profilers: new core.ProfilerFactory(logger, ['cache#load', 'cache#save', 'project#init', 'project#ready']),
			project: {
				cacheRoot: CACHE_URI,
				projectRoots: [ROOT_URI],
				externals: client.externals,
				defaultConfig: core.ConfigService.merge(core.VanillaConfig, {
					env: {
						gameVersion: version,
						dependencies: [DIALOG_DEPENDENCY],
						customResources: {
							dialog: {
								category: 'dialog',
							},
						},
					},
				}),
				initializers: [mcdoc.initialize, initialize],
			},
		})
		await service.project.init()
		await service.project.ready()
		setTimeout(() => {
			if (currentServiceId === SpyglassService.activeServiceId) {
				service.project.cacheService.save()
			}
		}, 5_000)
		return new SpyglassService(version, service, client)
	}
}

const initialize: core.ProjectInitializer = async (ctx) => {
	const { meta, externals, cacheRoot } = ctx
	meta.registerDependencyProvider(DIALOG_DEPENDENCY, async () => {
		const uri = new core.Uri('downloads/dialog-mcdoc.tar.gz', cacheRoot).toString()
		const buffer = await compressBall([['dialog.mcdoc', builtinMcdoc]])
		await core.fileUtil.writeFile(externals, uri, buffer)
		return { type: 'tarball-file', uri }
	})
	json.getInitializer()(ctx)
	return { loadedVersion: '1.21.6' }
}

async function decompressBall(buffer: Uint8Array<ArrayBuffer>, options?: { stripLevel?: number }): Promise<core.DecompressedFile[]> {
	const reader = new zip.ZipReader(new zip.BlobReader(new Blob([buffer])))
	const entries = await reader.getEntries()
	const results = await Promise.all(entries.map(async (entry) => {
		if (!('getData' in entry) || typeof entry.getData !== 'function') {
			return undefined
		}
		const data = await entry.getData(new zip.Uint8ArrayWriter())
		const normalized = cloneBytes(data)
		const path = options?.stripLevel === 1 ? entry.filename.substring(entry.filename.indexOf('/') + 1) : entry.filename
		const type = entry.directory ? 'dir' : 'file'
		return { data: normalized, path, mtime: '', type, mode: 0 }
	}))
	return results.filter((entry): entry is core.DecompressedFile => entry !== undefined)
}

async function compressBall(files: [string, string][]): Promise<Uint8Array<ArrayBuffer>> {
	const writer = new zip.ZipWriter(new zip.Uint8ArrayWriter())
	await Promise.all(files.map(async ([name, data]) => {
		await writer.add(name, new zip.TextReader(data))
	}))
	const buffer = await writer.close()
	return cloneBytes(buffer)
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
	const existing = map.get(key)
	if (existing !== undefined) {
		return existing
	}
	const next = create()
	map.set(key, next)
	return next
}

function ensureDirUri(uri: string) {
	return uri.endsWith('/') ? uri : `${uri}/`
}

function createBytes(text: string): Uint8Array<ArrayBuffer> {
	const encoded = new TextEncoder().encode(text)
	return cloneBytes(encoded)
}

function cloneBytes(bytes: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBuffer> {
	const start = bytes.byteOffset
	const end = start + bytes.byteLength
	const sliced = bytes.buffer.slice(start, end) as ArrayBuffer
	return new Uint8Array(sliced) as Uint8Array<ArrayBuffer>
}
