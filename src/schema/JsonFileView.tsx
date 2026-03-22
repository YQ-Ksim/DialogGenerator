import type { DocAndNode, Range } from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import { JsonFileNode } from '@spyglassmc/json'
import { useCallback, useMemo } from 'preact/hooks'
import { getRootType, simplifyType } from './McdocHelpers'
import type { McdocContext } from './McdocRenderer'
import { McdocRoot } from './McdocRenderer'
import type { SpyglassService } from './Spyglass'

interface JsonFileViewProps {
	docAndNode: DocAndNode
	node: JsonNode
	service: SpyglassService
}

export function JsonFileView({ docAndNode, node, service }: JsonFileViewProps) {
	const makeEdit = useCallback((edit: (range: Range) => JsonNode | undefined) => {
		service.applyEdit(docAndNode.doc.uri, (fileNode) => {
			const jsonFile = fileNode.children[0]
			if (JsonFileNode.is(jsonFile)) {
				const original = jsonFile.children[0]
				if (!original) {
					return
				}
				const newNode = edit(original.range)
				if (newNode !== undefined) {
					newNode.parent = fileNode
					jsonFile.children[0] = newNode
				}
			}
		})
	}, [service, docAndNode])

	const ctx = useMemo<McdocContext>(() => {
		const errors = [
			...docAndNode.node.binderErrors ?? [],
			...docAndNode.node.checkerErrors ?? [],
			...docAndNode.node.linterErrors ?? [],
		]
		const checkerCtx = service.getCheckerContext(docAndNode.doc, errors)
		return { ...checkerCtx, makeEdit }
	}, [docAndNode, service, makeEdit])

	const mcdocType = useMemo(() => {
		const rootType = getRootType('dialog')
		return simplifyType(rootType, ctx)
	}, [ctx])

	return <div class="file-view node-root" data-category="dialog">
		<McdocRoot type={mcdocType} node={node} ctx={ctx} />
	</div>
}
