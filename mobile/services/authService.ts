import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.1.69:5000/api';
const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export interface User {
  id: string;
  email: string;
  anonymousName: string;
  avatarColor: string;
}

// Sanitize user — ensures id is always a plain string no matter what the
// backend or AsyncStorage gives back (ObjectId object, {$oid:...}, undefined)
const sanitizeUser = (raw: any): User => {
  let id = raw?.id ?? raw?._id ?? "";

  // Handle Mongoose ObjectId serialized as object: { $oid: "..." }
  if (typeof id === "object" && id !== null) {
    id = id.$oid ?? id.toString?.() ?? "";
  }

  // Handle actual ObjectId with toString
  if (typeof id !== "string") {
    id = String(id ?? "");
  }

  return {
    id,
    email: raw?.email ?? "",
    anonymousName: raw?.anonymousName ?? "Anonymous",
    avatarColor: raw?.avatarColor ?? "#6C63FF",
  };
};

// ONE-CLICK ANONYMOUS REGISTER
export const anonymousRegister = async (): Promise<{ token: string; user: User }> => {
  const response = await axios.post(`${API_URL}/auth/anonymous/register`);

  const user = sanitizeUser(response.data.user);

  console.log("✅ Registered user:", JSON.stringify(user)); // keep this for now

  if (response.data.token) {
    await AsyncStorage.setItem(TOKEN_KEY, response.data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user)); // store sanitized
  }

  return { token: response.data.token, user };
};

// Check if user exists
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return token !== null;
};

// Get current user — always returns sanitized user
export const getCurrentUser = async (): Promise<User | null> => {
  const userJson = await AsyncStorage.getItem(USER_KEY);
  if (!userJson) return null;

  try {
    const raw = JSON.parse(userJson);
    const user = sanitizeUser(raw);

    // Safety check — if id is still empty after sanitization, storage is corrupt
    if (!user.id) {
      console.warn("⚠️ Stored user has no id, clearing storage");
      await AsyncStorage.removeItem(USER_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return user;
  } catch {
    return null;
  }
};

// Get token
export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

// Get user ID
export const getUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};

// Logout
export const logout = async (): Promise<void> => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
};