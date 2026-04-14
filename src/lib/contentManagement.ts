import { supabase } from "@/integrations/supabase/client";

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract YouTube video ID from various URL formats
 */
export const extractYoutubeId = (url: string): string | null => {
  try {
    // Handle youtu.be format
    if (url.includes("youtu.be/")) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }

    // Handle youtube.com/watch?v= format
    if (url.includes("youtube.com/watch")) {
      const match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }

    // Handle youtube.com/embed format
    if (url.includes("youtube.com/embed/")) {
      const match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }

    // If it's just the ID (11 characters)
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Get YouTube thumbnail URL
 */
export const getYoutubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * Get YouTube embed URL
 */
export const getYoutubeEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}`;
};

// ============================================
// VIDEO OPERATIONS
// ============================================

export interface Video {
  id: string;
  youtube_url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_id: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all videos
 */
export const getVideos = async (): Promise<Video[]> => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
};

/**
 * Create new video
 */
export const createVideo = async (videoData: {
  youtube_url: string;
  title: string;
  description?: string;
  duration_seconds?: number;
}): Promise<{ success: boolean; data?: Video; error?: string }> => {
  try {
    const videoId = extractYoutubeId(videoData.youtube_url);
    if (!videoId) {
      return { success: false, error: "Invalid YouTube URL" };
    }

    const { data, error } = await supabase
      .from("videos")
      .insert({
        youtube_url: videoData.youtube_url,
        title: videoData.title,
        description: videoData.description,
        video_id: videoId,
        thumbnail_url: getYoutubeThumbnail(videoId),
        duration_seconds: videoData.duration_seconds,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating video:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Update video
 */
export const updateVideo = async (
  id: string,
  updates: Partial<Video>
): Promise<{ success: boolean; data?: Video; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating video:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Delete video
 */
export const deleteVideo = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("videos").delete().eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting video:", error);
    return { success: false, error: String(error) };
  }
};

// ============================================
// POST OPERATIONS
// ============================================

export interface Post {
  id: string;
  title: string;
  content: string;
  featured_image?: string;
  excerpt?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all posts (paginated)
 */
export const getPosts = async (limit: number = 10, offset: number = 0): Promise<Post[]> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
};

/**
 * Get single post
 */
export const getPost = async (id: string): Promise<Post | null> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
};

/**
 * Create new post
 */
export const createPost = async (postData: {
  title: string;
  content: string;
  featured_image?: string;
  excerpt?: string;
}): Promise<{ success: boolean; data?: Post; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating post:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Update post
 */
export const updatePost = async (
  id: string,
  updates: Partial<Post>
): Promise<{ success: boolean; data?: Post; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Delete post
 */
export const deletePost = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: String(error) };
  }
};
