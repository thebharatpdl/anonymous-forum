import { configureStore } from "@reduxjs/toolkit";
import postsReducer from  "../postsSlice";
import savedPostsReducer from '../savedPostsSlice'; // ✅ MAKE SURE THIS IMPORT EXISTS

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    savedPosts: savedPostsReducer,
  },
});

// ✅ important types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;