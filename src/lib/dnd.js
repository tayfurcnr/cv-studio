import { useRef, useState } from 'react'

/**
 * Liste içi sürükle-bırak sıralama.
 * Harici bağımlılık yok — HTML5 drag & drop API'si yeterli.
 *
 *   const dragProps = useDragList((from, to) => reorder(from, to))
 *   <li {...dragProps(i)}>…</li>
 */
export function useDragList(onMove) {
  const from = useRef(null)
  const [over, setOver] = useState(null)

  return (index) => ({
    draggable: true,
    'data-dragover': over === index ? '' : undefined,
    onDragStart: (e) => {
      from.current = index
      e.dataTransfer.effectAllowed = 'move'
      // Firefox sürüklemeyi başlatmak için veri istiyor
      e.dataTransfer.setData('text/plain', String(index))
    },
    onDragOver: (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (over !== index) setOver(index)
    },
    onDragLeave: () => setOver((cur) => (cur === index ? null : cur)),
    onDrop: (e) => {
      e.preventDefault()
      const start = from.current
      if (start != null && start !== index) onMove(start, index)
      from.current = null
      setOver(null)
    },
    onDragEnd: () => {
      from.current = null
      setOver(null)
    },
  })
}
