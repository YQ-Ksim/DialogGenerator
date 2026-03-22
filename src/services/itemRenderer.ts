import type { ItemComponentsProvider, ItemModelProvider, ItemStack, NbtTag } from 'deepslate'
import { ItemModel, NbtByte, NbtCompound, NbtDouble, NbtInt, NbtList, NbtString } from 'deepslate'
import type {
  BlockDefinitionProvider,
  BlockFlagsProvider,
  BlockModelProvider,
  BlockPropertiesProvider,
  TextureAtlasProvider,
  UV,
} from 'deepslate/render'
import { BlockDefinition, BlockModel, Identifier, ItemRenderer, TextureAtlas, upperPowerOfTwo } from 'deepslate/render'

const MCMETA_BASE = 'https://raw.githubusercontent.com/misode/mcmeta'
const SUMMARY_URL = `${MCMETA_BASE}/summary`
const ASSETS_URL = `${MCMETA_BASE}/assets`
const ATLAS_URL = `${MCMETA_BASE}/atlas`

interface FetchedResources {
  blockDefinitions: Map<string, unknown>
  models: Map<string, unknown>
  itemDefinitions: Map<string, unknown>
  uvMapping: Record<string, [number, number, number, number]>
  atlas: HTMLImageElement
  itemComponents: Map<string, Map<string, unknown>>
}

const jsonCache = new Map<string, Promise<any>>()
const imageCache = new Map<string, Promise<HTMLImageElement>>()
const itemRenderCache = new Map<string, Promise<string | undefined>>()
let resourceManagerPromise: Promise<ResourceManager> | undefined

interface Resources
  extends BlockDefinitionProvider,
    BlockModelProvider,
    TextureAtlasProvider,
    BlockFlagsProvider,
    BlockPropertiesProvider,
    ItemModelProvider,
    ItemComponentsProvider {}

export async function renderItemImage(item: ItemStack): Promise<string | undefined> {
  const cacheKey = item.toString()
  const cached = itemRenderCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const renderPromise = (async () => {
    const resources = await getResourceManager()
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) {
      return undefined
    }
    const renderer = new ItemRenderer(gl, item, resources, { display_context: 'gui' })
    renderer.drawItem()
    return canvas.toDataURL()
  })().catch((error) => {
    console.warn('[itemRenderer] Failed rendering item model:', error)
    return undefined
  })

  itemRenderCache.set(cacheKey, renderPromise)
  return renderPromise
}

export function getItemTextureFallbackUrl(itemId: string) {
  const { path } = dissectIdentifier(itemId)
  if (path.length === 0) {
    return undefined
  }
  return `${ASSETS_URL}/assets/minecraft/textures/item/${path}.png`
}

export function getBlockTextureFallbackUrl(itemId: string) {
  const { path } = dissectIdentifier(itemId)
  if (path.length === 0) {
    return undefined
  }
  return `${ASSETS_URL}/assets/minecraft/textures/block/${path}.png`
}

async function getResourceManager(): Promise<ResourceManager> {
  if (!resourceManagerPromise) {
    resourceManagerPromise = (async () => {
      const fetched = await fetchResources()
      return new ResourceManager(
        fetched.blockDefinitions,
        fetched.models,
        fetched.itemDefinitions,
        fetched.uvMapping,
        fetched.atlas,
        fetched.itemComponents,
      )
    })()
  }
  return resourceManagerPromise
}

async function fetchResources(): Promise<FetchedResources> {
  const [blockDefinitions, models, itemDefinitions, uvMapping, atlas, itemComponents] = await Promise.all([
    fetchAllPresets('block_definition'),
    fetchAllPresets('model'),
    fetchAllPresets('item_definition'),
    fetchJson<Record<string, [number, number, number, number]>>(`${ATLAS_URL}/all/data.min.json`),
    loadImage(`${ATLAS_URL}/all/atlas.png`),
    fetchItemComponents(),
  ])
  return { blockDefinitions, models, itemDefinitions, uvMapping, atlas, itemComponents }
}

async function fetchItemComponents() {
  const data = await fetchJson<Record<string, unknown>>(`${SUMMARY_URL}/item_components/data.min.json`)
  const result = new Map<string, Map<string, unknown>>()
  for (const [id, rawComponents] of Object.entries(data)) {
    const base = new Map<string, unknown>()
    if (Array.isArray(rawComponents)) {
      for (const entry of rawComponents) {
        if (isObject(entry) && typeof entry.type === 'string') {
          base.set(entry.type, entry.value)
        }
      }
    } else if (isObject(rawComponents)) {
      for (const [key, value] of Object.entries(rawComponents)) {
        base.set(key, value)
      }
    }
    result.set(`minecraft:${id}`, base)
  }
  return result
}

async function fetchAllPresets(registry: string): Promise<Map<string, unknown>> {
  const type = ['atlas', 'block_definition', 'item_definition', 'model', 'font', 'lang', 'equipment', 'post_effect'].includes(registry)
    ? 'assets'
    : 'data'
  const data = await fetchJson<Record<string, unknown>>(`${SUMMARY_URL}/${type}/${registry}/data.min.json`)
  return new Map(Object.entries(data))
}

