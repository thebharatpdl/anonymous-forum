import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../config";

export type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
};

type PostsState = {
  posts: Post[];
  loading: boolean;
};

const initialState: PostsState = {
  posts: [],
  loading: false,
};

// 🚀 THUNK (this is what you were missing)
export const fetchPosts = createAsyncThunk(
  "posts/fetchPosts",
  async () => {
    const res = await axios.get(API_URL);
    return res.data;
  }
);

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    setPosts(state, action: PayloadAction<Post[]>) {
      state.posts = action.payload;
    },

    addPost(state, action: PayloadAction<Post>) {
      state.posts.unshift(action.payload);
    },

    likePost(state, action: PayloadAction<string>) {
      const post = state.posts.find((p) => p._id === action.payload);
      if (post) post.likes = (post.likes || 0) + 1;
    },
  },

  // 🚀 handle async thunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.loading = false;
      })
      .addCase(fetchPosts.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setPosts, addPost, likePost } = postsSlice.actions;
export default postsSlice.reducer;