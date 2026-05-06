import { createSlice } from '@reduxjs/toolkit';

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    isConnected: false,
  },
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    updatePost: (state, action) => {
      // This will be handled in posts slice
      // We'll dispatch an action to update posts
    },
  },
});

export const { setConnected, updatePost } = socketSlice.actions;
export default socketSlice.reducer;