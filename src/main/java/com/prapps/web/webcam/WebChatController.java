package com.prapps.web.webcam;

import com.prapps.web.webcam.model.VideoMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.Set;

@RestController
@RequestMapping("/rest")
public class WebChatController {

    @Autowired
    SessionCache sessionCache;
    @Autowired
    RandomString randomString;

    Set<String> rooms = new HashSet<>();

    @CrossOrigin(origins = "*")
    @GetMapping
    public String alive() {
        return "alive";
    }

    @CrossOrigin(origins = "*")
    @GetMapping("/{sessionId}")
    public VideoMessage getFirstMessage(@PathVariable String sessionId) {
        return sessionCache.get(sessionId);
    }

    @CrossOrigin(origins = "*")
    @PostMapping("/rooms")
    public String createRoom() {
        String uid = randomString.generate(8);
        while (rooms.contains(uid)) {
            uid = randomString.generate(8);
        }

        rooms.add(uid);
        return uid;
    }
}
