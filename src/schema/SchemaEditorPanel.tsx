import type { DocAndNode } from '@spyglassmc/core'
import { JsonFileNode } from '@spyglassmc/json'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Language } from '../i18n'
import { JsonFileView } from './JsonFileView'
import { SpyglassClient, type SpyglassService } from './Spyglass'

interface SchemaEditorPanelProps {
	lang: Language
	text: string
	onChange: (nextText: string) => void
}

function tr(lang: Language, zh: string, en: string) {
	return lang === 'zh' ? zh : en
}

export function SchemaEditorPanel({ lang, text, onChange }: SchemaEditorPanelProps) {
	const [client] = useState(() => new SpyglassClient())
	const [service, setService] = useState<SpyglassService>()
	const [docAndNode, setDocAndNode] = useState<DocAndNode>()
	const [error, setError] = useState<string>()
	const textRef = useRef(text)

	useEffect(() => {
		textRef.current = text
	}, [text])

	useEffect(() => {
		let cancelled = false
		client.createService().then((createdService) => {
			if (!cancelled) {
				setService(createdService)
			}
		}).catch((e) => {
			if (!cancelled) {
				setError(e instanceof Error ? e.message : String(e))
			}
		})
		return () => {
			cancelled = true
		}
	}, [client])

	useEffect(() => {
		if (!service) {
			return
		}
		let cancelled = false
		const uri = service.getUnsavedDialogUri()
		const initialize = async () => {
			const initialText = textRef.current.trim().length > 0 ? textRef.current : '{}'
			await service.writeFile(uri, initialText)
			const opened = await service.openFile(uri)
			if (!opened) {
				throw new Error('Failed to open schema document')
			}
			if (!cancelled) {
				setDocAndNode(opened)
			}
		}
		initialize().catch((e) => {
			if (!cancelled) {
				setError(e instanceof Error ? e.message : String(e))
			}
		})
		return () => {
			cancelled = true
		}
	}, [service])

	useEffect(() => {
		if (!service) {
			return
		}
		const uri = service.getUnsavedDialogUri()
		const handler = (updated: DocAndNode) => {
			setDocAndNode(updated)
			setError(undefined)
			const next = updated.doc.getText()
			if (next !== textRef.current) {
				onChange(next)
			}
		}
		service.watchFile(uri, handler)
		return () => {
			service.unwatchFile(uri, handler)
		}
	}, [service, onChange])

	useEffect(() => {
		if (!service || !docAndNode) {
			return
		}
		const current = docAndNode.doc.getText()
		if (text !== current) {
			service.writeFile(docAndNode.doc.uri, text).catch((e) => {
				setError(e instanceof Error ? e.message : String(e))
			})
		}
	}, [text, service, docAndNode])

	const nodeErrorCount = useMemo(() => {
		if (!docAndNode) {
			return 0
		}
		return (docAndNode.node.binderErrors?.length ?? 0)
			+ (docAndNode.node.checkerErrors?.length ?? 0)
			+ (docAndNode.node.linterErrors?.length ?? 0)
	}, [docAndNode])

	const onUndo = () => {
		if (!service || !docAndNode) {
			return
		}
		service.undoEdit(docAndNode.doc.uri).catch((e) => {
			setError(e instanceof Error ? e.message : String(e))
		})
	}

	const onRedo = () => {
		if (!service || !docAndNode) {
			return
		}
		service.redoEdit(docAndNode.doc.uri).catch((e) => {
			setError(e instanceof Error ? e.message : String(e))
		})
	}

	const fileNode = docAndNode?.node.children[0]
	const jsonRoot = JsonFileNode.is(fileNode) ? fileNode.children[0] : undefined

	return <div class="schema-panel-root">
		<div class="schema-panel-head">
			<h2>{tr(lang, 'Mcdoc 架构编辑器', 'Mcdoc Schema Editor')}</h2>
			<div class="schema-actions">
				<button type="button" class="btn small" onClick={onUndo} disabled={!docAndNode}>{tr(lang, '撤销', 'Undo')}</button>
				<button type="button" class="btn small" onClick={onRedo} disabled={!docAndNode}>{tr(lang, '重做', 'Redo')}</button>
			</div>
		</div>
		<p class="schema-caption">{tr(lang, '用于 Minecraft dialog JSON 的 Spyglass 校验与 Schema 驱动字段编辑。', 'Spyglass validation and schema-driven field editing for Minecraft dialog JSON.')}</p>
		{nodeErrorCount > 0 && <p class="parse-error">{tr(lang, 'Schema 诊断', 'Schema diagnostics')}: {nodeErrorCount}</p>}
		{error && <p class="parse-error">{tr(lang, 'Schema 错误', 'Schema error')}: {error}</p>}
		{(!service || !docAndNode || !jsonRoot)
			? <div class="schema-loading">{tr(lang, '正在加载 Schema 编辑器...', 'Loading schema editor...')}</div>
			: <JsonFileView docAndNode={docAndNode} node={jsonRoot} service={service} />}
	</div>
}
