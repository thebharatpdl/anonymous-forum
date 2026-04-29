import axios from "axios";
import { API_URL } from "../config";

// ---------- TYPES ----------
export type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

// ---------- BASE API ----------
const api = axios.create({
  baseURL: API_URL,
});

// ---------- GET POSTS ----------
export const getPosts = async () => {
  const res = await api.get("/");
  return res.data;
};

// ---------- CREATE POST ----------
export const createPost = async (content: string) => {
  const res = await api.post("/", {
    content,
    username: "anon_user",
  });
  return res.data;
};

// ---------- LIKE POST ----------
export const likePost = async (postId: string) => {
  const res = await api.post(`/like/${postId}`);
  return res.data;
};

// ---------- REPOST POST ----------
export const repostPost = async (postId: string) => {
  const res = await api.post(`/repost/${postId}`);
  return res.data;
};