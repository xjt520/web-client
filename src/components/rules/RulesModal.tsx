interface RulesModalProps {
  onClose: () => void
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">游戏规则</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6 text-gray-300">
          {/* 基本规则 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">基本规则</h3>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>3人游戏，使用一副牌（54张，含大小王）</li>
              <li>每人发17张牌，剩余3张为底牌</li>
              <li>通过叫分确定地主，地主获得底牌</li>
              <li>地主先出牌，逆时针轮流出牌</li>
              <li>先出完牌的一方获胜</li>
            </ul>
          </section>

          {/* 叫分规则 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">叫分规则</h3>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>叫分范围：1分、2分、3分或不叫</li>
              <li>后叫者必须叫比前者更高的分数</li>
              <li>叫3分者直接成为地主</li>
              <li>全部不叫则重新发牌</li>
              <li>叫牌时间25秒，超时自动不叫</li>
            </ul>
          </section>

          {/* 加倍规则 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">加倍规则</h3>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>地主确定后进入加倍阶段</li>
              <li>农民先加倍，地主后加倍</li>
              <li>选择加倍后，本局得分翻倍</li>
              <li>加倍时间25秒，超时自动不加倍</li>
            </ul>
          </section>

          {/* 牌型说明 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">合法牌型</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-yellow-400">火箭</span>
                <p className="text-gray-500 text-xs">大王+小王</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-red-400">炸弹</span>
                <p className="text-gray-500 text-xs">四张同点数</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">单张</span>
                <p className="text-gray-500 text-xs">任意一张牌</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">对子</span>
                <p className="text-gray-500 text-xs">两张同点数</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">三张</span>
                <p className="text-gray-500 text-xs">三张同点数</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">三带一</span>
                <p className="text-gray-500 text-xs">三张+单张</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">三带二</span>
                <p className="text-gray-500 text-xs">三张+对子</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">顺子</span>
                <p className="text-gray-500 text-xs">5张以上连续单牌</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">连对</span>
                <p className="text-gray-500 text-xs">3对以上连续对牌</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">飞机</span>
                <p className="text-gray-500 text-xs">2个以上连续三张</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <span className="text-blue-400">四带二</span>
                <p className="text-gray-500 text-xs">四张+两张单或对</p>
              </div>
            </div>
          </section>

          {/* 牌型大小 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">牌型大小</h3>
            <p className="text-sm mb-2">单牌点数：大王 &gt; 小王 &gt; 2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3</p>
            <p className="text-sm">火箭最大，炸弹次之，其他牌型需同类型比较</p>
          </section>

          {/* 特殊规则 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">特殊规则</h3>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li><span className="text-yellow-400">春天</span>：地主获胜且农民未出过牌，得分翻倍</li>
              <li><span className="text-yellow-400">反春天</span>：农民获胜且地主只出过一次牌，得分翻倍</li>
              <li><span className="text-yellow-400">托管</span>：连续3次超时自动托管，系统自动出牌</li>
            </ul>
          </section>

          {/* 积分规则 */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">积分规则</h3>
            <p className="text-sm mb-2">地主得分 = 2 × 基础分 × 叫分 × 加倍倍数 × 炸弹倍数 × 春天倍数</p>
            <p className="text-sm">农民得分 = 1 × 基础分 × 叫分 × 加倍倍数 × 炸弹倍数 × 春天倍数</p>
          </section>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}
