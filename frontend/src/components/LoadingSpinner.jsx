function LoadingSpinner({ message = "Loading...", size = "md" }) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-pnc-blue rounded-full border-t-transparent animate-spin"></div>
      </div>
      {message && (
        <p className="mt-4 text-pnc-blue font-medium">{message}</p>
      )}
    </div>
  )
}

export default LoadingSpinner

