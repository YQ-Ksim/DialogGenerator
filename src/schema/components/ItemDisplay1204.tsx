import { ItemDisplay as RootItemDisplay } from '../../components/ItemDisplay'

interface Props {
  item: { id: { toString: () => string }, count: number }
}

export function ItemDisplay1204({ item }: Props) {
  const id = item?.id?.toString?.() ?? 'minecraft:air'
  const count = typeof item?.count === 'number' ? item.count : 1
  return <RootItemDisplay id={id} count={count} tooltip={false} />
}
