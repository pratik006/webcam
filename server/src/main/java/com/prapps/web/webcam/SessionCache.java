package com.prapps.web.webcam;

import com.prapps.web.webcam.model.VideoMessage;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class SessionCache {
    public Map<String, VideoMessage> videoCache = new HashMap<>();

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
}
