import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from '../config';

export type Comment = {
  content: string;
  username: string;
  createdAt?: string;
};

export type Post = {
  _id: string;
  content: string;
  username: string;
  likes?: number;
  repostOf?: string | null;
  createdAt?: string;
  comments?: Comment[];
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
export const fetchPosts = createAsyncThunk("posts/fetchPosts", async () => {
  const res = await axios.get(API_URL);
  return res.data;
});

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

// Comment on post
export const commentPostAsync = createAsyncThunk(
  "posts/commentPost",
  async ({ postId, content }: { postId: string; content: string }) => {
    const res = await axios.post(`${API_URL}/comment/${postId}`, { content });
    return {
      postId,
      comment: res.data,
    };
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
      const exists = state.posts.some(p => p._id === action.payload._id);
      if (!exists) {
        state.posts.unshift(action.payload);
      }
    },
    addNewPostRealtime(state, action: PayloadAction<Post>) {
      const exists = state.posts.some(p => p._id === action.payload._id);
      if (!exists) {
        state.posts.unshift(action.payload);
      }
    },
    updateLikeRealtime(state, action: PayloadAction<{ postId: string; likes: number }>) {
      const post = state.posts.find(p => p._id === action.payload.postId);
      if (post) {
        post.likes = action.payload.likes;
      }
    },
    addCommentRealtime(state, action: PayloadAction<{ postId: string; comment: Comment }>) {
      const post = state.posts.find(p => p._id === action.payload.postId);
      if (post) {
        post.comments = post.comments || [];
        post.comments.unshift(action.payload.comment);
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
      })
      .addCase(commentPostAsync.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId);
        if (post) {
          post.comments = post.comments || [];
          post.comments.unshift(action.payload.comment);
        }
      });
  },
});

export const {
  setPosts,
  addPost,
  addNewPostRealtime,
  updateLikeRealtime,
  addCommentRealtime,
  setSocketConnected
} = postsSlice.actions;

export default postsSlice.reducer;