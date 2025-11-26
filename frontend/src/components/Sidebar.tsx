import { PlusCircle, Trash2, X } from 'lucide-react'
import type { ChatSession } from '@/types/chat'

interface Props {
  sessions: ChatSession[]
  activeSessionId: string | null
  isOpen: boolean
  onSelect: (sessionId: string) => void
  onCreate: () => void
  onDelete: (sessionId: string) => void
  onClearAll: () => void
  onClose: () => void
}

export const Sidebar = ({
  sessions,
  activeSessionId,
  isOpen,
  onSelect,
  onCreate,
  onDelete,
  onClearAll,
  onClose,
}: Props) => (
  <>
    {/* Mobile Overlay */}
    <div
      className={`fixed inset-0 z-20 bg-black/50 transition-opacity md:hidden ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={onClose}
    />

    {/* Sidebar Content */}
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex h-full w-72 flex-col border-r border-gray-200 bg-white p-6 text-gray-900 shadow-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-50 md:relative md:translate-x-0 md:shadow-none md:dark:bg-slate-950/40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">会话</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClearAll} className="text-xs text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-rose-300">
            清空
          </button>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white md:hidden">
            <X size={20} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40"
      >
        <PlusCircle size={16} /> 新建
      </button>
      <div className="mt-6 flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          return (
            <div
              key={session.id}
              className={`group relative rounded-2xl border px-4 py-3 transition ${
                isActive
                  ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-400/60 dark:bg-white/10'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              <button type="button" className="w-full text-left" onClick={() => onSelect(session.id)}>
                <p className="text-sm font-semibold text-gray-900 line-clamp-1 dark:text-white">{session.title}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {new Date(session.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-500 opacity-0 transition group-hover:opacity-100 dark:text-rose-300"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(session.id)
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
        {!sessions.length && <p className="text-center text-sm text-gray-500 dark:text-slate-500">暂无会话</p>}
      </div>
    </aside>
  </>
)

