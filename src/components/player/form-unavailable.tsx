import { motion } from 'framer-motion'

const BRAND_PRIMARY = '#EA4C89'
const BRAND_BG = '#F8F9FC'

const nodes = [
  { x: 80, y: 120, delay: 0 },
  { x: 200, y: 60, delay: 0.3 },
  { x: 320, y: 130, delay: 0.6 },
  { x: 200, y: 200, delay: 0.9 },
  { x: 440, y: 90, delay: 1.2 },
]

const edges = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 4 },
]

export function FormUnavailable() {
  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center gap-8"
      style={{ backgroundColor: BRAND_BG }}
    >
      {/* Animated flow graph */}
      <svg width="520" height="280" viewBox="0 0 520 280" className="overflow-visible">
        {/* Edges — fade and disconnect */}
        {edges.map((edge, i) => {
          const from = nodes[edge.from]
          const to = nodes[edge.to]
          return (
            <motion.line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={BRAND_PRIMARY}
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ opacity: 0.6, pathLength: 1 }}
              animate={{
                opacity: [0.6, 0.3, 0],
                pathLength: [1, 0.5, 0],
              }}
              transition={{
                duration: 3,
                delay: 1.5 + i * 0.4,
                ease: 'easeOut',
              }}
            />
          )
        })}

        {/* Nodes — appear, then drift apart and fade */}
        {nodes.map((node, i) => (
          <motion.g key={i}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={18}
              fill="white"
              stroke={BRAND_PRIMARY}
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0.2],
                scale: [0, 1, 1, 0.6],
                cx: [node.x, node.x, node.x, node.x + (i % 2 === 0 ? 20 : -20)],
                cy: [node.y, node.y, node.y, node.y + (i % 3 === 0 ? 15 : -15)],
              }}
              transition={{
                duration: 4,
                delay: node.delay,
                times: [0, 0.2, 0.6, 1],
                ease: 'easeInOut',
              }}
            />
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={6}
              fill={BRAND_PRIMARY}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0.8, 0],
                scale: [0, 1, 1, 0],
                cx: [node.x, node.x, node.x, node.x + (i % 2 === 0 ? 20 : -20)],
                cy: [node.y, node.y, node.y, node.y + (i % 3 === 0 ? 15 : -15)],
              }}
              transition={{
                duration: 4,
                delay: node.delay,
                times: [0, 0.2, 0.6, 1],
                ease: 'easeInOut',
              }}
            />
          </motion.g>
        ))}
      </svg>

      {/* Message */}
      <motion.div
        className="flex flex-col items-center gap-3 text-center px-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <p className="text-xl font-semibold text-gray-800">
          This form has ended
        </p>
        <p className="text-gray-500 max-w-sm">
          Thank you for your interest — this interview is no longer accepting responses.
        </p>
      </motion.div>

      {/* Branding */}
      <motion.p
        className="text-sm font-bold"
        style={{ color: BRAND_PRIMARY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.6 }}
      >
        Parlay
      </motion.p>
    </div>
  )
}
