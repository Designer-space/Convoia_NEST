import Image from "next/image";
import anyimg from "../../../public/profile3.jpg";

export function UserProfile({ name, avatar, actions }) {
  return (
    <div className="w-full flex items-center justify-between border p-4 rounded-lg">
      <div className="flex items-center gap-4">
        <Image
          src={avatar || anyimg}
          alt={name}
          width={40}
          height={40}
          className="rounded-full"
        />
        <p className="max-w-40 truncate">{name}</p>
      </div>

      {actions && (
        <div className="flex gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={getButtonStyle(action.variant, action.disabled)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getButtonStyle(variant, disabled) {
  if (disabled) {
    return "border px-3 py-1 rounded bg-transparent cursor-not-allowed";
  }

  switch (variant) {
    case "danger":
      return "border px-3 py-1 rounded bg-red-600 text-white cursor-pointer";
    case "secondary":
      return "border px-3 py-1 rounded bg-gray-300 ";
    default:
      return "border px-3 py-1 rounded bg-green-700 text-white cursor-pointer";
  }
}
