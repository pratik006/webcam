package com.prapps.web.webcam;

import com.prapps.web.webcam.model.VideoMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rest")
public class WebChatController {

    @Autowired
    SessionCache sessionCache;

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
}