async function fetchJson<T>(url: string): Promise<T> {
  let cached = jsonCache.get(url)
  if (!cached) {
    cached = fetch(url, { mode: 'cors' }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
      }
      return response.json()
    })
    jsonCache.set(url, cached)
  }
  return cached as Promise<T>
}

async function loadImage(src: string) {
  let cached = imageCache.get(src)
  if (!cached) {
    cached = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`Cannot load image ${src}`))
      image.src = src
    })
    imageCache.set(src, cached)
  }
  return cached
}

class ResourceManager implements Resources {
  private readonly blockDefinitions: Record<string, BlockDefinition> = {}
  private readonly blockModels: Record<string, BlockModel> = {}
  private readonly itemModels: Record<string, ItemModel> = {}
  private textureAtlas: TextureAtlas = TextureAtlas.empty()

  constructor(
    blockDefinitions: Map<string, unknown>,
    models: Map<string, unknown>,
    itemDefinitions: Map<string, unknown>,
    uvMapping: Record<string, [number, number, number, number]>,
    atlasImage: HTMLImageElement,
    private readonly itemComponents: Map<string, Map<string, unknown>>,
  ) {
    this.loadBlockDefinitions(blockDefinitions)
    this.loadBlockModels(models)
    this.loadItemModels(itemDefinitions)
    this.loadAtlas(atlasImage, uvMapping)
  }

  public getBlockDefinition(id: Identifier) {
    return this.blockDefinitions[id.toString()]
  }

  public getBlockModel(id: Identifier) {
    return this.blockModels[id.toString()]
  }

  public getTextureUV(id: Identifier) {
    return this.textureAtlas.getTextureUV(id)
  }

  public getTextureAtlas() {
    return this.textureAtlas.getTextureAtlas()
  }

  public getBlockFlags() {
    return { opaque: false }
  }

  public getBlockProperties() {
    return null
  }

  public getDefaultBlockProperties() {
    return null
  }

  public getItemModel(id: Identifier) {
    return this.itemModels[id.toString()]
  }

  public getItemComponents(id: Identifier): Map<string, NbtTag> {
    const base = this.itemComponents.get(id.toString()) ?? new Map<string, unknown>()
    return new Map(Array.from(base.entries()).map(([key, value]) => [key, jsonToNbt(value)]))
  }

  private loadBlockDefinitions(definitions: Map<string, unknown>) {
    for (const [id, definition] of definitions.entries()) {
      this.blockDefinitions[Identifier.create(id).toString()] = BlockDefinition.fromJson(definition)
    }
  }

  private loadBlockModels(models: Map<string, unknown>) {
    for (const [id, model] of models.entries()) {
      this.blockModels[Identifier.create(id).toString()] = BlockModel.fromJson(model)
    }
    for (const model of Object.values(this.blockModels)) {
      model.flatten(this)
    }
  }

  private loadItemModels(definitions: Map<string, unknown>) {
    for (const [id, definition] of definitions.entries()) {
      if (isObject(definition) && isObject(definition.model)) {
        this.itemModels[Identifier.create(id).toString()] = ItemModel.fromJson(definition.model)
      }
    }
  }

  private loadAtlas(image: HTMLImageElement, textures: Record<string, [number, number, number, number]>) {
    const canvas = document.createElement('canvas')
    const width = upperPowerOfTwo(image.width)
    const height = upperPowerOfTwo(image.height)
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Cannot initialize item texture atlas')
    }

    ctx.drawImage(image, 0, 0)
    const imageData = ctx.getImageData(0, 0, width, height)
    const idMap: Record<string, UV> = {}

    for (const [id, [u, v, du, dv]] of Object.entries(textures)) {
      const fixedDv = du !== dv && id.startsWith('block/') ? du : dv
      idMap[Identifier.create(id).toString()] = [u / width, v / height, (u + du) / width, (v + fixedDv) / height]
    }

    this.textureAtlas = new TextureAtlas(imageData, idMap)
  }
}

function jsonToNbt(value: unknown): NbtTag {
  if (typeof value === 'string') {
    return new NbtString(value)
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? new NbtInt(value) : new NbtDouble(value)
  }
  if (typeof value === 'boolean') {
    return new NbtByte(value)
  }
  if (Array.isArray(value)) {
    return new NbtList(value.map(jsonToNbt))
  }
  if (isObject(value)) {
    const compound = new NbtCompound()
    for (const [key, child] of Object.entries(value)) {
      compound.set(key, jsonToNbt(child))
    }
    return compound
  }
  return new NbtString('')
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}

function dissectIdentifier(raw: string) {
  const normalized = raw.startsWith('#') ? raw.slice(1) : raw
  if (normalized.includes(':')) {
    const [namespace, path] = normalized.split(':', 2)
    return { namespace: namespace || 'minecraft', path: path || '' }
  }
  return { namespace: 'minecraft', path: normalized }
}
