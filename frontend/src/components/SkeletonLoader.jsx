function SkeletonLoader({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex space-x-4">
          <div className="skeleton h-4 w-12"></div>
          <div className="skeleton h-4 flex-1"></div>
          <div className="skeleton h-4 w-24"></div>
          <div className="skeleton h-4 w-20"></div>
        </div>
      ))}
    </div>
  )
}

export default SkeletonLoader

