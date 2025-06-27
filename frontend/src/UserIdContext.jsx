// UserIdContext.jsx
import { createContext, useContext } from "react";

export const UserIdContext = createContext({ userId: null, username: null, is_superuser: false });
export const useUserId = () => {
  const context = useContext(UserIdContext);
  return context.userId; // Return just the userId for backward compatibility
};
export const useUserInfo = () => useContext(UserIdContext);
