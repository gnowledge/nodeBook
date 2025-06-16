// UserIdContext.jsx
import { createContext, useContext } from "react";

export const UserIdContext = createContext(null);
export const useUserId = () => useContext(UserIdContext);
