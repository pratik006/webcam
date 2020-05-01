package com.prapps.web.webcam;

import com.prapps.web.webcam.model.VideoMessage;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class SessionCache {
    public Map<String, VideoMessage> videoCache = new HashMap<>();
    public Map<String, String> roomsCache = new HashMap<>();

    public SessionCache() {
        roomsCache.putIfAbsent("default", "");
    }

    public void putIfAbsent(String sessionId, VideoMessage videoMessage) {
        videoCache.putIfAbsent(sessionId, videoMessage);
    }

    public VideoMessage get(String sessionId) {
        return videoCache.get(sessionId);
    }

    public boolean containsKey(String sessionId) {
        return videoCache.containsKey(sessionId);
    }

    public Set<Map.Entry<String, VideoMessage>> getEntries() {
        return videoCache.entrySet();
    }

    public VideoMessage remove(String key) {
        return videoCache.remove(key);
    }


    public boolean addRooms(String roomId) {
        return roomId.equals(roomsCache.putIfAbsent(roomId, ""));
    }

    public boolean isRoomCreated(String roomId) {
        return roomsCache.containsKey(roomId);
    }
}
