import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'https://anonymous-forum-zizb.onrender.com/api';
const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export interface User {
  id: string;
  email: string;
  anonymousName: string;
  avatarColor: string;
  bio?: string;
}

const sanitizeUser = (raw: any): User => {
  let id = raw?.id ?? raw?._id ?? "";

  if (typeof id === "object" && id !== null) {
    id = id.$oid ?? id.toString?.() ?? "";
  }

  if (typeof id !== "string") {
    id = String(id ?? "");
  }

  return {
    id,
    email: raw?.email ?? "",
    anonymousName: raw?.anonymousName ?? "Anonymous",
    avatarColor: raw?.avatarColor ?? "#6C63FF",
    bio: raw?.bio ?? "",
  };
};

export const register = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  const response = await axios.post(`${API_URL}/auth/register`, { email, password });
  const user = sanitizeUser(response.data.user);
  console.log("✅ Registered user:", JSON.stringify(user));
  if (response.data.token) {
    await AsyncStorage.setItem(TOKEN_KEY, response.data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return { token: response.data.token, user };
};

export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  const response = await axios.post(`${API_URL}/auth/login`, { email, password });
  const user = sanitizeUser(response.data.user);
  console.log("✅ Logged in user:", JSON.stringify(user));
  if (response.data.token) {
    await AsyncStorage.setItem(TOKEN_KEY, response.data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return { token: response.data.token, user };
};

export const anonymousRegister = async (): Promise<{ token: string; user: User }> => {
  const response = await axios.post(`${API_URL}/auth/anonymous/register`);
  const user = sanitizeUser(response.data.user);
  console.log("✅ Anonymous registered user:", JSON.stringify(user));
  if (response.data.token) {
    await AsyncStorage.setItem(TOKEN_KEY, response.data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return { token: response.data.token, user };
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return token !== null;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const userJson = await AsyncStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    const raw = JSON.parse(userJson);
    const user = sanitizeUser(raw);
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

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const getUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};

export const logout = async (): Promise<void> => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await new Promise(resolve => setTimeout(resolve, 100));
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const user = await AsyncStorage.getItem(USER_KEY);
  console.log('Token removed:', !token);
  console.log('User removed:', !user);
};

export const updateUserProfile = async (data: { bio?: string }) => {
  const token = await getToken();
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const updatedUser = await response.json();
  const currentUser = await getCurrentUser();
  const mergedUser = {
    ...currentUser,
    ...updatedUser,
    bio: updatedUser.bio || data.bio || "",
  };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
  return mergedUser as User;
};