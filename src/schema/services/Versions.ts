import config from '../config'

export function checkVersion(versionId: string, minVersionId: string | undefined, maxVersionId?: string) {
  const version = config.versions.findIndex((v) => v.id === versionId)
  const minVersion = minVersionId ? config.versions.findIndex((v) => v.id === minVersionId) : 0
  const maxVersion = maxVersionId ? config.versions.findIndex((v) => v.id === maxVersionId) : config.versions.length - 1
  return minVersion <= version && version <= maxVersion
}
