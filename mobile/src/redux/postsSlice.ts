import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from '../config';

export type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
  createdAt?: string;
};

type PostsState = {
  posts: Post[];
  loading: boolean;
  isConnected: boolean;
  error: string | null;
};

const initialState: PostsState = {
  posts: [],
  loading: false,
  isConnected: false,
  error: null,
};

// Fetch posts
export const fetchPosts = createAsyncThunk(
  "posts/fetchPosts",
  async () => {
    try {
      const res = await axios.get(API_URL);
      return res.data;
    } catch (error) {
      throw error;
    }
  }
);

// Create post
export const createPost = createAsyncThunk(
  "posts/createPost",
  async (content: string) => {
    const res = await axios.post(API_URL, { content });
    return res.data;
  }
);

// Like post
export const likePostAsync = createAsyncThunk(
  "posts/likePost",
  async (postId: string) => {
    const res = await axios.post(`${API_URL}/like/${postId}`);
    return { postId, likes: res.data.likes };
  }
);

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    setPosts(state, action: PayloadAction<Post[]>) {
      state.posts = action.payload;
    },
    
    // ✅ Make sure addPost is here
   addPost(state, action: PayloadAction<Post>) {
      // ✅ Prevent duplicate by checking _id
      const exists = state.posts.some(p => p._id === action.payload._id);
      if (!exists) {
        state.posts.unshift(action.payload);
      }
    },
    likePost(state, action: PayloadAction<string>) {
      const post = state.posts.find((p) => p._id === action.payload);
      if (post) post.likes = (post.likes || 0) + 1;
    },
    
     addNewPostRealtime(state, action: PayloadAction<Post>) {
      // ✅ Same prevention for real‑time events
      const exists = state.posts.some(p => p._id === action.payload._id);
      if (!exists) {
        state.posts.unshift(action.payload);
      }
    },
    
    updateLikeRealtime(state, action: PayloadAction<{ postId: string; likes: number }>) {
      const post = state.posts.find((p) => p._id === action.payload.postId);
      if (post) {
        post.likes = action.payload.likes;
      }
    },
    
    setSocketConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
  },
  
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
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(likePostAsync.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId);
        if (post) {
          post.likes = action.payload.likes;
        }
      });
  },
});

// ✅ Make sure all these are exported
export const { 
  setPosts, 
  addPost,           // ✅ This is what you need
  likePost, 
  addNewPostRealtime, 
  updateLikeRealtime,
  setSocketConnected 
} = postsSlice.actions;

export default postsSlice.reducer;