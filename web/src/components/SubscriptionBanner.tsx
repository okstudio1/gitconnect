import { Zap, Crown, Loader2 } from 'lucide-react'

interface SubscriptionBannerProps {
  isPro: boolean
  isLoading: boolean
  onUpgrade: () => void
  onManage: () => void
}

export function SubscriptionBanner({ 
  isPro, 
  isLoading, 
  onUpgrade, 
  onManage 
}: SubscriptionBannerProps) {
  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg">
        <Crown size={16} className="text-amber-400" />
        <span className="text-sm text-amber-200">Pro</span>
        <button
          onClick={onManage}
          disabled={isLoading}
          className="ml-2 text-xs text-amber-400 hover:text-amber-300 underline"
        >
          Manage
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onUpgrade}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg transition-all text-sm text-white font-medium disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Zap size={16} />
      )}
      <span>Upgrade to Pro</span>
    </button>
  )
}
