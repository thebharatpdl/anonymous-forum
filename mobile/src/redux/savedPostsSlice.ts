import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from '../config';
import { getToken } from '../../services/authService';
import { Post } from './postsSlice';

type SavedPostsState = {
  posts: Post[];
  loading: boolean;
  error: string | null;
};

const initialState: SavedPostsState = {
  posts: [],
  loading: false,
  error: null,
};

export const fetchSavedPosts = createAsyncThunk(
  "savedPosts/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      
      // ✅ CORRECT URL - NOT /posts/saved (that causes MongoDB ObjectId error)
      const res = await axios.get(`${API_URL.replace('/posts', '')}/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let posts = [];
      if (Array.isArray(res.data)) {
        posts = res.data;
      } else if (res.data.posts) {
        posts = res.data.posts;
      } else if (res.data.savedPosts) {
        posts = res.data.savedPosts;
      }
      
      return posts;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch saved posts");
    }
  }
);

const savedPostsSlice = createSlice({
  name: "savedPosts",
  initialState,
  reducers: {
    clearSavedPosts: (state) => {
      state.posts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSavedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedPosts.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.loading = false;
      })
      .addCase(fetchSavedPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch saved posts";
      });
  },
});

export const { clearSavedPosts } = savedPostsSlice.actions;
export default savedPostsSlice.reducer;