import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from '../config';
import { getToken } from '../../services/authService';

export type Comment = {
  content: string;
  username: string;
  createdAt?: string;
};

export type Post = {
  _id: string;
  content: string;
  username: string;
  authorId?: string;
  likes?: number;
  likedBy?: string[];
  repostOf?: string | null;
  createdAt?: string;
  comments?: Comment[];
  edited?: boolean;
  isSaved?: boolean;
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

// ============================================
// POST THUNKS
// ============================================

export const fetchPosts = createAsyncThunk("posts/fetchPosts", async () => {
  const res = await axios.get(API_URL);
  return res.data;
});

export const fetchPriorityFeed = createAsyncThunk(
  "posts/fetchPriorityFeed",
  async () => {
    const token = await getToken();
    const res = await axios.get(
      `${API_URL.replace('/api/posts', '/api/users')}/feed`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return res.data;
  }
);

export const createPost = createAsyncThunk(
  "posts/createPost",
  async (content: string) => {
    const token = await getToken();
    const res = await axios.post(
      API_URL,
      { content },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return res.data;
  }
);

export const likePostAsync = createAsyncThunk(
  "posts/likePost",
  async (postId: string) => {
    const token = await getToken();
    const res = await axios.post(
      `${API_URL}/like/${postId}`,
      {},
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return { postId, likes: res.data.likes, liked: res.data.liked };
  }
);

export const commentPostAsync = createAsyncThunk(
  "posts/commentPost",
  async ({ postId, content }: { postId: string; content: string }) => {
    const token = await getToken();
    const currentUser = await import('../../services/authService').then(m => m.getCurrentUser());
    const username = currentUser?.anonymousName || "Anonymous";
    
    const res = await axios.post(
      `${API_URL}/comment/${postId}`,
      { content, username },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    
    return {
      postId,
      comment: res.data,
    };
  }
);

export const deletePostAsync = createAsyncThunk(
  "posts/deletePost",
  async (postId: string) => {
    const token = await getToken();
    await axios.delete(
      `${API_URL}/${postId}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return { postId };
  }
);

export const editPostAsync = createAsyncThunk(
  "posts/editPost",
  async ({ postId, content }: { postId: string; content: string }) => {
    const token = await getToken();
    const res = await axios.put(
      `${API_URL}/${postId}`,
      { content },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return { postId, content: res.data.content, edited: true };
  }
);

export const savePostAsync = createAsyncThunk(
  "posts/savePost",
  async (postId: string) => {
    const token = await getToken();
    const res = await axios.post(
      `${API_URL}/save/${postId}`,
      {},
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return { postId, saved: res.data.saved };
  }
);

export const hidePostAsync = createAsyncThunk(
  "posts/hidePost",
  async (postId: string) => {
    const token = await getToken();
    const res = await axios.post(
      `${API_URL}/hide/${postId}`,
      {},
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return { postId, hidden: res.data.hidden };
  }
);

export const reportPostAsync = createAsyncThunk(
  "posts/reportPost",
  async ({ postId, reason }: { postId: string; reason: string }) => {
    const token = await getToken();
    const res = await axios.post(
      `${API_URL}/report/${postId}`,
      { reason },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return { postId, reported: res.data.reported };
  }
);

export const followUserAsync = createAsyncThunk(
  "users/follow",
  async (userId: string, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL.replace('/api/posts', '/api/users')}/follow/${userId}`,
        {},
        { 
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 10000
        }
      );
      return { userId, following: response.data.following };
    } catch (error: any) {
      console.error("Follow API error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.error || "Failed to follow user");
    }
  }
);

export const unfollowUserAsync = createAsyncThunk(
  "users/unfollow",
  async (userId: string, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL.replace('/api/posts', '/api/users')}/unfollow/${userId}`,
        {},
        { 
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 10000
        }
      );
      return { userId, following: response.data.following };
    } catch (error: any) {
      console.error("Unfollow API error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.error || "Failed to unfollow user");
    }
  }
);

// ============================================
// REDUX SLICE
// ============================================

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
    
    updatePostRealtime(state, action: PayloadAction<{ postId: string; content: string }>) {
      const post = state.posts.find(p => p._id === action.payload.postId);
      if (post) {
        post.content = action.payload.content;
        post.edited = true;
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
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.loading = false;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch posts";
      })
      
      .addCase(fetchPriorityFeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPriorityFeed.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.loading = false;
      })
      .addCase(fetchPriorityFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch feed";
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
      })
      
      .addCase(deletePostAsync.fulfilled, (state, action) => {
        state.posts = state.posts.filter(p => p._id !== action.payload.postId);
      })
      
      .addCase(editPostAsync.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId);
        if (post) {
          post.content = action.payload.content;
          post.edited = true;
        }
      })
      
      // ✅ SAVE POST - ADDED
      .addCase(savePostAsync.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId);
        if (post) {
          post.isSaved = action.payload.saved;
        }
      })
      
      // ✅ HIDE POST - ADDED
      .addCase(hidePostAsync.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId);
        if (post) {
          (post as any).isHidden = action.payload.hidden;
        }
      })
      
      // ✅ REPORT POST - ADDED
      .addCase(reportPostAsync.fulfilled, (state, action) => {
        const post = state.posts.find(p => p._id === action.payload.postId);
        if (post) {
          (post as any).reported = action.payload.reported;
        }
      })
      
      .addCase(followUserAsync.fulfilled, (state, action) => {
        // Optional
      })
      .addCase(unfollowUserAsync.fulfilled, (state, action) => {
        // Optional
      });
  },
});

export const {
  setPosts,
  addPost,
  addNewPostRealtime,
  updateLikeRealtime,
  updatePostRealtime,
  addCommentRealtime,
  setSocketConnected,
} = postsSlice.actions;

export default postsSlice.reducer;