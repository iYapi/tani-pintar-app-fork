import { UserProfile } from "@/types";
import { STORAGE_KEYS } from "@/data/constants";

export const getCurrentUser = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  const auth = sessionStorage.getItem(STORAGE_KEYS.AUTH);
  const userStr = sessionStorage.getItem(STORAGE_KEYS.USER);
  if (auth === "true" && userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

export const saveCurrentUser = (user: UserProfile) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  sessionStorage.setItem(STORAGE_KEYS.AUTH, "true");
};
