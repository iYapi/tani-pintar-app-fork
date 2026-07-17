import { LahanProfile } from "@/types";
import { STORAGE_KEYS } from "@/data/constants";
import { getCurrentUser } from "./authApi";

export const getLandList = (): LahanProfile[] => {
  if (typeof window === "undefined") return [];
  const user = getCurrentUser();
  if (!user) return [];

  const landStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
  const allLands: LahanProfile[] = landStr ? JSON.parse(landStr) : [];

  return allLands.filter((item) => item.userId === user.phoneNumber);
};

export const getLandById = (id: string): LahanProfile | null => {
  const list = getLandList();
  return list.find((item) => item.id === id) || null;
};

export const createLand = (landData: Omit<LahanProfile, "id" | "userId" | "createdAt">): LahanProfile => {
  const user = getCurrentUser();
  if (!user) throw new Error("Anda harus masuk untuk menambahkan lahan.");

  const newLand: LahanProfile = {
    ...landData,
    id: "lahan-" + Math.random().toString(36).substr(2, 9),
    userId: user.phoneNumber,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const landStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
    const allLands: LahanProfile[] = landStr ? JSON.parse(landStr) : [];
    allLands.push(newLand);
    localStorage.setItem(STORAGE_KEYS.LAHAN, JSON.stringify(allLands));
  }

  return newLand;
};

export const updateLand = (id: string, updateData: Partial<Omit<LahanProfile, "id" | "userId" | "createdAt">>): LahanProfile => {
  const user = getCurrentUser();
  if (!user) throw new Error("Anda harus masuk untuk memperbarui lahan.");

  if (typeof window !== "undefined") {
    const landStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
    const allLands: LahanProfile[] = landStr ? JSON.parse(landStr) : [];

    const index = allLands.findIndex((item) => item.id === id && item.userId === user.phoneNumber);
    if (index === -1) throw new Error("Lahan tidak ditemukan atau Anda tidak berwenang.");

    allLands[index] = {
      ...allLands[index],
      ...updateData,
    };

    localStorage.setItem(STORAGE_KEYS.LAHAN, JSON.stringify(allLands));
    return allLands[index];
  }

  throw new Error("Gagal memperbarui: Browser storage tidak tersedia.");
};

export const deleteLand = (id: string): boolean => {
  const user = getCurrentUser();
  if (!user) return false;

  if (typeof window !== "undefined") {
    const landStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
    const allLands: LahanProfile[] = landStr ? JSON.parse(landStr) : [];

    const filtered = allLands.filter((item) => !(item.id === id && item.userId === user.phoneNumber));
    const deleted = filtered.length !== allLands.length;

    localStorage.setItem(STORAGE_KEYS.LAHAN, JSON.stringify(filtered));
    return deleted;
  }
  return false;
};
