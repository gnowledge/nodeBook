// StyledCard.jsx
export default function StyledCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4 w-full max-w-xl mx-auto">
      {title && <h2 className="text-lg font-semibold text-gray-700">{title}</h2>}
      {children}
    </div>
  );
}


