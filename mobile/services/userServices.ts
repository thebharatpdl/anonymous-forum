import AsyncStorage from "@react-native-async-storage/async-storage";
const USER_KEY = "anonymous_user_id";

export const getOrCreateUserId = async (): Promise<string> => {
 try {
    const existingId = await AsyncStorage.getItem(USER_KEY);
    if (existingId) {
      return existingId;
    }

    // If no existing ID, create a new one
    const newId = generateUserId();

    // Store the new ID in AsyncStorage for future retrieval
    await AsyncStorage.setItem(USER_KEY, newId);
    return newId;
  } catch (error) {
    console.error("Error getting or creating user ID:", error);
    return generateUserId(); // Fallback to generating a new ID if there's an error
  }
};

const generateUserId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};