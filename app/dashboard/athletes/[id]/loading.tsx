export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#C9A857] border-r-transparent"></div>
        <p className="mt-4 text-gray-400">Loading athlete profile...</p>
      </div>
    </div>
  );
}
