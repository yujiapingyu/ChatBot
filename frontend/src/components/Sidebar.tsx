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
      className={`fixed inset-y-0 left-0 z-30 flex h-full w-72 flex-col border-r border-white/5 bg-slate-950/95 p-6 text-slate-50 backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0 md:bg-slate-950/40 md:backdrop-blur-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">会话</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClearAll} className="text-xs text-slate-400 hover:text-rose-300">
            清空
          </button>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white md:hidden">
            <X size={20} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600/80 px-4 py-2 text-sm font-medium text-white shadow-glass transition hover:bg-indigo-500"
      >
        <PlusCircle size={16} /> 新建
      </button>
      <div className="mt-6 flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          return (
            <div
              key={session.id}
              className={`group relative rounded-2xl border px-4 py-3 transition ${
                isActive ? 'border-indigo-400/60 bg-white/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <button type="button" className="w-full text-left" onClick={() => onSelect(session.id)}>
                <p className="text-sm font-semibold text-white line-clamp-1">{session.title}</p>
                <p className="text-xs text-slate-400">
                  {new Date(session.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-rose-300 opacity-0 transition group-hover:opacity-100"
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
        {!sessions.length && <p className="text-center text-sm text-slate-500">暂无会话</p>}
      </div>
    </aside>
  </>
)

