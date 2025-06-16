// UserIdContext.jsx
import { createContext, useContext } from "react";

export const UserIdContext = createContext("user0");
export const useUserId = () => useContext(UserIdContext);
